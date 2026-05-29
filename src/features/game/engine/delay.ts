import type { Mobile } from "@/features/game/types/entities";
import type { PlayerId, WeaponType } from "@/features/game/types/shared";

export type TurnDelayQueue = [number, number];

const primaryShotDelay = 760;
const secondaryShotDelay = 910;
const ssShotDelay = 1280;
const elapsedSecondDelay = 10;

export function createInitialTurnDelays(): TurnDelayQueue {
  return [0, 0];
}

export function calculateShotDelay(mobile: Mobile, weapon: WeaponType, elapsedSeconds: number): number {
  const weaponDelay = getWeaponDelay(weapon);
  const mobileDelay = Math.round(weaponDelay * mobile.shotDelay);
  const elapsedDelay = Math.max(0, Math.floor(elapsedSeconds)) * elapsedSecondDelay;

  return mobileDelay + elapsedDelay;
}

function getWeaponDelay(weapon: WeaponType): number {
  if (weapon === "primary") {
    return primaryShotDelay;
  }

  if (weapon === "secondary") {
    return secondaryShotDelay;
  }

  return ssShotDelay;
}

export function applyTurnDelay(queue: TurnDelayQueue, playerId: PlayerId, delay: number): TurnDelayQueue {
  const nextQueue: TurnDelayQueue = [queue[0], queue[1]];
  nextQueue[playerId - 1] += delay;
  return nextQueue;
}

export function selectNextTurn(queue: TurnDelayQueue, previousTurn: PlayerId, players: [{ mobile: { hp: number } }, { mobile: { hp: number } }]): {
  turn: PlayerId;
  queue: TurnDelayQueue;
} {
  const alivePlayerIds = getAlivePlayerIds(players);
  if (alivePlayerIds.length === 0) {
    return { turn: previousTurn, queue };
  }

  let selected = alivePlayerIds[0];
  for (const playerId of alivePlayerIds) {
    if (queue[playerId - 1] < queue[selected - 1]) {
      selected = playerId;
      continue;
    }

    if (queue[playerId - 1] === queue[selected - 1] && selected === previousTurn && playerId !== previousTurn) {
      selected = playerId;
    }
  }

  const baseline = queue[selected - 1];
  return {
    turn: selected,
    queue: [Math.max(0, queue[0] - baseline), Math.max(0, queue[1] - baseline)]
  };
}

function getAlivePlayerIds(players: [{ mobile: { hp: number } }, { mobile: { hp: number } }]): PlayerId[] {
  const ids: PlayerId[] = [];

  if (players[0].mobile.hp > 0) {
    ids.push(1);
  }

  if (players[1].mobile.hp > 0) {
    ids.push(2);
  }

  return ids;
}
