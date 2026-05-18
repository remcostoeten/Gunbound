"use client";

import { useEffect } from "react";
import { useGameStore } from "@/features/game/store/game-store";

export function useInput(): void {
  useEffect(bindInput, []);
}

type CleanupHandler = {
  (): void;
};

function bindInput(): CleanupHandler {
  function handleKeyDown(event: KeyboardEvent): void {
    const store = useGameStore.getState();

    if (event.code === "ArrowUp") {
      event.preventDefault();
      store.setAimKey("up", true);
      return;
    }

    if (event.code === "ArrowDown") {
      event.preventDefault();
      store.setAimKey("down", true);
      return;
    }

    if (event.code === "KeyA" && !event.repeat) {
      event.preventDefault();
      store.attemptMove(-1);
      return;
    }

    if (event.code === "KeyD" && !event.repeat) {
      event.preventDefault();
      store.attemptMove(1);
      return;
    }

    if (event.code === "KeyQ" && !event.repeat) {
      event.preventDefault();
      store.switchWeapon();
      return;
    }

    if (event.code === "Space" && !event.repeat) {
      event.preventDefault();
      store.beginCharge();
    }
  }

  function handleKeyUp(event: KeyboardEvent): void {
    const store = useGameStore.getState();

    if (event.code === "ArrowUp") {
      event.preventDefault();
      store.setAimKey("up", false);
      return;
    }

    if (event.code === "ArrowDown") {
      event.preventDefault();
      store.setAimKey("down", false);
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      store.releaseCharge();
    }
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  return function cleanup(): void {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  };
}
