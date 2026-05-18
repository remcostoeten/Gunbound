"use client";

import { useGameStore } from "@/features/game/store/game-store";

type GameSelector<T> = {
  (state: ReturnType<typeof useGameStore.getState>): T;
};

export function useGameState<T>(selector: GameSelector<T>): T {
  return useGameStore(selector);
}
