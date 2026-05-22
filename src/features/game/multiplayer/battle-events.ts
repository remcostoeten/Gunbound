"use client";

import type { WeaponType } from "@/features/game/types/shared";

export const BATTLE_EVENT_KIND = {
  MOVE: "battle_move",
  SWITCH_WEAPON: "battle_switch_weapon",
  FIRE: "battle_fire",
  SURRENDER: "battle_surrender",
} as const;

export type BattleEventKind =
  (typeof BATTLE_EVENT_KIND)[keyof typeof BATTLE_EVENT_KIND];

export type BattleMovePayload = {
  v: 1;
  turn: 1 | 2;
  direction: -1 | 1;
};

export type BattleSwitchWeaponPayload = {
  v: 1;
  turn: 1 | 2;
  weapon: WeaponType;
};

export type BattleFirePayload = {
  v: 1;
  turn: 1 | 2;
  angle: number;
  power: number;
  weapon: WeaponType;
};

export type BattleSurrenderPayload = {
  v: 1;
  turn: 1 | 2;
};

export type BattleEventPayload =
  | BattleMovePayload
  | BattleSwitchWeaponPayload
  | BattleFirePayload
  | BattleSurrenderPayload;

export function parseBattleEventPayload(
  kind: string,
  payload: string,
): BattleEventPayload | undefined {
  try {
    const value = JSON.parse(payload) as unknown;
    if (!isRecord(value)) return undefined;
    if (value.v !== 1) return undefined;

    if (kind === BATTLE_EVENT_KIND.MOVE) {
      if (!isTurn(value.turn)) return undefined;
      if (value.direction !== -1 && value.direction !== 1) return undefined;
      return { v: 1, turn: value.turn, direction: value.direction };
    }

    if (kind === BATTLE_EVENT_KIND.SWITCH_WEAPON) {
      if (!isTurn(value.turn)) return undefined;
      if (!isWeapon(value.weapon)) return undefined;
      return { v: 1, turn: value.turn, weapon: value.weapon };
    }

    if (kind === BATTLE_EVENT_KIND.FIRE) {
      if (!isTurn(value.turn)) return undefined;
      if (!isWeapon(value.weapon)) return undefined;
      if (typeof value.angle !== "number" || !Number.isFinite(value.angle)) {
        return undefined;
      }
      if (typeof value.power !== "number" || !Number.isFinite(value.power)) {
        return undefined;
      }
      return {
        v: 1,
        turn: value.turn,
        angle: value.angle,
        power: value.power,
        weapon: value.weapon,
      };
    }

    if (kind === BATTLE_EVENT_KIND.SURRENDER) {
      if (!isTurn(value.turn)) return undefined;
      return { v: 1, turn: value.turn };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTurn(value: unknown): value is 1 | 2 {
  return value === 1 || value === 2;
}

function isWeapon(value: unknown): value is WeaponType {
  return value === "primary" || value === "secondary";
}
