import { useGameStore } from "@/features/game/store/game-store";

type GameStoreState = ReturnType<typeof useGameStore.getState>;

export function selectHistory(state: GameStoreState) {
  return state.history;
}

export function selectRound(state: GameStoreState) {
  return state.round;
}

export function selectSuddenDeathActive(state: GameStoreState) {
  return state.suddenDeathActive;
}
