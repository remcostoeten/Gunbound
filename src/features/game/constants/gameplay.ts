import type { GamePhase } from "@/features/game/types/shared";

export const defaultTargetScore = 2;
export const defaultRoundLimit = 5;
export const defaultSuddenDeathTurn = 12;

export const phaseDurations: Readonly<Record<GamePhase, number>> = {
  move: 12,
  aim: 10,
  fire: 8,
  resolve: 1.2,
  end: 0
};

export function getPhaseDuration(phase: GamePhase): number {
  return phaseDurations[phase];
}
