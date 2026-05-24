import { getBattleItemDisplayName, getNextAvailableBattleItem, type BattleItemInventory } from "@/features/game/engine/battle-items";
import { canSelectWeapon, getWeaponDisplayName } from "@/features/game/engine/weapons";
import type { Player } from "@/features/game/types/entities";
import type { TurnGuide, TurnGuideCommand, TurnGuidePhaseStep, TurnGuideWeaponSlot } from "@/features/game/types/presentation";
import type { BattleItemType, GamePhase } from "@/features/game/types/shared";

export function createTurnGuide(
  player: Player,
  phase: GamePhase,
  charging: boolean,
  phaseTimer: number,
  power: number,
  turnCount: number,
  turnMoveRemaining: number,
  battleItemInventory: BattleItemInventory,
  selectedBattleItem: BattleItemType | null
): TurnGuide {
  const ssAvailable = canSelectWeapon("ss", player.mobile.specialCharges, turnCount);

  return {
    headline: getTurnGuideHeadline(phase, charging),
    detail: getTurnGuideDetail(player, phase, charging),
    phaseLabel: getTurnGuidePhaseLabel(phase, charging),
    tone: getTurnGuideTone(phase),
    timerLabel: formatTimer(phaseTimer),
    powerPercent: charging ? Math.round(power * 100) : 0,
    commands: createTurnGuideCommands(player, phase, charging, ssAvailable, turnMoveRemaining, battleItemInventory, selectedBattleItem),
    weaponSlots: createTurnGuideWeaponSlots(player, turnCount, ssAvailable),
    phaseSteps: createTurnGuidePhaseSteps(phase)
  };
}

export function getPhaseDisplayLabel(phase: GamePhase): string {
  if (phase === "move") {
    return "Move";
  }

  if (phase === "aim") {
    return "Aim";
  }

  if (phase === "fire") {
    return "Fire";
  }

  if (phase === "resolve") {
    return "Impact";
  }

  return "End";
}

function createTurnGuideCommands(
  player: Player,
  phase: GamePhase,
  charging: boolean,
  ssAvailable: boolean,
  turnMoveRemaining: number,
  battleItemInventory: BattleItemInventory,
  selectedBattleItem: BattleItemType | null
): TurnGuideCommand[] {
  return [
    createTurnGuideCommand("A / D", "Move", getMoveDetailLabel(phase, charging, turnMoveRemaining), getMoveCommandState(phase, charging, turnMoveRemaining)),
    createTurnGuideCommand("Up / Down", "Aim", getAimDetailLabel(phase, charging), getAimCommandState(phase, charging)),
    createTurnGuideCommand("Q", "Shot", getWeaponDetailLabel(player, phase, charging, ssAvailable), getWeaponCommandState(player, phase, charging)),
    createTurnGuideCommand("E", "Item", getItemDetailLabel(phase, charging, battleItemInventory, selectedBattleItem), getItemCommandState(phase, charging, battleItemInventory)),
    createTurnGuideCommand("Space", charging ? "Release" : "Charge", getFireDetailLabel(phase, charging), getFireCommandState(phase, charging))
  ];
}

function createTurnGuideCommand(
  keyLabel: string,
  actionLabel: string,
  detailLabel: string,
  state: TurnGuideCommand["state"]
): TurnGuideCommand {
  return {
    keyLabel,
    actionLabel,
    detailLabel,
    state
  };
}

function createTurnGuideWeaponSlots(
  player: Player,
  turnCount: number,
  ssAvailable: boolean
): TurnGuideWeaponSlot[] {
  const primarySelected = player.mobile.weapon === "primary";
  const secondarySelected = player.mobile.weapon === "secondary";
  const ssSelected = player.mobile.weapon === "ss";

  return [
    {
      slotLabel: "Shot 1",
      mobileType: player.mobile.type,
      weaponType: "primary",
      weaponLabel: getWeaponDisplayName(player.mobile.type, "primary"),
      detailLabel: primarySelected ? "Selected" : "Ready",
      selected: primarySelected,
      available: true
    },
    {
      slotLabel: "Shot 2",
      mobileType: player.mobile.type,
      weaponType: "secondary",
      weaponLabel: getWeaponDisplayName(player.mobile.type, "secondary"),
      detailLabel: secondarySelected ? "Selected" : "Ready",
      selected: secondarySelected,
      available: true
    },
    {
      slotLabel: "SS",
      mobileType: player.mobile.type,
      weaponType: "ss",
      weaponLabel: getWeaponDisplayName(player.mobile.type, "ss"),
      detailLabel: getSsDetailLabel(player.mobile.specialCharges, turnCount, ssAvailable, ssSelected),
      selected: ssSelected,
      available: ssAvailable
    }
  ];
}

function createTurnGuidePhaseSteps(phase: GamePhase): TurnGuidePhaseStep[] {
  return [
    createTurnGuidePhaseStep("Move", getPhaseStepState("move", phase)),
    createTurnGuidePhaseStep("Aim", getPhaseStepState("aim", phase)),
    createTurnGuidePhaseStep("Fire", getPhaseStepState("fire", phase)),
    createTurnGuidePhaseStep("Impact", getPhaseStepState("resolve", phase))
  ];
}

function createTurnGuidePhaseStep(label: string, state: TurnGuidePhaseStep["state"]): TurnGuidePhaseStep {
  return {
    label,
    state
  };
}

function getTurnGuideHeadline(phase: GamePhase, charging: boolean): string {
  if (charging) {
    return "Hold power, then release";
  }

  if (phase === "move") {
    return "Reposition or take the shot";
  }

  if (phase === "aim") {
    return "Lock your angle";
  }

  if (phase === "fire") {
    return "Shot away";
  }

  if (phase === "resolve") {
    return "Impact resolving";
  }

  return "Turn complete";
}

function getTurnGuideDetail(player: Player, phase: GamePhase, charging: boolean): string {
  if (charging) {
    return "Space builds power for " + getWeaponDisplayName(player.mobile.type, player.mobile.weapon) + ".";
  }

  if (phase === "move") {
    return "Move within your range, adjust the shot, then fire in the same turn.";
  }

  if (phase === "aim") {
    return "Use the arrow keys, then hold Space when the arc feels right.";
  }

  if (phase === "fire") {
    return "Follow the projectile and prepare for the landing.";
  }

  if (phase === "resolve") {
    return "Terrain, damage, and pickups are settling before the next turn.";
  }

  return "Waiting for the next turn banner.";
}

function getTurnGuidePhaseLabel(phase: GamePhase, charging: boolean): string {
  if (charging) {
    return "Charging";
  }

  return getPhaseDisplayLabel(phase);
}

function getTurnGuideTone(phase: GamePhase): TurnGuide["tone"] {
  if (phase === "move") {
    return "move";
  }

  if (phase === "aim") {
    return "aim";
  }

  if (phase === "fire") {
    return "fire";
  }

  if (phase === "resolve") {
    return "resolve";
  }

  return "end";
}

function getMoveDetailLabel(phase: GamePhase, charging: boolean, turnMoveRemaining: number): string {
  if (charging) {
    return "Locked";
  }

  if (phase === "move" || phase === "aim") {
    if (turnMoveRemaining <= 0) {
      return "Spent";
    }

    return String(Math.round(turnMoveRemaining)) + " left";
  }

  return "Closed";
}

function getAimDetailLabel(phase: GamePhase, charging: boolean): string {
  if (charging) {
    return "Hold line";
  }

  if (phase === "resolve" || phase === "end") {
    return "Waiting";
  }

  if (phase === "fire") {
    return "In flight";
  }

  return "Angle";
}

function getWeaponDetailLabel(player: Player, phase: GamePhase, charging: boolean, ssAvailable: boolean): string {
  if (charging) {
    return "Committed";
  }

  if (phase === "resolve" || phase === "end" || phase === "fire") {
    return "Locked";
  }

  if (player.mobile.weapon === "secondary") {
    return ssAvailable ? "Next SS" : "Return to Shot 1";
  }

  if (player.mobile.weapon === "ss") {
    return "Return to Shot 1";
  }

  return "Next Shot 2";
}

function getFireDetailLabel(phase: GamePhase, charging: boolean): string {
  if (charging) {
    return "Fire now";
  }

  if (phase === "resolve" || phase === "end") {
    return "Waiting";
  }

  if (phase === "fire") {
    return "Tracking";
  }

  return "Hold";
}

function getItemDetailLabel(
  phase: GamePhase,
  charging: boolean,
  inventory: BattleItemInventory,
  selectedItem: BattleItemType | null
): string {
  if (charging) {
    return selectedItem === null ? "None" : getBattleItemDisplayName(selectedItem);
  }

  if (phase === "resolve" || phase === "end" || phase === "fire") {
    return "Locked";
  }

  if (selectedItem !== null) {
    return getBattleItemDisplayName(selectedItem);
  }

  const nextItem = getNextAvailableBattleItem(inventory, null);
  return nextItem === null ? "Empty" : "Ready";
}

function getMoveCommandState(phase: GamePhase, charging: boolean, turnMoveRemaining: number): TurnGuideCommand["state"] {
  if (charging || phase === "fire" || phase === "resolve" || phase === "end" || turnMoveRemaining <= 0) {
    return "locked";
  }

  return "active";
}

function getAimCommandState(phase: GamePhase, charging: boolean): TurnGuideCommand["state"] {
  if (phase === "resolve" || phase === "end") {
    return "locked";
  }

  if (charging || phase === "aim") {
    return "active";
  }

  if (phase === "fire") {
    return "locked";
  }

  return "ready";
}

function getWeaponCommandState(
  player: Player,
  phase: GamePhase,
  charging: boolean
): TurnGuideCommand["state"] {
  if (charging || phase === "fire" || phase === "resolve" || phase === "end") {
    return "locked";
  }

  if (player.mobile.weapon === "secondary" || player.mobile.weapon === "ss") {
    return "ready";
  }

  return "ready";
}

function getItemCommandState(
  phase: GamePhase,
  charging: boolean,
  inventory: BattleItemInventory
): TurnGuideCommand["state"] {
  if (charging || phase === "fire" || phase === "resolve" || phase === "end") {
    return "locked";
  }

  return getNextAvailableBattleItem(inventory, null) === null ? "locked" : "ready";
}

function getFireCommandState(phase: GamePhase, charging: boolean): TurnGuideCommand["state"] {
  if (charging) {
    return "active";
  }

  if (phase === "resolve" || phase === "end") {
    return "locked";
  }

  if (phase === "fire") {
    return "ready";
  }

  return "active";
}

function getSsDetailLabel(
  specialCharges: number,
  turnCount: number,
  ssAvailable: boolean,
  ssSelected: boolean
): string {
  if (ssSelected) {
    return "Selected";
  }

  if (ssAvailable) {
    if (turnCount >= 4) {
      return "Unlocked";
    }

    return "Charge x" + String(specialCharges);
  }

  return "Turn " + String(Math.max(1, 4 - turnCount));
}

function getPhaseStepState(targetPhase: GamePhase, currentPhase: GamePhase): TurnGuidePhaseStep["state"] {
  const targetOrder = getPhaseOrder(targetPhase);
  const currentOrder = getPhaseOrder(currentPhase);

  if (targetOrder < currentOrder) {
    return "complete";
  }

  if (targetOrder === currentOrder) {
    return "active";
  }

  return "pending";
}

function getPhaseOrder(phase: GamePhase): number {
  if (phase === "move") {
    return 0;
  }

  if (phase === "aim") {
    return 1;
  }

  if (phase === "fire") {
    return 2;
  }

  if (phase === "resolve") {
    return 3;
  }

  return 4;
}

function formatTimer(value: number): string {
  if (!Number.isFinite(value)) {
    return "∞";
  }

  return String(Math.max(0, Math.ceil(value))).padStart(2, "0");
}
