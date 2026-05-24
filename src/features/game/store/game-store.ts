"use client";

import { create } from "zustand";
import type { StateCreator } from "zustand";
import { defaultRoundLimit, defaultSuddenDeathTurn, defaultTargetScore, defaultTurnDurationMode, getPhaseDuration } from "@/features/game/constants/gameplay";
import {
  type BattleItemInventory,
  consumeBattleItem,
  createBattleItemInventories,
  getBattleItemDelay,
  getBattleItemDisplayName,
  getNextAvailableBattleItem,
  hasBattleItem
} from "@/features/game/engine/battle-items";
import { applyTurnDelay, calculateShotDelay, createInitialTurnDelays } from "@/features/game/engine/delay";
import { applyMobileGravity, markPlayersForFalling } from "@/features/game/engine/gravity";
import { moveMobileAlongTerrain } from "@/features/game/engine/movement";
import { applyExplosionDamage, stepProjectile } from "@/features/game/engine/physics";
import { advanceRoundTurn, getRoundWinner, resolveMatchContinuation, resolveRoundWinner } from "@/features/game/engine/rounds";
import { normalizeSeed } from "@/features/game/engine/random";
import { carveCrater, clamp, getSurfaceY } from "@/features/game/engine/terrain";
import { canSelectWeapon, getNextWeapon, getWeaponDisplayName, shouldConsumeSpecialCharge } from "@/features/game/engine/weapons";
import { appendHistory, appendMatchEventEntries, createMatchEvent as buildMatchEvent, resetHistoryEventCounter } from "@/features/game/factories/create-match-event";
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
import type { BattleItemType, BonusType, WeaponType } from "@/features/game/types/shared";

type GameStoreState = GameState & {
  input: InputState;
  randomState: number;
  setup: MatchConfig;
  resolveTimer: number;
  moveRepeatTimer: number;
  startMatch(config: MatchConfig): void;
  restartMatch(): void;
  returnToSetup(): void;
  surrenderMatch(loser: 1 | 2): void;
  stepSimulation(dt: number): void;
  setAimKey(key: "up" | "down", active: boolean): void;
  setMoveKey(direction: -1 | 1, active: boolean): void;
  beginCharge(): void;
  releaseCharge(): void;
  attemptMove(direction: -1 | 1): void;
  switchWeapon(): void;
  switchBattleItem(): void;
  applyBattleMove(direction: -1 | 1): void;
  applyBattleWeaponSwitch(weapon?: WeaponType): void;
  applyBattleItemSwitch(item?: BattleItemType | null): void;
  applyBattleFire(input: { angle: number; power: number; weapon: WeaponType; turnDelay?: number; item?: BattleItemType | null }): void;
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
  turnDurationMode: defaultTurnDurationMode,
  seedText: "gunbound-local",
  soloBot: false
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
    turnElapsed: 0,
    turnDelays: createInitialTurnDelays(),
    turnMoveRemaining: createPlaceholderPlayers(defaultSetup)[0].mobile.moveRange,
    battleItemInventories: createBattleItemInventories(),
    selectedBattleItems: [null, null],
    phaseTimer: getPhaseDuration("move"),
    phaseDuration: getPhaseDuration("move"),
    bonusBoxes: [],
    explosionVisual: null,
    explosionVisuals: [],
    damagePopups: [],
    turnAnnouncement: null,
    history: [],
    message: "Set up a local match.",
    input: {
      aimUp: false,
      aimDown: false,
      moveLeft: false,
      moveRight: false
    },
    randomState: normalizeSeed(defaultSetup.seedText),
    setup: defaultSetup,
    resolveTimer: 0,
    moveRepeatTimer: 0,
    startMatch: function startMatch(config: MatchConfig): void {
      resetHistoryEventCounter();
      const startedMatchState = createStartedMatchState(config);

      set({
        ...startedMatchState,
        input: {
          aimUp: false,
          aimDown: false,
          moveLeft: false,
          moveRight: false
        },
        setup: config
      });
    },
    restartMatch: function restartMatch(): void {
      get().startMatch(get().setup);
    },
    returnToSetup: function returnToSetup(): void {
      resetHistoryEventCounter();
      set({
        scene: "start",
        phase: "move",
        projectile: null,
        charging: false,
        power: 0,
        turnElapsed: 0,
        turnDelays: createInitialTurnDelays(),
        turnMoveRemaining: get().players[0].mobile.moveRange,
        battleItemInventories: createBattleItemInventories(),
        selectedBattleItems: [null, null],
        winner: null,
        round: 1,
        targetScore: defaultTargetScore,
        suddenDeathTurn: defaultSuddenDeathTurn,
        suddenDeathActive: false,
        phaseTimer: getPhaseDuration("move"),
        phaseDuration: getPhaseDuration("move"),
        explosionVisual: null,
        explosionVisuals: [],
        damagePopups: [],
        turnAnnouncement: null,
        history: [],
        message: "Set up a local match.",
        moveRepeatTimer: 0
      });
    },
    surrenderMatch: function surrenderMatch(loser: 1 | 2): void {
      const state = get();
      if (state.scene !== "playing") return;

      const winner = loser === 1 ? 2 : 1;
      const players = clonePlayers(state.players);
      players[winner - 1].score = Math.max(players[winner - 1].score, state.targetScore);

      set({
        scene: "end",
        phase: "end",
        players,
        projectile: null,
        power: 0,
        charging: false,
        winner,
        phaseTimer: 0,
        phaseDuration: 0,
        explosionVisual: null,
        explosionVisuals: [],
        damagePopups: [],
        turnAnnouncement: null,
        history: appendMatchEventEntries(state.history, [
          {
            round: state.round,
            turn: loser,
            kind: "round-end",
            text: players[loser - 1].name + " surrendered. " + players[winner - 1].name + " wins the match."
          }
        ]),
        message: players[loser - 1].name + " surrendered. " + players[winner - 1].name + " wins.",
        resolveTimer: 0
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
      let nextTurnElapsed = state.turnElapsed;
      let nextTurnDelays = state.turnDelays;
      let nextTurnMoveRemaining = state.turnMoveRemaining;
      let nextBattleItemInventories = cloneBattleItemInventories(state.battleItemInventories);
      let nextSelectedBattleItems: [BattleItemType | null, BattleItemType | null] = [
        state.selectedBattleItems[0],
        state.selectedBattleItems[1]
      ];
      let nextMessage = state.message;
      let nextResolveTimer = state.resolveTimer;
      let nextTerrain = state.terrain;
      let nextPhaseTimer = state.phaseTimer;
      let nextPhaseDuration = state.phaseDuration;
      let nextBonusBoxes = tickBonusBoxes(state.bonusBoxes, state.terrain, dt);
      let nextExplosionVisual = tickExplosionVisual(state.explosionVisual, dt);
      let nextExplosionVisuals = tickExplosionVisuals(state.explosionVisuals, dt);
      let nextDamagePopups = tickDamagePopups(state.damagePopups, dt);
      let nextTurnAnnouncement = tickTurnAnnouncement(state.turnAnnouncement, dt);
      let nextHistory = state.history;
      let nextMoveRepeatTimer = state.moveRepeatTimer;
      let shouldAdvanceTurn = false;
      let waitingForSettling = false;

      if (state.phase !== "resolve" && state.phase !== "end") {
        if (state.projectile === null) {
          nextTurnElapsed += dt;
        }

        const moveDirection = state.input.moveLeft ? -1 : state.input.moveRight ? 1 : 0;
        if (moveDirection !== 0 && state.phase !== "fire") {
          nextMoveRepeatTimer += dt;
          if (nextMoveRepeatTimer >= 0.12 && nextTerrain !== null) {
            nextMoveRepeatTimer = 0;
            const moved = applyMoveInput(nextPlayers, state.turn, nextTerrain, moveDirection, nextTurnMoveRemaining);
            nextPlayers = moved.players;
            nextTurnMoveRemaining = moved.turnMoveRemaining;

            if (moved.moved) {
              const pickupResult = pickupBonusBoxes(nextPlayers, state.turn, nextBonusBoxes);
              nextPlayers = pickupResult.players;
              nextBonusBoxes = pickupResult.bonusBoxes;
              nextHistory = appendMatchEventEntries(nextHistory, [
                {
                  round: state.round,
                  turn: state.turn,
                  kind: "move",
                  text: nextPlayers[state.turn - 1].name + " moved to x " + String(Math.round(nextPlayers[state.turn - 1].mobile.position.x)) + "."
                }
              ]);
              nextMessage =
                nextTurnMoveRemaining > 0
                  ? nextPlayers[state.turn - 1].name + " moved. " + String(Math.round(nextTurnMoveRemaining)) + " movement left."
                  : nextPlayers[state.turn - 1].name + " used all movement and can still fire.";
            }
          }
        } else {
          nextMoveRepeatTimer = 0;
        }

        nextPlayers = applyAimInput(nextPlayers, state.turn, state.input, dt);
        if (nextPlayers[state.turn - 1].mobile.angle !== state.players[state.turn - 1].mobile.angle && state.phase === "move") {
          nextPhase = "aim";
          nextPhaseTimer = getPhaseDuration("aim", state.setup.turnDurationMode);
          nextPhaseDuration = getPhaseDuration("aim", state.setup.turnDurationMode);
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
          const visual = createExplosionVisual(step.bonusExplosion);
          nextExplosionVisual = visual;
          nextExplosionVisuals = nextExplosionVisuals.concat(visual);
        }

        if (step.explosion !== null) {
          const explosions = buildExplosionList(step.explosion);
          const explosionVisuals: ExplosionVisual[] = [];

          for (const explosion of explosions) {
            nextTerrain = carveCrater(nextTerrain, explosion.point, explosion.radius);
            const explosionResult = applyExplosion(nextPlayers, explosion, state.round, state.turn);
            nextPlayers = markPlayersForFalling(explosionResult.players);
            nextDamagePopups = nextDamagePopups.concat(explosionResult.damagePopups);
            nextHistory = appendHistory(nextHistory, explosionResult.history);
            explosionVisuals.push(createExplosionVisual(explosion));
          }

          if (explosionVisuals.length > 0) {
            nextExplosionVisual = explosionVisuals[0];
            nextExplosionVisuals = nextExplosionVisuals.concat(explosionVisuals);
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

        if (nextWinner === null) {
          const gravityWinner = getRoundWinner(nextPlayers);
          if (gravityWinner !== null) {
            const resolution = resolveRoundWinner(nextPlayers, gravityWinner, state.round, state.turn, nextHistory);
            nextPlayers = resolution.players;
            nextHistory = resolution.history;
            nextWinner = gravityWinner;
            nextPhase = "end";
            nextPhaseTimer = 2.2;
            nextPhaseDuration = 2.2;
            nextMessage = resolution.message;
            waitingForSettling = false;
          }
        }
      }

      if (state.phase !== "end" && nextPhaseTimer <= 0) {
        if (nextCharging && state.terrain !== null) {
          const activeItem = getUsableBattleItem(nextBattleItemInventories[state.turn - 1], nextSelectedBattleItems[state.turn - 1]);
          const fired = forceReleaseCharge(nextPlayers, state.turn, state.turnCount, nextPower, nextTurnElapsed, activeItem);
          nextPlayers = fired.players;
          nextProjectile = fired.projectile;
          nextPower = fired.power;
          nextTurnDelays = applyTurnDelay(nextTurnDelays, state.turn, fired.turnDelay);
          nextBattleItemInventories[state.turn - 1] = consumeBattleItem(nextBattleItemInventories[state.turn - 1], activeItem);
          nextSelectedBattleItems[state.turn - 1] = null;
          nextCharging = false;
          nextPhase = "fire";
          nextMessage = fired.message;
          nextPhaseTimer = getPhaseDuration("fire", state.setup.turnDurationMode);
          nextPhaseDuration = getPhaseDuration("fire", state.setup.turnDurationMode);
          nextHistory = appendMatchEventEntries(nextHistory, [
            {
              round: state.round,
              turn: state.turn,
              kind: "shot",
              text:
                fired.players[state.turn - 1].name +
                " auto-fired " +
                getWeaponDisplayName(fired.players[state.turn - 1].mobile.type, fired.players[state.turn - 1].mobile.weapon) +
                getBattleItemShotSuffix(fired.item) +
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
        const advanced = advanceRoundTurn(nextPlayers, nextTerrain, state.round, state.turn, state.randomState, state.turnCount, state.suddenDeathTurn, nextBonusBoxes, nextTurnDelays);
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
            turnElapsed: 0,
            turnDelays: advanced.turnDelays,
            turnMoveRemaining: advanced.players[advanced.turn - 1].mobile.moveRange,
            battleItemInventories: nextBattleItemInventories,
            selectedBattleItems: nextSelectedBattleItems,
            phaseTimer: 2.2,
            phaseDuration: 2.2,
            tick: state.tick + 1,
            bonusBoxes: advanced.bonusBoxes,
            explosionVisual: nextExplosionVisual,
            explosionVisuals: nextExplosionVisuals,
            damagePopups: nextDamagePopups,
            turnAnnouncement: null,
            history: resolution.history,
            message: resolution.message,
            randomState: advanced.randomState,
            resolveTimer: 0,
            moveRepeatTimer: 0,
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
          turnElapsed: 0,
          turnDelays: advanced.turnDelays,
          turnMoveRemaining: advanced.players[advanced.turn - 1].mobile.moveRange,
          battleItemInventories: nextBattleItemInventories,
          selectedBattleItems: nextSelectedBattleItems,
          phaseTimer: getPhaseDuration("move", state.setup.turnDurationMode),
          phaseDuration: getPhaseDuration("move", state.setup.turnDurationMode),
          tick: state.tick + 1,
          bonusBoxes: advanced.bonusBoxes,
          explosionVisual: nextExplosionVisual,
          explosionVisuals: nextExplosionVisuals,
          damagePopups: nextDamagePopups,
          turnAnnouncement: createTurnAnnouncement(advanced.turn, advanced.players[advanced.turn - 1].name),
          history: nextHistory,
          message: advanced.message,
          randomState: advanced.randomState,
          resolveTimer: 0,
          moveRepeatTimer: 0,
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
        turnElapsed: nextTurnElapsed,
        turnDelays: nextTurnDelays,
        turnMoveRemaining: nextTurnMoveRemaining,
        battleItemInventories: nextBattleItemInventories,
        selectedBattleItems: nextSelectedBattleItems,
        phaseTimer: nextPhaseTimer,
        phaseDuration: nextPhaseDuration,
        explosionVisual: nextExplosionVisual,
        explosionVisuals: nextExplosionVisuals,
        damagePopups: nextDamagePopups,
        turnAnnouncement: nextTurnAnnouncement,
        history: nextHistory,
        message: nextMessage,
        resolveTimer: nextResolveTimer,
        moveRepeatTimer: nextMoveRepeatTimer,
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
            aimDown: current.aimDown,
            moveLeft: current.moveLeft,
            moveRight: current.moveRight
          }
        });
        return;
      }

      set({
        input: {
          aimUp: current.aimUp,
          aimDown: active,
          moveLeft: current.moveLeft,
          moveRight: current.moveRight
        }
      });
    },
    setMoveKey: function setMoveKey(direction: -1 | 1, active: boolean): void {
      const current = get().input;
      if (direction === -1) {
        set({
          input: {
            aimUp: current.aimUp,
            aimDown: current.aimDown,
            moveLeft: active,
            moveRight: current.moveRight
          }
        });
        return;
      }

      set({
        input: {
          aimUp: current.aimUp,
          aimDown: current.aimDown,
          moveLeft: current.moveLeft,
          moveRight: active
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
        phaseTimer: getPhaseDuration("fire", state.setup.turnDurationMode),
        phaseDuration: getPhaseDuration("fire", state.setup.turnDurationMode),
        message: currentPlayer.name + " is charging."
      });
    },
    releaseCharge: function releaseCharge(): void {
      const state = get();
      fireCurrentShot(state, set, {
        angle: state.players[state.turn - 1].mobile.angle,
        power: state.power,
        weapon: state.players[state.turn - 1].mobile.weapon
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

      if (state.turnMoveRemaining <= 0) {
        return;
      }

      const moved = applyMoveInput(state.players, state.turn, state.terrain, direction, state.turnMoveRemaining);
      if (!moved.moved) {
        return;
      }

      const players = moved.players;
      const currentPlayer = players[state.turn - 1];

      const pickupResult = pickupBonusBoxes(players, state.turn, state.bonusBoxes);
      const pickupHistory = createPickupHistory(state.round, state.turn, players[state.turn - 1], state.bonusBoxes, pickupResult.bonusBoxes);

      set({
        players: pickupResult.players,
        bonusBoxes: pickupResult.bonusBoxes,
        turnMoveRemaining: moved.turnMoveRemaining,
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
        message:
          moved.turnMoveRemaining > 0
            ? currentPlayer.name + " moved. " + String(Math.round(moved.turnMoveRemaining)) + " movement left."
            : currentPlayer.name + " used all movement and can still fire."
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
      let nextWeapon = getNextWeapon(currentPlayer.mobile.weapon);

      if (!canSelectWeapon(nextWeapon, currentPlayer.mobile.specialCharges, state.turnCount)) {
        nextWeapon = getNextWeapon(nextWeapon);
        if (!canSelectWeapon(nextWeapon, currentPlayer.mobile.specialCharges, state.turnCount)) {
          return;
        }
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
    },
    switchBattleItem: function switchBattleItem(): void {
      const state = get();
      if (state.scene !== "playing" || state.projectile !== null || state.charging) {
        return;
      }

      if (state.phase === "resolve" || state.phase === "end" || state.phase === "fire") {
        return;
      }

      const currentInventory = state.battleItemInventories[state.turn - 1];
      const nextItem = getNextAvailableBattleItem(currentInventory, state.selectedBattleItems[state.turn - 1]);
      const selectedBattleItems: [BattleItemType | null, BattleItemType | null] = [
        state.selectedBattleItems[0],
        state.selectedBattleItems[1]
      ];
      selectedBattleItems[state.turn - 1] = nextItem;

      const currentPlayer = state.players[state.turn - 1];
      const itemLabel = nextItem === null ? "no item" : getBattleItemDisplayName(nextItem);

      set({
        selectedBattleItems,
        history: appendMatchEventEntries(state.history, [
          {
            round: state.round,
            turn: state.turn,
            kind: "bonus",
            text: currentPlayer.name + " selected " + itemLabel + "."
          }
        ]),
        message: currentPlayer.name + " selected " + itemLabel + "."
      });
    },
    applyBattleMove: function applyBattleMove(direction: -1 | 1): void {
      get().attemptMove(direction);
    },
    applyBattleWeaponSwitch: function applyBattleWeaponSwitch(weapon?: WeaponType): void {
      if (weapon === undefined) {
        get().switchWeapon();
        return;
      }

      const state = get();
      if (state.scene !== "playing" || state.projectile !== null || state.charging) {
        return;
      }
      if (state.phase === "resolve" || state.phase === "end" || state.phase === "fire") {
        return;
      }

      const players = clonePlayers(state.players);
      const currentPlayer = players[state.turn - 1];
      if (currentPlayer.mobile.weapon === weapon) return;
      if (!canSelectWeapon(weapon, currentPlayer.mobile.specialCharges, state.turnCount)) {
        return;
      }
      currentPlayer.mobile.weapon = weapon;

      set({
        players,
        history: appendMatchEventEntries(state.history, [
          {
            round: state.round,
            turn: state.turn,
            kind: "weapon-switch",
            text: currentPlayer.name + " selected " + getWeaponDisplayName(currentPlayer.mobile.type, weapon) + "."
          }
        ]),
        message: currentPlayer.name + " selected " + weapon + "."
      });
    },
    applyBattleItemSwitch: function applyBattleItemSwitch(item?: BattleItemType | null): void {
      if (item === undefined) {
        get().switchBattleItem();
        return;
      }

      const state = get();
      if (state.scene !== "playing" || state.projectile !== null || state.charging) {
        return;
      }

      if (state.phase === "resolve" || state.phase === "end" || state.phase === "fire") {
        return;
      }

      if (item !== null && !hasBattleItem(state.battleItemInventories[state.turn - 1], item)) {
        return;
      }

      const selectedBattleItems: [BattleItemType | null, BattleItemType | null] = [
        state.selectedBattleItems[0],
        state.selectedBattleItems[1]
      ];
      selectedBattleItems[state.turn - 1] = item;
      const currentPlayer = state.players[state.turn - 1];
      const itemLabel = item === null ? "no item" : getBattleItemDisplayName(item);

      set({
        selectedBattleItems,
        history: appendMatchEventEntries(state.history, [
          {
            round: state.round,
            turn: state.turn,
            kind: "bonus",
            text: currentPlayer.name + " selected " + itemLabel + "."
          }
        ]),
        message: currentPlayer.name + " selected " + itemLabel + "."
      });
    },
    applyBattleFire: function applyBattleFire(input: { angle: number; power: number; weapon: WeaponType; turnDelay?: number; item?: BattleItemType | null }): void {
      fireCurrentShot(get(), set, input);
    }
  };
}

function fireCurrentShot(
  state: GameStoreState,
  set: Parameters<StateCreator<GameStoreState>>[0],
  input: { angle: number; power: number; weapon: WeaponType; turnDelay?: number; item?: BattleItemType | null }
): void {
  if (state.scene !== "playing" || state.terrain === null) {
    return;
  }
  if (state.projectile !== null || state.phase === "resolve" || state.phase === "end") {
    return;
  }

  const players = clonePlayers(state.players);
  const currentPlayer = players[state.turn - 1];
  currentPlayer.mobile.angle = clamp(input.angle, 16, 84);
  currentPlayer.mobile.weapon = input.weapon;

  const power = clamp(input.power, 0.08, 1);
  const requestedItem = input.item === undefined ? state.selectedBattleItems[state.turn - 1] : input.item;
  const activeItem = getUsableBattleItem(state.battleItemInventories[state.turn - 1], requestedItem);
  const projectile = createProjectile(currentPlayer.mobile, state.turn, power, activeItem);
  const turnDelay = input.turnDelay ?? calculateShotDelay(currentPlayer.mobile, currentPlayer.mobile.weapon, state.turnElapsed) + getBattleItemDelay(activeItem);
  const shouldConsumeCharge = shouldConsumeSpecialCharge(currentPlayer.mobile.weapon, currentPlayer.mobile.specialCharges, state.turnCount);
  const battleItemInventories = cloneBattleItemInventories(state.battleItemInventories);
  const selectedBattleItems: [BattleItemType | null, BattleItemType | null] = [
    state.selectedBattleItems[0],
    state.selectedBattleItems[1]
  ];

  if (shouldConsumeCharge) {
    currentPlayer.mobile.specialCharges -= 1;
  }
  battleItemInventories[state.turn - 1] = consumeBattleItem(battleItemInventories[state.turn - 1], activeItem);
  selectedBattleItems[state.turn - 1] = null;

  set({
    players,
    charging: false,
    projectile,
    power,
    turnDelays: applyTurnDelay(state.turnDelays, state.turn, turnDelay),
    battleItemInventories,
    selectedBattleItems,
    input: {
      aimUp: false,
      aimDown: false,
      moveLeft: false,
      moveRight: false
    },
    phase: "fire",
    phaseTimer: getPhaseDuration("fire", state.setup.turnDurationMode),
    phaseDuration: getPhaseDuration("fire", state.setup.turnDurationMode),
    history: appendMatchEventEntries(state.history, [
      {
        round: state.round,
        turn: state.turn,
        kind: "shot",
        text: currentPlayer.name + " fired " + getWeaponDisplayName(currentPlayer.mobile.type, currentPlayer.mobile.weapon) + getBattleItemShotSuffix(activeItem) + "."
      }
    ]),
    message: currentPlayer.name + " fired."
  });
}

function applyMoveInput(
  players: [Player, Player],
  turn: 1 | 2,
  terrain: TerrainState,
  direction: -1 | 1,
  turnMoveRemaining: number
): {
  players: [Player, Player];
  turnMoveRemaining: number;
  moved: boolean;
} {
  if (turnMoveRemaining <= 0) {
    return { players, turnMoveRemaining, moved: false };
  }

  const nextPlayers = clonePlayers(players);
  const currentPlayer = nextPlayers[turn - 1];
  const otherPlayer = nextPlayers[turn === 1 ? 1 : 0];
  const moveDistance = Math.min(12, turnMoveRemaining);
  const moveResult = moveMobileAlongTerrain(currentPlayer.mobile, terrain, direction, otherPlayer.mobile, moveDistance);

  if (!moveResult.moved) {
    return { players, turnMoveRemaining, moved: false };
  }

  currentPlayer.mobile = moveResult.mobile;
  nextPlayers[0].mobile.facing = nextPlayers[0].mobile.position.x <= nextPlayers[1].mobile.position.x ? 1 : -1;
  nextPlayers[1].mobile.facing = nextPlayers[1].mobile.position.x <= nextPlayers[0].mobile.position.x ? 1 : -1;

  return {
    players: nextPlayers,
    turnMoveRemaining: Math.max(0, turnMoveRemaining - moveResult.distanceMoved),
    moved: true
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

function cloneBattleItemInventories(inventories: [BattleItemInventory, BattleItemInventory]): [BattleItemInventory, BattleItemInventory] {
  return [
    { ...inventories[0] },
    { ...inventories[1] }
  ];
}

function getUsableBattleItem(inventory: BattleItemInventory, item: BattleItemType | null): BattleItemType | null {
  return hasBattleItem(inventory, item) ? item : null;
}

function getBattleItemShotSuffix(item: BattleItemType | null): string {
  if (item === null) {
    return "";
  }

  return " with " + getBattleItemDisplayName(item);
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
  power: number,
  turnElapsed: number,
  item: BattleItemType | null
): {
  players: [Player, Player];
  projectile: ReturnType<typeof createProjectile>;
  power: number;
  turnDelay: number;
  item: BattleItemType | null;
  message: string;
} {
  const nextPlayers = clonePlayers(players);
  const currentPlayer = nextPlayers[turn - 1];
  const nextPower = clamp(power, 0.08, 1);
  const projectile = createProjectile(currentPlayer.mobile, turn, nextPower, item);
  const turnDelay = calculateShotDelay(currentPlayer.mobile, currentPlayer.mobile.weapon, turnElapsed) + getBattleItemDelay(item);
  const shouldConsumeCharge = shouldConsumeSpecialCharge(currentPlayer.mobile.weapon, currentPlayer.mobile.specialCharges, turnCount);

  if (shouldConsumeCharge) {
    currentPlayer.mobile.specialCharges -= 1;
  }

  return {
    players: nextPlayers,
    projectile,
    power: nextPower,
    turnDelay,
    item,
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
  if (explosion.mobileType === "mage" && explosion.weapon !== "primary") {
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

function tickExplosionVisuals(explosionVisuals: ExplosionVisual[], dt: number): ExplosionVisual[] {
  const nextVisuals: ExplosionVisual[] = [];
  let index = 0;

  while (index < explosionVisuals.length) {
    const visual = tickExplosionVisual(explosionVisuals[index], dt);
    if (visual !== null) {
      nextVisuals.push(visual);
    }
    index += 1;
  }

  return nextVisuals;
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
