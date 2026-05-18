"use client";

import { create } from "zustand";
import type { StateCreator } from "zustand";
import { createProjectile, distanceDamage, stepProjectile } from "@/features/game/engine/physics";
import { normalizeSeed, randomInt } from "@/features/game/engine/random";
import { carveCrater, clamp, createTerrain, getSurfaceY } from "@/features/game/engine/terrain";
import { getWeaponDisplayName } from "@/features/game/engine/weapons";
import { getWindLabel, rollWind } from "@/features/game/engine/wind";
import type {
  BonusBox,
  BonusType,
  DamagePopup,
  ExplosionState,
  ExplosionVisual,
  GamePhase,
  GameState,
  InputState,
  MatchEvent,
  MatchEventKind,
  MatchConfig,
  Mobile,
  MobileType,
  Player,
  TerrainState,
  TurnAnnouncement,
  WeaponType
} from "@/features/game/types/game";
import { worldHeight, worldWidth } from "@/features/game/types/game";

type GameStoreState = GameState & {
  input: InputState;
  randomState: number;
  setup: MatchConfig;
  resolveTimer: number;
  startMatch(config: MatchConfig): void;
  restartMatch(): void;
  returnToSetup(): void;
  stepSimulation(dt: number): void;
  setAimKey(key: "up" | "down", active: boolean): void;
  beginCharge(): void;
  releaseCharge(): void;
  attemptMove(direction: -1 | 1): void;
  switchWeapon(): void;
};

export const defaultSetup: MatchConfig = {
  playerOneName: "Player 1",
  playerTwoName: "Player 2",
  playerOneMobile: "armor",
  playerTwoMobile: "knight",
  seedText: "gunbound-local"
};

export const useGameStore = create<GameStoreState>(createGameStoreState);

function createGameStoreState(...args: Parameters<StateCreator<GameStoreState>>): GameStoreState {
  const set = args[0];
  const get = args[1];

  return {
    scene: "start",
    phase: "move",
    turn: 1,
    wind: { x: 0, y: 0 },
    players: createPlaceholderPlayers(),
    tick: 0,
    seed: normalizeSeed(defaultSetup.seedText),
    terrain: null,
    projectile: null,
    winner: null,
    round: 1,
    targetScore: 2,
    suddenDeathTurn: 12,
    suddenDeathActive: false,
    power: 0,
    charging: false,
    turnCount: 1,
    phaseTimer: getPhaseDuration("move"),
    phaseDuration: getPhaseDuration("move"),
    bonusBoxes: [],
    explosionVisual: null,
    damagePopups: [],
    turnAnnouncement: null,
    history: [],
    message: "Set up a local match.",
    input: {
      aimUp: false,
      aimDown: false
    },
    randomState: normalizeSeed(defaultSetup.seedText),
    setup: defaultSetup,
    resolveTimer: 0,
    startMatch: function startMatch(config: MatchConfig): void {
      const seed = normalizeSeed(config.seedText);
      const terrainRoll = createTerrain(seed, worldWidth, worldHeight);
      const players = createPlayers(config, terrainRoll.terrain);
      const windRoll = rollWind(terrainRoll.state);

      set({
        scene: "playing",
        phase: "move",
        turn: 1,
        wind: windRoll.wind,
        players,
        tick: 0,
        seed,
        terrain: terrainRoll.terrain,
        projectile: null,
        winner: null,
        round: 1,
        targetScore: 2,
        suddenDeathTurn: 12,
        suddenDeathActive: false,
        power: 0,
        charging: false,
        turnCount: 1,
        phaseTimer: getPhaseDuration("move"),
        phaseDuration: getPhaseDuration("move"),
        bonusBoxes: [],
        explosionVisual: null,
        damagePopups: [],
        turnAnnouncement: createTurnAnnouncement(1, players[0].name),
        history: createRoundHistory(players, 1, 1, "Round 1 started."),
        message: "Player 1 turn. Move or fire.",
        input: {
          aimUp: false,
          aimDown: false
        },
        randomState: windRoll.state,
        setup: config,
        resolveTimer: 0
      });
    },
    restartMatch: function restartMatch(): void {
      get().startMatch(get().setup);
    },
    returnToSetup: function returnToSetup(): void {
      set({
        scene: "start",
        phase: "move",
        projectile: null,
        charging: false,
        power: 0,
        winner: null,
        round: 1,
        targetScore: 2,
        suddenDeathTurn: 12,
        suddenDeathActive: false,
        phaseTimer: getPhaseDuration("move"),
        phaseDuration: getPhaseDuration("move"),
        explosionVisual: null,
        damagePopups: [],
        turnAnnouncement: null,
        history: [],
        message: "Set up a local match."
      });
    },
    stepSimulation: function stepSimulation(dt: number): void {
      const state = get();
      if (state.scene !== "playing" || state.terrain === null) {
        return;
      }

      let nextPhase = state.phase;
      let nextPlayers = clonePlayers(state.players);
      let nextProjectile = state.projectile;
      let nextPower = state.power;
      let nextCharging = state.charging;
      let nextWinner = state.winner;
      let nextScene: GameState["scene"] = state.scene;
      let nextRound = state.round;
      let nextSuddenDeathActive = state.suddenDeathActive;
      let nextMessage = state.message;
      let nextResolveTimer = state.resolveTimer;
      let nextTerrain = state.terrain;
      let nextPhaseTimer = state.phaseTimer;
      let nextPhaseDuration = state.phaseDuration;
      let nextBonusBoxes = tickBonusBoxes(state.bonusBoxes, state.terrain, dt);
      let nextExplosionVisual = tickExplosionVisual(state.explosionVisual, dt);
      let nextDamagePopups = tickDamagePopups(state.damagePopups, dt);
      let nextTurnAnnouncement = tickTurnAnnouncement(state.turnAnnouncement, dt);
      let nextHistory = state.history;
      let shouldAdvanceTurn = false;
      let waitingForSettling = false;

      if (state.phase !== "resolve" && state.phase !== "end") {
        nextPlayers = applyAimInput(nextPlayers, state.turn, state.input, dt);
        if (nextPlayers[state.turn - 1].mobile.angle !== state.players[state.turn - 1].mobile.angle && state.phase === "move") {
          nextPhase = "aim";
          nextPhaseTimer = getPhaseDuration("aim");
          nextPhaseDuration = getPhaseDuration("aim");
        }
      }

      nextPhaseTimer = Math.max(0, nextPhaseTimer - dt);

      if (nextCharging) {
        const currentPlayer = nextPlayers[state.turn - 1];
        const chargeRate = 1 / currentPlayer.mobile.shotDelay;
        nextPower = clamp(nextPower + dt * chargeRate, 0.08, 1);
      }

      if (nextProjectile !== null && nextTerrain !== null) {
        const step = stepProjectile(nextProjectile, nextTerrain, nextPlayers, state.wind, dt);
        nextProjectile = step.projectile;

        if (step.explosion !== null) {
          nextTerrain = carveCrater(nextTerrain, step.explosion.point, step.explosion.radius);
          const explosionResult = applyExplosion(nextPlayers, step.explosion, state.round, state.turn);
          nextPlayers = markPlayersForFalling(explosionResult.players);
          nextDamagePopups = nextDamagePopups.concat(explosionResult.damagePopups);
          nextHistory = appendHistory(nextHistory, explosionResult.history);
          nextExplosionVisual = createExplosionVisual(step.explosion);
          nextPower = 0;
          nextCharging = false;
          nextWinner = getWinner(nextPlayers);
          if (nextWinner !== null) {
            nextPlayers = awardRoundScore(nextPlayers, nextWinner);
            nextHistory = appendHistory(
              nextHistory,
              [
                createMatchEvent(
                  state.round,
                  state.turn,
                  "round-end",
                  nextPlayers[nextWinner - 1].name +
                    " won round " +
                    String(state.round) +
                    ". Score " +
                    String(nextPlayers[0].score) +
                    "-" +
                    String(nextPlayers[1].score) +
                    "."
                )
              ]
            );
          }
          nextPhase = nextWinner === null ? "resolve" : "end";
          nextResolveTimer = 0.7;
          nextPhaseTimer = nextWinner === null ? getPhaseDuration("resolve") : 2.2;
          nextPhaseDuration = nextWinner === null ? getPhaseDuration("resolve") : 2.2;
          nextMessage = nextWinner === null ? "Impact resolved. Passing turn." : createWinnerMessage(nextPlayers, nextWinner);
        }
      }

      if (nextTerrain !== null) {
        const settleResult = applyMobileGravity(nextPlayers, nextTerrain, dt);
        nextPlayers = settleResult.players;
        waitingForSettling = settleResult.unstable;
      }

      if (state.phase !== "end" && nextPhaseTimer <= 0) {
        if (nextCharging && state.terrain !== null) {
          const fired = forceReleaseCharge(nextPlayers, state.turn, state.turnCount, nextPower);
          nextPlayers = fired.players;
          nextProjectile = fired.projectile;
          nextPower = fired.power;
          nextCharging = false;
          nextPhase = "fire";
          nextMessage = fired.message;
          nextPhaseTimer = getPhaseDuration("fire");
          nextPhaseDuration = getPhaseDuration("fire");
          nextHistory = appendHistory(
            nextHistory,
            [
              createMatchEvent(
                state.round,
                state.turn,
                "shot",
                fired.players[state.turn - 1].name +
                  " auto-fired " +
                  getWeaponDisplayName(fired.players[state.turn - 1].mobile.type, fired.players[state.turn - 1].mobile.weapon) +
                  "."
              )
            ]
          );
        } else if (nextPhase !== "resolve" && nextPhase !== "end" && nextProjectile === null) {
          nextPhase = "resolve";
          nextResolveTimer = 0.45;
          nextPhaseTimer = getPhaseDuration("resolve");
          nextPhaseDuration = getPhaseDuration("resolve");
          nextMessage = nextPlayers[state.turn - 1].name + " timed out.";
          nextHistory = appendHistory(
            nextHistory,
            [createMatchEvent(state.round, state.turn, "turn-start", nextPlayers[state.turn - 1].name + " timed out.")]
          );
        }
      }

      if (nextPhase === "resolve") {
        nextResolveTimer -= dt;
        if (nextResolveTimer <= 0 && !waitingForSettling && !hasAirborneBoxes(nextBonusBoxes)) {
          shouldAdvanceTurn = true;
        }
      }

      if (shouldAdvanceTurn && nextWinner === null && nextProjectile === null && nextPhase === "resolve") {
        const advanced = advanceTurn(nextPlayers, nextTerrain, state.round, state.turn, state.randomState, state.turnCount, state.suddenDeathTurn, nextBonusBoxes);
        nextHistory = appendHistory(nextHistory, advanced.history);
        nextDamagePopups = nextDamagePopups.concat(advanced.damagePopups);

        if (advanced.winner !== null) {
          const scoredPlayers = awardRoundScore(advanced.players, advanced.winner);
          set({
            scene: "playing",
            players: scoredPlayers,
            turn: advanced.turn,
            wind: advanced.wind,
            phase: "end",
            projectile: null,
            power: 0,
            charging: false,
            winner: advanced.winner,
            round: state.round,
            targetScore: state.targetScore,
            suddenDeathTurn: state.suddenDeathTurn,
            suddenDeathActive: true,
            turnCount: advanced.turnCount,
            phaseTimer: 2.2,
            phaseDuration: 2.2,
            tick: state.tick + 1,
            bonusBoxes: advanced.bonusBoxes,
            explosionVisual: nextExplosionVisual,
            damagePopups: nextDamagePopups,
            turnAnnouncement: null,
            history: appendHistory(
              nextHistory,
              [
                createMatchEvent(
                  state.round,
                  advanced.turn,
                  "round-end",
                  scoredPlayers[advanced.winner - 1].name +
                    " won round " +
                    String(state.round) +
                    ". Score " +
                    String(scoredPlayers[0].score) +
                    "-" +
                    String(scoredPlayers[1].score) +
                    "."
                )
              ]
            ),
            message: createWinnerMessage(scoredPlayers, advanced.winner),
            randomState: advanced.randomState,
            resolveTimer: 0,
            terrain: nextTerrain
          });
          return;
        }

        set({
          players: advanced.players,
          turn: advanced.turn,
          wind: advanced.wind,
          phase: "move",
          projectile: null,
          power: 0,
          charging: false,
          winner: null,
          round: state.round,
          targetScore: state.targetScore,
          suddenDeathTurn: state.suddenDeathTurn,
          suddenDeathActive: advanced.suddenDeathActive,
          turnCount: advanced.turnCount,
          phaseTimer: getPhaseDuration("move"),
          phaseDuration: getPhaseDuration("move"),
          tick: state.tick + 1,
          bonusBoxes: advanced.bonusBoxes,
          explosionVisual: nextExplosionVisual,
          damagePopups: nextDamagePopups,
          turnAnnouncement: createTurnAnnouncement(advanced.turn, advanced.players[advanced.turn - 1].name),
          history: nextHistory,
          message: advanced.message,
          randomState: advanced.randomState,
          resolveTimer: 0,
          terrain: nextTerrain
        });
        return;
      }

      if (nextWinner !== null) {
        nextPhase = "end";
        if (nextPhaseTimer <= 0) {
          if (nextPlayers[nextWinner - 1].score >= state.targetScore) {
            nextScene = "end";
          } else {
            const nextRoundState = buildNextRoundState(state.setup, nextPlayers, state.round + 1, nextHistory);
            set(nextRoundState);
            return;
          }
        }
      }

      set({
        scene: nextScene,
        players: nextPlayers,
        projectile: nextProjectile,
        power: nextPower,
        charging: nextCharging,
        phase: nextPhase,
        winner: nextWinner,
        round: nextRound,
        targetScore: state.targetScore,
        suddenDeathTurn: state.suddenDeathTurn,
        suddenDeathActive: nextSuddenDeathActive,
        phaseTimer: nextPhaseTimer,
        phaseDuration: nextPhaseDuration,
        explosionVisual: nextExplosionVisual,
        damagePopups: nextDamagePopups,
        turnAnnouncement: nextTurnAnnouncement,
        history: nextHistory,
        message: nextMessage,
        resolveTimer: nextResolveTimer,
        terrain: nextTerrain,
        bonusBoxes: nextBonusBoxes,
        tick: state.tick + 1
      });
    },
    setAimKey: function setAimKey(key: "up" | "down", active: boolean): void {
      const current = get().input;
      if (key === "up") {
        set({
          input: {
            aimUp: active,
            aimDown: current.aimDown
          }
        });
        return;
      }

      set({
        input: {
          aimUp: current.aimUp,
          aimDown: active
        }
      });
    },
    beginCharge: function beginCharge(): void {
      const state = get();
      if (state.scene !== "playing" || state.projectile !== null || state.terrain === null) {
        return;
      }

      if (state.phase === "resolve" || state.phase === "end") {
        return;
      }

      const currentPlayer = state.players[state.turn - 1];
      if (!canSelectWeapon(currentPlayer.mobile.weapon, currentPlayer.mobile.specialCharges, state.turnCount)) {
        return;
      }

      set({
        charging: true,
        phase: "fire",
        power: Math.max(state.power, 0.08),
        phaseTimer: getPhaseDuration("fire"),
        phaseDuration: getPhaseDuration("fire"),
        message: currentPlayer.name + " is charging."
      });
    },
    releaseCharge: function releaseCharge(): void {
      const state = get();
      if (state.scene !== "playing" || !state.charging || state.terrain === null) {
        return;
      }

      const players = clonePlayers(state.players);
      const currentPlayer = players[state.turn - 1];
      const power = clamp(state.power, 0.08, 1);
      const projectile = createProjectile(currentPlayer.mobile, state.turn, power);
      const shouldConsumeCharge = currentPlayer.mobile.weapon === "secondary" && state.turnCount < 4 && currentPlayer.mobile.specialCharges > 0;

      if (shouldConsumeCharge) {
        currentPlayer.mobile.specialCharges -= 1;
      }

      set({
        players,
        charging: false,
        projectile,
        power,
        phase: "fire",
        phaseTimer: getPhaseDuration("fire"),
        phaseDuration: getPhaseDuration("fire"),
        history: appendHistory(
          state.history,
          [
            createMatchEvent(
              state.round,
              state.turn,
              "shot",
              currentPlayer.name + " fired " + getWeaponDisplayName(currentPlayer.mobile.type, currentPlayer.mobile.weapon) + "."
            )
          ]
        ),
        message: currentPlayer.name + " fired."
      });
    },
    attemptMove: function attemptMove(direction: -1 | 1): void {
      const state = get();
      if (state.scene !== "playing" || state.terrain === null || state.projectile !== null || state.charging) {
        return;
      }

      if (state.phase === "resolve" || state.phase === "end" || state.phase === "fire") {
        return;
      }

      const players = clonePlayers(state.players);
      const currentPlayer = players[state.turn - 1];
      const otherPlayer = players[state.turn === 1 ? 1 : 0];
      const moveResult = moveMobileAlongTerrain(currentPlayer.mobile, state.terrain, direction, otherPlayer.mobile);

      if (!moveResult.moved) {
        return;
      }

      currentPlayer.mobile = moveResult.mobile;
      players[0].mobile.facing = players[0].mobile.position.x <= players[1].mobile.position.x ? 1 : -1;
      players[1].mobile.facing = players[1].mobile.position.x <= players[0].mobile.position.x ? 1 : -1;

      const pickupResult = pickupBonusBoxes(players, state.turn, state.bonusBoxes);
      const pickupHistory = createPickupHistory(state.round, state.turn, players[state.turn - 1], state.bonusBoxes, pickupResult.bonusBoxes);

      set({
        players: pickupResult.players,
        bonusBoxes: pickupResult.bonusBoxes,
        phase: "resolve",
        phaseTimer: getPhaseDuration("resolve"),
        phaseDuration: getPhaseDuration("resolve"),
        resolveTimer: 0.45,
        history: appendHistory(
          state.history,
          [
            createMatchEvent(
              state.round,
              state.turn,
              "move",
              currentPlayer.name + " moved to x " + String(Math.round(currentPlayer.mobile.position.x)) + "."
            ),
            ...pickupHistory
          ]
        ),
        message: currentPlayer.name + " moved and ended the turn."
      });
    },
    switchWeapon: function switchWeapon(): void {
      const state = get();
      if (state.scene !== "playing" || state.projectile !== null || state.charging) {
        return;
      }

      if (state.phase === "resolve" || state.phase === "end" || state.phase === "fire") {
        return;
      }

      const players = clonePlayers(state.players);
      const currentPlayer = players[state.turn - 1];
      const nextWeapon: WeaponType = currentPlayer.mobile.weapon === "primary" ? "secondary" : "primary";

      if (nextWeapon === "secondary" && !canSelectWeapon(nextWeapon, currentPlayer.mobile.specialCharges, state.turnCount)) {
        return;
      }

      currentPlayer.mobile.weapon = nextWeapon;

      set({
        players,
        history: appendHistory(
          state.history,
          [
            createMatchEvent(
              state.round,
              state.turn,
              "weapon-switch",
              currentPlayer.name + " selected " + getWeaponDisplayName(currentPlayer.mobile.type, nextWeapon) + "."
            )
          ]
        ),
        message: currentPlayer.name + " selected " + nextWeapon + "."
      });
    }
  };
}

function createPlaceholderPlayers(): [Player, Player] {
  return [
    {
      id: 1,
      name: defaultSetup.playerOneName,
      score: 0,
      mobile: createMobile(defaultSetup.playerOneMobile, "p1-mobile", 1, 160)
    },
    {
      id: 2,
      name: defaultSetup.playerTwoName,
      score: 0,
      mobile: createMobile(defaultSetup.playerTwoMobile, "p2-mobile", 2, worldWidth - 160)
    }
  ];
}

function createPlayers(config: MatchConfig, terrain: TerrainState): [Player, Player] {
  const playerOneMobile = createMobile(config.playerOneMobile, "p1-mobile", 1, 164);
  const playerTwoMobile = createMobile(config.playerTwoMobile, "p2-mobile", 2, worldWidth - 164);

  playerOneMobile.position.y = getSurfaceY(terrain, playerOneMobile.position.x);
  playerTwoMobile.position.y = getSurfaceY(terrain, playerTwoMobile.position.x);
  playerOneMobile.facing = 1;
  playerTwoMobile.facing = -1;

  return [
    {
      id: 1,
      name: config.playerOneName || "Player 1",
      mobile: playerOneMobile,
      score: 0
    },
    {
      id: 2,
      name: config.playerTwoName || "Player 2",
      mobile: playerTwoMobile,
      score: 0
    }
  ];
}

function createPlayersForRound(config: MatchConfig, terrain: TerrainState, previousPlayers: [Player, Player]): [Player, Player] {
  const nextPlayers = createPlayers(config, terrain);
  nextPlayers[0].score = previousPlayers[0].score;
  nextPlayers[1].score = previousPlayers[1].score;
  return nextPlayers;
}

function createMobile(type: MobileType, id: string, playerId: 1 | 2, x: number): Mobile {
  if (type === "knight") {
    return {
      id,
      type,
      hp: 92,
      maxHp: 92,
      position: { x, y: worldHeight * 0.6 },
      weapon: "primary",
      width: 34,
      height: 20,
      angle: 52,
      facing: playerId === 1 ? 1 : -1,
      moveRange: 84,
      shotDelay: 1.1,
      specialCharges: 0,
      doubleDamageTurns: 0,
      verticalVelocity: 0
    };
  }

  return {
    id,
    type,
    hp: 118,
    maxHp: 118,
    position: { x, y: worldHeight * 0.6 },
    weapon: "primary",
    width: 40,
    height: 24,
    angle: 46,
    facing: playerId === 1 ? 1 : -1,
    moveRange: 68,
    shotDelay: 0.92,
    specialCharges: 0,
    doubleDamageTurns: 0,
    verticalVelocity: 0
  };
}

function clonePlayers(players: [Player, Player]): [Player, Player] {
  return [
    {
      id: players[0].id,
      name: players[0].name,
      score: players[0].score,
      mobile: cloneMobile(players[0].mobile)
    },
    {
      id: players[1].id,
      name: players[1].name,
      score: players[1].score,
      mobile: cloneMobile(players[1].mobile)
    }
  ];
}

function cloneMobile(mobile: Mobile): Mobile {
  return {
    id: mobile.id,
    type: mobile.type,
    hp: mobile.hp,
    maxHp: mobile.maxHp,
    position: {
      x: mobile.position.x,
      y: mobile.position.y
    },
    weapon: mobile.weapon,
    width: mobile.width,
    height: mobile.height,
    angle: mobile.angle,
    facing: mobile.facing,
    moveRange: mobile.moveRange,
    shotDelay: mobile.shotDelay,
    specialCharges: mobile.specialCharges,
    doubleDamageTurns: mobile.doubleDamageTurns,
    verticalVelocity: mobile.verticalVelocity
  };
}

function applyAimInput(players: [Player, Player], turn: 1 | 2, input: InputState, dt: number): [Player, Player] {
  const nextPlayers = clonePlayers(players);
  const mobile = nextPlayers[turn - 1].mobile;
  let delta = 0;

  if (input.aimUp) {
    delta += 54 * dt;
  }

  if (input.aimDown) {
    delta -= 54 * dt;
  }

  if (delta !== 0) {
    mobile.angle = clamp(mobile.angle + delta, 16, 84);
  }

  return nextPlayers;
}

function moveMobileAlongTerrain(
  mobile: Mobile,
  terrain: TerrainState,
  direction: -1 | 1,
  otherMobile: Mobile
): {
  mobile: Mobile;
  moved: boolean;
} {
  const nextMobile = cloneMobile(mobile);
  const stepSize = 6;
  const totalSteps = Math.max(1, Math.floor(mobile.moveRange / stepSize));
  const climbLimit = 12;
  let step = 0;
  let moved = false;

  while (step < totalSteps) {
    const candidateX = clamp(nextMobile.position.x + stepSize * direction, 48, terrain.width - 48);
    const candidateY = getSurfaceY(terrain, candidateX);
    const currentY = getSurfaceY(terrain, nextMobile.position.x);
    const otherDistance = Math.abs(candidateX - otherMobile.position.x);
    const minDistance = nextMobile.width * 0.7 + otherMobile.width * 0.7;

    if (Math.abs(candidateY - currentY) > climbLimit) {
      break;
    }

    if (otherDistance < minDistance) {
      break;
    }

    nextMobile.position.x = candidateX;
    nextMobile.position.y = candidateY;
    moved = true;
    step += 1;
  }

  return {
    mobile: nextMobile,
    moved
  };
}

function applyExplosion(
  players: [Player, Player],
  explosion: ExplosionState,
  round: number,
  turn: 1 | 2
): {
  players: [Player, Player];
  damagePopups: DamagePopup[];
  history: MatchEvent[];
} {
  const nextPlayers = clonePlayers(players);
  const damagePopups: DamagePopup[] = [];
  const history: MatchEvent[] = [];
  let index = 0;

  while (index < nextPlayers.length) {
    const player = nextPlayers[index];
    const targetPoint = {
      x: player.mobile.position.x,
      y: player.mobile.position.y - player.mobile.height * 0.5
    };
    let damage = distanceDamage(explosion, targetPoint);
    const owner = nextPlayers[explosion.owner - 1];

    if (owner.mobile.doubleDamageTurns > 0) {
      damage *= 2;
    }

    const roundedDamage = Math.round(damage);
    player.mobile.hp = Math.max(0, Math.round(player.mobile.hp - damage));
    if (roundedDamage > 0) {
      damagePopups.push(createDamagePopup(player, roundedDamage));
      history.push(
        createMatchEvent(
          round,
          turn,
          "hit",
          nextPlayers[explosion.owner - 1].name +
            " hit " +
            player.name +
            " for " +
            String(roundedDamage) +
            "."
        )
      );
    }
    index += 1;
  }

  nextPlayers[explosion.owner - 1].mobile.doubleDamageTurns = Math.max(0, nextPlayers[explosion.owner - 1].mobile.doubleDamageTurns - 1);

  return {
    players: nextPlayers,
    damagePopups,
    history
  };
}

function settlePlayersOnTerrain(players: [Player, Player], terrain: TerrainState): [Player, Player] {
  const nextPlayers = clonePlayers(players);
  let index = 0;

  while (index < nextPlayers.length) {
    const player = nextPlayers[index];
    player.mobile.position.y = getSurfaceY(terrain, player.mobile.position.x);
    index += 1;
  }

  return nextPlayers;
}

function markPlayersForFalling(players: [Player, Player]): [Player, Player] {
  const nextPlayers = clonePlayers(players);
  let index = 0;

  while (index < nextPlayers.length) {
    nextPlayers[index].mobile.verticalVelocity = 0;
    index += 1;
  }

  return nextPlayers;
}

function applyMobileGravity(
  players: [Player, Player],
  terrain: TerrainState,
  dt: number
): {
  players: [Player, Player];
  unstable: boolean;
} {
  const nextPlayers = clonePlayers(players);
  let unstable = false;
  let index = 0;

  while (index < nextPlayers.length) {
    const mobile = nextPlayers[index].mobile;
    const surfaceY = getSurfaceY(terrain, mobile.position.x);

    if (mobile.position.y < surfaceY - 0.5) {
      mobile.verticalVelocity += 960 * dt;
      mobile.position.y = Math.min(surfaceY, mobile.position.y + mobile.verticalVelocity * dt);
      unstable = true;

      if (mobile.position.y >= surfaceY) {
        mobile.position.y = surfaceY;
        mobile.verticalVelocity = 0;
      }
    } else {
      mobile.position.y = surfaceY;
      mobile.verticalVelocity = 0;
    }

    index += 1;
  }

  return {
    players: nextPlayers,
    unstable
  };
}

function getWinner(players: [Player, Player]): 1 | 2 | null {
  if (players[0].mobile.hp <= 0 && players[1].mobile.hp <= 0) {
    return 1;
  }

  if (players[0].mobile.hp <= 0) {
    return 2;
  }

  if (players[1].mobile.hp <= 0) {
    return 1;
  }

  return null;
}

function awardRoundScore(players: [Player, Player], winner: 1 | 2): [Player, Player] {
  const nextPlayers = clonePlayers(players);
  nextPlayers[winner - 1].score += 1;
  return nextPlayers;
}

function createWinnerMessage(players: [Player, Player], winner: 1 | 2): string {
  return players[winner - 1].name + " wins.";
}

function advanceTurn(
  players: [Player, Player],
  terrain: TerrainState,
  round: number,
  turn: 1 | 2,
  randomState: number,
  turnCount: number,
  suddenDeathTurn: number,
  bonusBoxes: BonusBox[]
): {
  players: [Player, Player];
  turn: 1 | 2;
  wind: { x: number; y: number };
  turnCount: number;
  bonusBoxes: BonusBox[];
  message: string;
  randomState: number;
  suddenDeathActive: boolean;
  history: MatchEvent[];
  damagePopups: DamagePopup[];
  winner: 1 | 2 | null;
} {
  const nextTurn = turn === 1 ? 2 : 1;
  const nextTurnCount = turnCount + 1;
  const windRoll = rollWind(randomState);
  const nextPlayers = clonePlayers(players);
  const history: MatchEvent[] = [];
  let damagePopups: DamagePopup[] = [];
  const suddenDeathActive = nextTurnCount >= suddenDeathTurn;
  nextPlayers[nextTurn - 1].mobile.weapon = "primary";
  const bonusRoll = maybeSpawnBonusBoxes(windRoll.state, bonusBoxes, nextTurnCount, terrain);
  history.push(createMatchEvent(round, nextTurn, "turn-start", nextPlayers[nextTurn - 1].name + " turn."));

  if (nextTurnCount === suddenDeathTurn) {
    history.push(createMatchEvent(round, nextTurn, "sudden-death", "Sudden death started."));
  }

  if (suddenDeathActive) {
    const suddenDeathResult = applySuddenDeathTick(nextPlayers, round, nextTurn);
    damagePopups = suddenDeathResult.damagePopups;
    history.push(...suddenDeathResult.history);
  }

  const winner = getWinner(nextPlayers);
  const message =
    winner === null
      ? nextPlayers[nextTurn - 1].name + " turn. Wind " + getWindLabel(windRoll.wind) + "."
      : createWinnerMessage(nextPlayers, winner);

  return {
    players: nextPlayers,
    turn: nextTurn,
    wind: windRoll.wind,
    turnCount: nextTurnCount,
    bonusBoxes: bonusRoll.bonusBoxes,
    message,
    randomState: bonusRoll.randomState,
    suddenDeathActive,
    history,
    damagePopups,
    winner
  };
}

function maybeSpawnBonusBoxes(
  randomState: number,
  bonusBoxes: BonusBox[],
  turnCount: number,
  terrain: TerrainState
): {
  bonusBoxes: BonusBox[];
  randomState: number;
} {
  if (turnCount % 3 !== 0 || bonusBoxes.length >= 3) {
    return {
      bonusBoxes,
      randomState
    };
  }

  const typeRoll = randomInt(randomState, 0, 2);
  const xRoll = randomInt(typeRoll.state, 120, worldWidth - 120);
  const bonusType = getBonusType(typeRoll.value);
  const box: BonusBox = {
    id: "box-" + String(turnCount) + "-" + String(typeRoll.state),
    type: bonusType,
    position: {
      x: xRoll.value,
      y: 76
    },
    radius: 16,
    verticalVelocity: 0,
    landed: false
  };
  const nextBoxes = bonusBoxes.slice();
  nextBoxes.push(box);

  return {
    bonusBoxes: nextBoxes,
    randomState: xRoll.state
  };
}

function getBonusType(value: number): BonusType {
  if (value === 0) {
    return "weapon";
  }

  if (value === 1) {
    return "repair";
  }

  return "double";
}

function pickupBonusBoxes(
  players: [Player, Player],
  turn: 1 | 2,
  bonusBoxes: BonusBox[]
): {
  players: [Player, Player];
  bonusBoxes: BonusBox[];
} {
  const nextPlayers = clonePlayers(players);
  const remaining: BonusBox[] = [];
  const player = nextPlayers[turn - 1];
  let index = 0;

  while (index < bonusBoxes.length) {
    const box = bonusBoxes[index];
    if (!box.landed) {
      remaining.push(box);
      index += 1;
      continue;
    }
    const distance = Math.hypot(player.mobile.position.x - box.position.x, player.mobile.position.y - box.position.y);

    if (distance <= player.mobile.width * 0.8 + box.radius) {
      applyBonus(player.mobile, box.type);
    } else {
      remaining.push(box);
    }

    index += 1;
  }

  return {
    players: nextPlayers,
    bonusBoxes: remaining
  };
}

function applyBonus(mobile: Mobile, bonus: BonusType): void {
  if (bonus === "weapon") {
    mobile.specialCharges += 1;
    return;
  }

  if (bonus === "repair") {
    mobile.hp = Math.min(mobile.maxHp, mobile.hp + 18);
    return;
  }

  mobile.doubleDamageTurns = 1;
}

function canSelectWeapon(weapon: WeaponType, specialCharges: number, turnCount: number): boolean {
  if (weapon === "primary") {
    return true;
  }

  return turnCount >= 4 || specialCharges > 0;
}

function tickBonusBoxes(bonusBoxes: BonusBox[], terrain: TerrainState, dt: number): BonusBox[] {
  const nextBoxes: BonusBox[] = [];
  let index = 0;

  while (index < bonusBoxes.length) {
    const box = bonusBoxes[index];
    const surfaceY = getSurfaceY(terrain, box.position.x);

    if (box.landed) {
      nextBoxes.push(box);
      index += 1;
      continue;
    }

    const nextVelocity = box.verticalVelocity + 120 * dt;
    const nextY = Math.min(surfaceY, box.position.y + nextVelocity * dt * 18);
    nextBoxes.push({
      id: box.id,
      type: box.type,
      position: {
        x: box.position.x,
        y: nextY
      },
      radius: box.radius,
      verticalVelocity: nextY >= surfaceY ? 0 : nextVelocity,
      landed: nextY >= surfaceY
    });
    index += 1;
  }

  return nextBoxes;
}

function hasAirborneBoxes(bonusBoxes: BonusBox[]): boolean {
  let index = 0;

  while (index < bonusBoxes.length) {
    if (!bonusBoxes[index].landed) {
      return true;
    }
    index += 1;
  }

  return false;
}

function getPhaseDuration(phase: GamePhase): number {
  if (phase === "move") {
    return 12;
  }

  if (phase === "aim") {
    return 10;
  }

  if (phase === "fire") {
    return 8;
  }

  if (phase === "resolve") {
    return 1.2;
  }

  return 0;
}

function forceReleaseCharge(
  players: [Player, Player],
  turn: 1 | 2,
  turnCount: number,
  power: number
): {
  players: [Player, Player];
  projectile: ReturnType<typeof createProjectile>;
  power: number;
  message: string;
} {
  const nextPlayers = clonePlayers(players);
  const currentPlayer = nextPlayers[turn - 1];
  const nextPower = clamp(power, 0.08, 1);
  const projectile = createProjectile(currentPlayer.mobile, turn, nextPower);
  const shouldConsumeCharge = currentPlayer.mobile.weapon === "secondary" && turnCount < 4 && currentPlayer.mobile.specialCharges > 0;

  if (shouldConsumeCharge) {
    currentPlayer.mobile.specialCharges -= 1;
  }

  return {
    players: nextPlayers,
    projectile,
    power: nextPower,
    message: currentPlayer.name + " auto-fired."
  };
}

function applySuddenDeathTick(
  players: [Player, Player],
  round: number,
  turn: 1 | 2
): {
  damagePopups: DamagePopup[];
  history: MatchEvent[];
} {
  const damagePopups: DamagePopup[] = [];
  const history: MatchEvent[] = [];
  let index = 0;

  while (index < players.length) {
    const player = players[index];
    const damage = 8;
    player.mobile.hp = Math.max(0, player.mobile.hp - damage);
    damagePopups.push(createDamagePopup(player, damage));
    history.push(createMatchEvent(round, turn, "sudden-death", player.name + " took " + String(damage) + " storm damage."));
    index += 1;
  }

  return {
    damagePopups,
    history
  };
}

function buildNextRoundState(
  setup: MatchConfig,
  previousPlayers: [Player, Player],
  round: number,
  previousHistory: MatchEvent[]
): Partial<GameStoreState> {
  const seed = normalizeSeed(setup.seedText + "-round-" + String(round));
  const terrainRoll = createTerrain(seed, worldWidth, worldHeight);
  const players = createPlayersForRound(setup, terrainRoll.terrain, previousPlayers);
  const windRoll = rollWind(terrainRoll.state);
  const starter: 1 | 2 = round % 2 === 0 ? 2 : 1;
  const message = players[starter - 1].name + " starts round " + String(round) + ".";

  return {
    scene: "playing",
    phase: "move",
    turn: starter,
    wind: windRoll.wind,
    players,
    seed,
    terrain: terrainRoll.terrain,
    projectile: null,
    winner: null,
    round,
    suddenDeathActive: false,
    power: 0,
    charging: false,
    turnCount: 1,
    phaseTimer: getPhaseDuration("move"),
    phaseDuration: getPhaseDuration("move"),
    bonusBoxes: [],
    explosionVisual: null,
    damagePopups: [],
    turnAnnouncement: createTurnAnnouncement(starter, "Round " + String(round)),
    history: appendHistory(
      previousHistory,
      [
        createMatchEvent(round, starter, "round-start", "Round " + String(round) + " started."),
        createMatchEvent(round, starter, "turn-start", players[starter - 1].name + " opens the round.")
      ]
    ),
    message,
    randomState: windRoll.state,
    resolveTimer: 0
  };
}

function createRoundHistory(players: [Player, Player], round: number, turn: 1 | 2, text: string): MatchEvent[] {
  return appendHistory(
    [],
    [
      createMatchEvent(round, turn, "round-start", text),
      createMatchEvent(round, turn, "turn-start", players[turn - 1].name + " turn.")
    ]
  );
}

function createPickupHistory(
  round: number,
  turn: 1 | 2,
  player: Player,
  beforeBoxes: BonusBox[],
  afterBoxes: BonusBox[]
): MatchEvent[] {
  const history: MatchEvent[] = [];
  let index = 0;

  while (index < beforeBoxes.length) {
    const box = beforeBoxes[index];
    if (containsBonusBox(afterBoxes, box.id)) {
      index += 1;
      continue;
    }

    history.push(
      createMatchEvent(
        round,
        turn,
        "bonus",
        player.name + " picked up " + getBonusHistoryLabel(box.type) + "."
      )
    );
    index += 1;
  }

  return history;
}

function containsBonusBox(bonusBoxes: BonusBox[], id: string): boolean {
  let index = 0;

  while (index < bonusBoxes.length) {
    if (bonusBoxes[index].id === id) {
      return true;
    }
    index += 1;
  }

  return false;
}

function getBonusHistoryLabel(type: BonusType): string {
  if (type === "weapon") {
    return "a weapon crate";
  }

  if (type === "repair") {
    return "a repair crate";
  }

  return "a double damage crate";
}

function createMatchEvent(round: number, turn: 1 | 2, kind: MatchEventKind, text: string): MatchEvent {
  return {
    id: String(round) + "-" + String(turn) + "-" + kind + "-" + String(text.length) + "-" + String(Math.abs(hashText(text))),
    round,
    turn,
    kind,
    text
  };
}

function appendHistory(history: MatchEvent[], entries: MatchEvent[]): MatchEvent[] {
  const nextHistory = history.slice();
  let index = 0;

  while (index < entries.length) {
    nextHistory.push(entries[index]);
    index += 1;
  }

  if (nextHistory.length > 80) {
    return nextHistory.slice(nextHistory.length - 80);
  }

  return nextHistory;
}

function hashText(text: string): number {
  let hash = 0;
  let index = 0;

  while (index < text.length) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
    index += 1;
  }

  return hash;
}

function createExplosionVisual(explosion: ExplosionState): ExplosionVisual {
  return {
    point: explosion.point,
    radius: explosion.radius,
    timer: 0.6,
    duration: 0.6
  };
}

function createDamagePopup(player: Player, value: number): DamagePopup {
  return {
    id: "popup-" + String(player.id) + "-" + String(value) + "-" + String(player.mobile.hp),
    value,
    position: {
      x: player.mobile.position.x,
      y: player.mobile.position.y - player.mobile.height - 16
    },
    timer: 1,
    duration: 1
  };
}

function createTurnAnnouncement(playerId: 1 | 2, playerName: string): TurnAnnouncement {
  return {
    playerId,
    text: playerName + " turn",
    timer: 1.65,
    duration: 1.65
  };
}

function tickExplosionVisual(explosionVisual: ExplosionVisual | null, dt: number): ExplosionVisual | null {
  if (explosionVisual === null) {
    return null;
  }

  const nextTimer = explosionVisual.timer - dt;
  if (nextTimer <= 0) {
    return null;
  }

  return {
    point: explosionVisual.point,
    radius: explosionVisual.radius,
    timer: nextTimer,
    duration: explosionVisual.duration
  };
}

function tickDamagePopups(damagePopups: DamagePopup[], dt: number): DamagePopup[] {
  const nextDamagePopups: DamagePopup[] = [];
  let index = 0;

  while (index < damagePopups.length) {
    const popup = damagePopups[index];
    const nextTimer = popup.timer - dt;

    if (nextTimer > 0) {
      nextDamagePopups.push({
        id: popup.id,
        value: popup.value,
        position: popup.position,
        timer: nextTimer,
        duration: popup.duration
      });
    }

    index += 1;
  }

  return nextDamagePopups;
}

function tickTurnAnnouncement(turnAnnouncement: TurnAnnouncement | null, dt: number): TurnAnnouncement | null {
  if (turnAnnouncement === null) {
    return null;
  }

  const nextTimer = turnAnnouncement.timer - dt;
  if (nextTimer <= 0) {
    return null;
  }

  return {
    playerId: turnAnnouncement.playerId,
    text: turnAnnouncement.text,
    timer: nextTimer,
    duration: turnAnnouncement.duration
  };
}
