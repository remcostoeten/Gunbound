import { useGameStore } from "@/features/game/store/game-store";

type GameStoreState = ReturnType<typeof useGameStore.getState>;

export function selectScene(state: GameStoreState) {
  return state.scene;
}

export function selectPlayers(state: GameStoreState) {
  return state.players;
}

export function selectWinner(state: GameStoreState) {
  return state.winner;
}

export function selectMessage(state: GameStoreState) {
  return state.message;
}

export function selectSetup(state: GameStoreState) {
  return state.setup;
}

export function selectStartMatch(state: GameStoreState) {
  return state.startMatch;
}

export function selectRestartMatch(state: GameStoreState) {
  return state.restartMatch;
}

export function selectReturnToSetup(state: GameStoreState) {
  return state.returnToSetup;
}

export function selectSurrenderMatch(state: GameStoreState) {
  return state.surrenderMatch;
}
