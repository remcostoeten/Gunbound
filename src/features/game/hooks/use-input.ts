"use client";

import { useEffect } from "react";
import { canTriggerButtShot } from "@/features/game/engine/shot-techniques";
import { useGameStore } from "@/features/game/store/game-store";
import { dispatchBattleInputCommand } from "@/features/game/multiplayer/battle-command-bus";

export function useInput(): void {
  useEffect(bindInput, []);
}

type CleanupHandler = {
  (): void;
};

function bindInput(): CleanupHandler {
  function handleKeyDown(event: KeyboardEvent): void {
    const store = useGameStore.getState();
    if (store.scene !== "playing" || isEditableTarget(event.target)) {
      return;
    }

    if (event.code === "ArrowUp") {
      event.preventDefault();
      if (dispatchBattleInputCommand({ kind: "aim", key: "up", active: true })) return;
      store.setAimKey("up", true);
      return;
    }

    if (event.code === "ArrowDown") {
      event.preventDefault();
      if (dispatchBattleInputCommand({ kind: "aim", key: "down", active: true })) return;
      store.setAimKey("down", true);
      return;
    }

    if (event.code === "KeyA") {
      event.preventDefault();
      if (event.repeat) return;
      if (canTriggerButtShot(store.pendingButtShot, -1)) {
        if (dispatchBattleInputCommand({ kind: "flip-tech", direction: -1 })) return;
        store.applyBattleFlipTech(-1);
        return;
      }
      if (store.phase === "fire" || store.projectile !== null) return;
      if (dispatchBattleInputCommand({ kind: "move", direction: -1 })) return;
      store.setMoveKey(-1, true);
      return;
    }

    if (event.code === "KeyD") {
      event.preventDefault();
      if (event.repeat) return;
      if (canTriggerButtShot(store.pendingButtShot, 1)) {
        if (dispatchBattleInputCommand({ kind: "flip-tech", direction: 1 })) return;
        store.applyBattleFlipTech(1);
        return;
      }
      if (store.phase === "fire" || store.projectile !== null) return;
      if (dispatchBattleInputCommand({ kind: "move", direction: 1 })) return;
      store.setMoveKey(1, true);
      return;
    }

    if (event.code === "KeyQ" && !event.repeat) {
      event.preventDefault();
      if (dispatchBattleInputCommand({ kind: "switch-weapon" })) return;
      store.switchWeapon();
      return;
    }

    if (event.code === "KeyE" && !event.repeat) {
      event.preventDefault();
      if (dispatchBattleInputCommand({ kind: "switch-item" })) return;
      store.switchBattleItem();
      return;
    }

    if (event.code === "Space" && !event.repeat) {
      event.preventDefault();
      if (dispatchBattleInputCommand({ kind: "begin-charge" })) return;
      store.beginCharge();
    }
  }

  function handleKeyUp(event: KeyboardEvent): void {
    const store = useGameStore.getState();
    if (store.scene !== "playing" || isEditableTarget(event.target)) {
      return;
    }

    if (event.code === "ArrowUp") {
      event.preventDefault();
      if (dispatchBattleInputCommand({ kind: "aim", key: "up", active: false })) return;
      store.setAimKey("up", false);
      return;
    }

    if (event.code === "ArrowDown") {
      event.preventDefault();
      if (dispatchBattleInputCommand({ kind: "aim", key: "down", active: false })) return;
      store.setAimKey("down", false);
      return;
    }

    if (event.code === "KeyA") {
      event.preventDefault();
    if (event.code === "KeyA") {
      event.preventDefault();
      store.setMoveKey(-1, false);
      return;
    }

    if (event.code === "KeyD") {
      event.preventDefault();
      store.setMoveKey(1, false);
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      if (dispatchBattleInputCommand({ kind: "release-charge" })) return;
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

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || tagName === "button" || tagName === "a";
}
