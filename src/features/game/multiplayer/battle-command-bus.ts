"use client";

export type BattleInputCommand =
  | { kind: "aim"; key: "up" | "down"; active: boolean }
  | { kind: "move"; direction: -1 | 1 }
  | { kind: "flip-tech"; direction: -1 | 1 }
  | { kind: "switch-weapon" }
  | { kind: "switch-item" }
  | { kind: "begin-charge" }
  | { kind: "release-charge" };

type BattleInputHandler = {
  (command: BattleInputCommand): boolean;
};

let activeHandler: BattleInputHandler | null = null;

export function setBattleInputHandler(handler: BattleInputHandler | null): void {
  activeHandler = handler;
}

export function dispatchBattleInputCommand(command: BattleInputCommand): boolean {
  return activeHandler?.(command) ?? false;
}
