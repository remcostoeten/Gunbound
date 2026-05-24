"use client";

import { useEffect, useRef } from "react";
import { stepProjectile, distanceDamage } from "@/features/game/engine/physics";
import { canSelectWeapon } from "@/features/game/engine/weapons";
import { createProjectile } from "@/features/game/factories/create-projectile";
import { setBattleInputHandler } from "@/features/game/multiplayer/battle-command-bus";
import { useGameStore } from "@/features/game/store/game-store";
import type { ProjectileState } from "@/features/game/types/combat";
import type { Mobile, Player, TerrainState } from "@/features/game/types/entities";
import type { GameState } from "@/features/game/types/state";
import type { WeaponType } from "@/features/game/types/shared";

type BotShot = {
  angle: number;
  power: number;
  weapon: WeaponType;
};

type ScoredShot = BotShot & {
  score: number;
};

const BOT_PLAYER_ID = 2;
const HUMAN_PLAYER_ID = 1;
const SIMULATION_STEP_SECONDS = 1 / 45;
const MAX_SIMULATION_STEPS = 360;

export function useSoloBot(enabled: boolean): void {
  const scene = useGameStore((state) => state.scene);
  const turn = useGameStore((state) => state.turn);
  const turnCount = useGameStore((state) => state.turnCount);
  const round = useGameStore((state) => state.round);
  const actionInProgress = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;

    setBattleInputHandler(() => {
      const state = useGameStore.getState();
      return state.scene === "playing" && state.turn === BOT_PLAYER_ID;
    });

    return () => setBattleInputHandler(null);
  }, [enabled]);

  useEffect(() => {
    clearTimers(timers.current);
    actionInProgress.current = false;
  }, [enabled, scene, round]);

  useEffect(() => {
    if (!enabled || actionInProgress.current) return;

    const state = useGameStore.getState();
    if (!canStartBotAction(state)) return;

    actionInProgress.current = true;
    const thinkTimer = window.setTimeout(() => {
      const current = useGameStore.getState();
      if (!canStartBotAction(current)) {
        actionInProgress.current = false;
        return;
      }

      const shot = planBotShot(current);
      if (current.players[BOT_PLAYER_ID - 1].mobile.weapon !== shot.weapon) {
        current.applyBattleWeaponSwitch(shot.weapon);
      }
      useGameStore.getState().beginCharge();

      const chargeTimer = window.setTimeout(() => {
        const firingState = useGameStore.getState();
        if (!canFireBotShot(firingState)) {
          actionInProgress.current = false;
          return;
        }

        firingState.applyBattleFire(shot);
        actionInProgress.current = false;
      }, 520 + shot.power * 950 + randomBetween(0, 420));

      timers.current.push(chargeTimer);
    }, 620 + randomBetween(0, 900));

    timers.current.push(thinkTimer);

    return () => {
      clearTimers(timers.current);
      actionInProgress.current = false;
    };
  }, [enabled, scene, turn, turnCount, round]);
}

function canStartBotAction(state: GameState): boolean {
  return (
    state.scene === "playing" &&
    state.turn === BOT_PLAYER_ID &&
    state.terrain !== null &&
    state.projectile === null &&
    !state.charging &&
    state.phase !== "resolve" &&
    state.phase !== "end" &&
    state.phase !== "fire"
  );
}

function canFireBotShot(state: GameState): boolean {
  return (
    state.scene === "playing" &&
    state.turn === BOT_PLAYER_ID &&
    state.terrain !== null &&
    state.projectile === null &&
    state.phase !== "resolve" &&
    state.phase !== "end"
  );
}

function planBotShot(state: GameState): BotShot {
  const terrain = state.terrain;
  if (terrain === null) {
    return { angle: 45, power: 0.65, weapon: "primary" };
  }

  const weapons: WeaponType[] = ["primary"];
  const botMobile = state.players[BOT_PLAYER_ID - 1].mobile;
  if (canSelectWeapon("secondary", botMobile.specialCharges, state.turnCount)) {
    weapons.push("secondary");
  }
  if (canSelectWeapon("ss", botMobile.specialCharges, state.turnCount)) {
    weapons.push("ss");
  }

  let best: ScoredShot | null = null;
  for (const weapon of weapons) {
    for (let angle = 18; angle <= 82; angle += 4) {
      for (let powerStep = 0; powerStep <= 15; powerStep += 1) {
        const power = 0.25 + powerStep * 0.05;
        const score = scoreShot(state, terrain, angle, power, weapon);
        if (best === null || score > best.score) {
          best = { angle, power, weapon, score };
        }
      }
    }
  }

  if (best === null) {
    return { angle: 45, power: 0.65, weapon: "primary" };
  }

  return softenShot(best, state);
}

function scoreShot(
  state: GameState,
  terrain: TerrainState,
  angle: number,
  power: number,
  weapon: WeaponType,
): number {
  const players = state.players;
  const bot = players[BOT_PLAYER_ID - 1];
  const human = players[HUMAN_PLAYER_ID - 1];
  const mobile = createAimingMobile(bot.mobile, angle, weapon);
  let projectile: ProjectileState | null = createProjectile(mobile, BOT_PLAYER_ID, power);
  let score = -10000;

  for (let step = 0; step < MAX_SIMULATION_STEPS && projectile !== null; step += 1) {
    const result = stepProjectile(
      projectile,
      terrain,
      players,
      state.wind,
      SIMULATION_STEP_SECONDS,
    );

    if (result.explosion !== null) {
      const target = getMobileCenter(human);
      const self = getMobileCenter(bot);
      const damage = distanceDamage(result.explosion, target);
      const selfDamage = distanceDamage(result.explosion, self);
      const missDistance = Math.hypot(
        result.explosion.point.x - target.x,
        result.explosion.point.y - target.y,
      );
      score = damage * 14 - selfDamage * 18 - missDistance * 0.22;
      break;
    }

    projectile = result.projectile;
  }

  return score;
}

function softenShot(shot: ScoredShot, state: GameState): BotShot {
  const distance = Math.abs(
    state.players[BOT_PLAYER_ID - 1].mobile.position.x -
      state.players[HUMAN_PLAYER_ID - 1].mobile.position.x,
  );
  const windPenalty = Math.min(2.5, Math.abs(state.wind.x) * 1.3);
  const distancePenalty = distance > 700 ? 1.4 : distance > 520 ? 0.9 : 0;
  const angleError = randomBetween(-3.6, 3.6) + randomBetween(-windPenalty, windPenalty);
  const powerError = randomBetween(-0.045, 0.045) + randomBetween(-0.01, distancePenalty * 0.012);

  return {
    angle: clamp(shot.angle + angleError, 16, 84),
    power: clamp(shot.power + powerError, 0.12, 1),
    weapon: shot.weapon,
  };
}

function createAimingMobile(mobile: Mobile, angle: number, weapon: WeaponType): Mobile {
  return {
    ...mobile,
    position: { ...mobile.position },
    angle,
    weapon,
  };
}

function getMobileCenter(player: Player): { x: number; y: number } {
  return {
    x: player.mobile.position.x,
    y: player.mobile.position.y - player.mobile.height * 0.55,
  };
}

function clearTimers(timers: number[]): void {
  while (timers.length > 0) {
    const timer = timers.pop();
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
