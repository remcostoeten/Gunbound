import { useGameStore } from "@/features/game/store/game-store";

type GameStoreState = ReturnType<typeof useGameStore.getState>;

export function selectPlayers(state: GameStoreState) {
  return state.players;
}

export function selectTurn(state: GameStoreState) {
  return state.turn;
}

export function selectWind(state: GameStoreState) {
  return state.wind;
}

export function selectPhase(state: GameStoreState) {
  return state.phase;
}

export function selectPhaseTimer(state: GameStoreState) {
  return state.phaseTimer;
}

export function selectPhaseDuration(state: GameStoreState) {
  return state.phaseDuration;
}

export function selectTurnCount(state: GameStoreState) {
  return state.turnCount;
}

export function selectBonusBoxes(state: GameStoreState) {
  return state.bonusBoxes;
}

export function selectPower(state: GameStoreState) {
  return state.power;
}

export function selectCharging(state: GameStoreState) {
  return state.charging;
}

export function selectTurnAnnouncement(state: GameStoreState) {
  return state.turnAnnouncement;
}
