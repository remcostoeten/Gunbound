"use client";

import { create } from "zustand";
import type { StateCreator } from "zustand";
import { defaultRoundLimit, defaultSuddenDeathTurn, defaultTargetScore, getPhaseDuration } from "@/features/game/constants/gameplay";
import { applyMobileGravity, markPlayersForFalling } from "@/features/game/engine/gravity";
import { moveMobileAlongTerrain } from "@/features/game/engine/movement";
import { applyExplosionDamage, stepProjectile } from "@/features/game/engine/physics";
import { advanceRoundTurn, getRoundWinner, resolveMatchContinuation, resolveRoundWinner } from "@/features/game/engine/rounds";
import { normalizeSeed } from "@/features/game/engine/random";
import { carveCrater, clamp, getSurfaceY } from "@/features/game/engine/terrain";
import { canSelectWeapon, getNextWeapon, getWeaponDisplayName, shouldConsumeSpecialCharge } from "@/features/game/engine/weapons";
import { appendHistory, appendMatchEventEntries, createMatchEvent as buildMatchEvent } from "@/features/game/factories/create-match-event";
import { createPlaceholderPlayers } from "@/features/game/factories/create-player";
import { createProjectile } from "@/features/game/factories/create-projectile";
import { createStartedMatchState } from "@/features/game/factories/create-round-state";
import { createTurnAnnouncement } from "@/features/game/factories/create-turn-announcement";
import type {
  CombatHit,
  ExplosionState
} from "@/features/game/types/combat";
import type {
  BonusBox,
  Mobile,
  Player,
  TerrainState
} from "@/features/game/types/entities";
import type { DamagePopup, ExplosionVisual, TurnAnnouncement } from "@/features/game/types/effects";
import type { MatchEvent } from "@/features/game/types/events";
import type { GameState, InputState, MatchConfig } from "@/features/game/types/state";
import type { BonusType } from "@/features/game/types/shared";

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
  playerOneTitle: "Captain",
  playerTwoTitle: "Raider",
  playerOneAccent: "sky",
  playerTwoAccent: "coral",
  mapType: "rolling",
  targetScore: defaultTargetScore,
  roundLimit: defaultRoundLimit,
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
    players: createPlaceholderPlayers(defaultSetup),
    tick: 0,
    seed: normalizeSeed(defaultSetup.seedText),
    terrain: null,
    projectile: null,
    winner: null,
    round: 1,
    targetScore: defaultTargetScore,
    suddenDeathTurn: defaultSuddenDeathTurn,
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
      const startedMatchState = createStartedMatchState(config);

      set({
        ...startedMatchState,
        input: {
          aimUp: false,
          aimDown: false
        },
        setup: config
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
        targetScore: defaultTargetScore,
        suddenDeathTurn: defaultSuddenDeathTurn,
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

        if (step.bonusExplosion !== null) {
          nextTerrain = carveCrater(nextTerrain, step.bonusExplosion.point, step.bonusExplosion.radius);
          const bonusResult = applyExplosion(nextPlayers, step.bonusExplosion, state.round, state.turn);
          nextPlayers = bonusResult.players;
          nextDamagePopups = nextDamagePopups.concat(bonusResult.damagePopups);
          nextHistory = appendHistory(nextHistory, bonusResult.history);
        }

        if (step.explosion !== null) {
          const explosions = buildExplosionList(step.explosion);
          let primaryVisualSet = false;

          for (const explosion of explosions) {
            nextTerrain = carveCrater(nextTerrain, explosion.point, explosion.radius);
            const explosionResult = applyExplosion(nextPlayers, explosion, state.round, state.turn);
            nextPlayers = markPlayersForFalling(explosionResult.players);
            nextDamagePopups = nextDamagePopups.concat(explosionResult.damagePopups);
            nextHistory = appendHistory(nextHistory, explosionResult.history);
            if (!primaryVisualSet) {
              nextExplosionVisual = createExplosionVisual(explosion);
              primaryVisualSet = true;
            }
          }

          nextPower = 0;
          nextCharging = false;
          nextWinner = getRoundWinner(nextPlayers);
          if (nextWinner !== null) {
            const resolution = resolveRoundWinner(nextPlayers, nextWinner, state.round, state.turn, nextHistory);
            nextPlayers = resolution.players;
            nextHistory = resolution.history;
            nextMessage = resolution.message;
          }
          nextPhase = nextWinner === null ? "resolve" : "end";
          nextResolveTimer = 0.7;
          nextPhaseTimer = nextWinner === null ? getPhaseDuration("resolve") : 2.2;
          nextPhaseDuration = nextWinner === null ? getPhaseDuration("resolve") : 2.2;
          if (nextWinner === null) {
            nextMessage = "Impact resolved. Passing turn.";
          }
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
          nextHistory = appendMatchEventEntries(nextHistory, [
            {
              round: state.round,
              turn: state.turn,
              kind: "shot",
              text:
                fired.players[state.turn - 1].name +
                " auto-fired " +
                getWeaponDisplayName(fired.players[state.turn - 1].mobile.type, fired.players[state.turn - 1].mobile.weapon) +
                "."
            }
          ]);
        } else if (nextPhase !== "resolve" && nextPhase !== "end" && nextProjectile === null) {
          nextPhase = "resolve";
          nextResolveTimer = 0.45;
          nextPhaseTimer = getPhaseDuration("resolve");
          nextPhaseDuration = getPhaseDuration("resolve");
          nextMessage = nextPlayers[state.turn - 1].name + " timed out.";
          nextHistory = appendMatchEventEntries(nextHistory, [
            {
              round: state.round,
              turn: state.turn,
              kind: "turn-start",
              text: nextPlayers[state.turn - 1].name + " timed out."
            }
          ]);
        }
      }

      if (nextPhase === "resolve") {
        nextResolveTimer -= dt;
        if (nextResolveTimer <= 0 && !waitingForSettling && !hasAirborneBoxes(nextBonusBoxes)) {
          shouldAdvanceTurn = true;
        }
      }

      if (shouldAdvanceTurn && nextWinner === null && nextProjectile === null && nextPhase === "resolve") {
        const advanced = advanceRoundTurn(nextPlayers, nextTerrain, state.round, state.turn, state.randomState, state.turnCount, state.suddenDeathTurn, nextBonusBoxes);
        nextHistory = appendHistory(nextHistory, advanced.history);
        nextDamagePopups = nextDamagePopups.concat(advanced.damagePopups);

        if (advanced.winner !== null) {
          const resolution = resolveRoundWinner(advanced.players, advanced.winner, state.round, advanced.turn, nextHistory);
          set({
            scene: "playing",
            players: resolution.players,
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
            suddenDeathActive: advanced.suddenDeathActive,
            turnCount: advanced.turnCount,
            phaseTimer: 2.2,
            phaseDuration: 2.2,
            tick: state.tick + 1,
            bonusBoxes: advanced.bonusBoxes,
            explosionVisual: nextExplosionVisual,
            damagePopups: nextDamagePopups,
            turnAnnouncement: null,
            history: resolution.history,
            message: resolution.message,
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
          const continuation = resolveMatchContinuation(state.setup, nextPlayers, state.round, state.targetScore, nextHistory);
          if (continuation.type === "match-end") {
            nextScene = "end";
          } else {
            set(continuation.state);
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
      const shouldConsumeCharge = shouldConsumeSpecialCharge(currentPlayer.mobile.weapon, currentPlayer.mobile.specialCharges, state.turnCount);

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
        history: appendMatchEventEntries(state.history, [
          {
            round: state.round,
            turn: state.turn,
            kind: "shot",
            text: currentPlayer.name + " fired " + getWeaponDisplayName(currentPlayer.mobile.type, currentPlayer.mobile.weapon) + "."
          }
        ]),
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
          appendMatchEventEntries(state.history, [
            {
              round: state.round,
              turn: state.turn,
              kind: "move",
              text: currentPlayer.name + " moved to x " + String(Math.round(currentPlayer.mobile.position.x)) + "."
            }
          ]),
          pickupHistory
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
      const nextWeapon = getNextWeapon(currentPlayer.mobile.weapon);

      if (nextWeapon === "secondary" && !canSelectWeapon(nextWeapon, currentPlayer.mobile.specialCharges, state.turnCount)) {
        return;
      }

      currentPlayer.mobile.weapon = nextWeapon;

      set({
        players,
        history: appendMatchEventEntries(state.history, [
          {
            round: state.round,
            turn: state.turn,
            kind: "weapon-switch",
            text: currentPlayer.name + " selected " + getWeaponDisplayName(currentPlayer.mobile.type, nextWeapon) + "."
          }
        ]),
        message: currentPlayer.name + " selected " + nextWeapon + "."
      });
    }
  };
}

function clonePlayers(players: [Player, Player]): [Player, Player] {
  return [
    {
      id: players[0].id,
      name: players[0].name,
      title: players[0].title,
      accent: players[0].accent,
      score: players[0].score,
      mobile: cloneMobile(players[0].mobile)
    },
    {
      id: players[1].id,
      name: players[1].name,
      title: players[1].title,
      accent: players[1].accent,
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
  const resolution = applyExplosionDamage(players, explosion);
  const history = createHitHistory(resolution.hits, resolution.players[explosion.owner - 1].name, round, turn);

  return {
    players: resolution.players,
    damagePopups: createDamagePopups(resolution.hits),
    history
  };
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
  const shouldConsumeCharge = shouldConsumeSpecialCharge(currentPlayer.mobile.weapon, currentPlayer.mobile.specialCharges, turnCount);

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

function createMatchEvent(round: number, turn: 1 | 2, kind: MatchEvent["kind"], text: string): MatchEvent {
  return buildMatchEvent({
    round,
    turn,
    kind,
    text
  });
}

function buildExplosionList(explosion: ExplosionState): ExplosionState[] {
  if (explosion.mobileType === "mage" && explosion.weapon === "secondary") {
    return [
      { ...explosion, point: { x: explosion.point.x - 22, y: explosion.point.y }, damage: explosion.damage * 0.65, radius: explosion.radius * 0.8 },
      { ...explosion, point: { x: explosion.point.x + 22, y: explosion.point.y }, damage: explosion.damage * 0.65, radius: explosion.radius * 0.8 }
    ];
  }

  return [explosion];
}

function createExplosionVisual(explosion: ExplosionState): ExplosionVisual {
  return {
    point: explosion.point,
    radius: explosion.radius,
    mobileType: explosion.mobileType,
    timer: 0.6,
    duration: 0.6
  };
}

function createDamagePopup(hit: CombatHit): DamagePopup {
  return {
    id: "popup-" + String(hit.playerId) + "-" + String(hit.damage) + "-" + String(Math.round(hit.popupPosition.x)) + "-" + String(Math.round(hit.popupPosition.y)),
    value: hit.damage,
    position: hit.popupPosition,
    timer: 1,
    duration: 1
  };
}

function createDamagePopups(hits: CombatHit[]): DamagePopup[] {
  const damagePopups: DamagePopup[] = [];
  let index = 0;

  while (index < hits.length) {
    damagePopups.push(createDamagePopup(hits[index]));
    index += 1;
  }

  return damagePopups;
}

function createHitHistory(hits: CombatHit[], attackerName: string, round: number, turn: 1 | 2): MatchEvent[] {
  const history: MatchEvent[] = [];
  let index = 0;

  while (index < hits.length) {
    const hit = hits[index];
    history.push(
      createMatchEvent(
        round,
        turn,
        "hit",
        attackerName + " hit " + hit.playerName + " for " + String(hit.damage) + "."
      )
    );
    index += 1;
  }

  return history;
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
    mobileType: explosionVisual.mobileType,
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
