import type { GamePhase, TurnDurationMode } from "@/features/game/types/shared";

export const defaultTargetScore = 2;
export const defaultRoundLimit = 5;
export const defaultSuddenDeathTurn = 12;
export const defaultTurnDurationMode: TurnDurationMode = "timed";
export const minAimAngle = 16;
export const maxAimAngle = 164;

export const phaseDurations: Readonly<Record<GamePhase, number>> = {
  move: 12,
  aim: 10,
  fire: 8,
  resolve: 1.2,
  end: 0
};

export function getPhaseDuration(phase: GamePhase, turnDurationMode: TurnDurationMode = defaultTurnDurationMode): number {
  if (turnDurationMode === "infinite" && isPlayerDecisionPhase(phase)) {
    return Infinity;
  }

  return phaseDurations[phase];
}

export function isPlayerDecisionPhase(phase: GamePhase): boolean {
  return phase === "move" || phase === "aim" || phase === "fire";
}
