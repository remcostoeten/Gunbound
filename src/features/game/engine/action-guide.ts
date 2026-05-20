import { canSelectWeapon, getWeaponDisplayName } from "@/features/game/engine/weapons";
import type { Player } from "@/features/game/types/entities";
import type { TurnGuide, TurnGuideCommand, TurnGuidePhaseStep, TurnGuideWeaponSlot } from "@/features/game/types/presentation";
import type { GamePhase } from "@/features/game/types/shared";

export function createTurnGuide(
  player: Player,
  phase: GamePhase,
  charging: boolean,
  phaseTimer: number,
  power: number,
  turnCount: number
): TurnGuide {
  const secondaryAvailable = canSelectWeapon("secondary", player.mobile.specialCharges, turnCount);

  return {
    headline: getTurnGuideHeadline(phase, charging),
    detail: getTurnGuideDetail(player, phase, charging),
    phaseLabel: getTurnGuidePhaseLabel(phase, charging),
    tone: getTurnGuideTone(phase),
    timerLabel: formatTimer(phaseTimer),
    powerPercent: charging ? Math.round(power * 100) : 0,
    commands: createTurnGuideCommands(player, phase, charging, secondaryAvailable),
    weaponSlots: createTurnGuideWeaponSlots(player, turnCount, secondaryAvailable),
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
  secondaryAvailable: boolean
): TurnGuideCommand[] {
  return [
    createTurnGuideCommand("A / D", "Move", getMoveDetailLabel(phase, charging), getMoveCommandState(phase, charging)),
    createTurnGuideCommand("Up / Down", "Aim", getAimDetailLabel(phase, charging), getAimCommandState(phase, charging)),
    createTurnGuideCommand("Q", "Shot", getWeaponDetailLabel(player, phase, charging, secondaryAvailable), getWeaponCommandState(player, phase, charging)),
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
  secondaryAvailable: boolean
): TurnGuideWeaponSlot[] {
  const primarySelected = player.mobile.weapon === "primary";
  const secondarySelected = player.mobile.weapon === "secondary";

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
      detailLabel: getSecondaryDetailLabel(player.mobile.specialCharges, turnCount, secondaryAvailable, secondarySelected),
      selected: secondarySelected,
      available: secondaryAvailable
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
    return "Moving ends the turn. A clean shot can still start from here.";
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

function getMoveDetailLabel(phase: GamePhase, charging: boolean): string {
  if (charging) {
    return "Locked";
  }

  if (phase === "move") {
    return "Ends turn";
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

function getWeaponDetailLabel(player: Player, phase: GamePhase, charging: boolean, secondaryAvailable: boolean): string {
  if (charging) {
    return "Committed";
  }

  if (phase === "resolve" || phase === "end" || phase === "fire") {
    return "Locked";
  }

  if (player.mobile.weapon === "secondary") {
    return "Return to Shot 1";
  }

  if (secondaryAvailable) {
    return "Swap";
  }

  return "Shot 2 locked";
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

function getMoveCommandState(phase: GamePhase, charging: boolean): TurnGuideCommand["state"] {
  if (charging || phase === "aim" || phase === "fire" || phase === "resolve" || phase === "end") {
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

  if (player.mobile.weapon === "secondary") {
    return "ready";
  }

  return "ready";
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

function getSecondaryDetailLabel(
  specialCharges: number,
  turnCount: number,
  secondaryAvailable: boolean,
  secondarySelected: boolean
): string {
  if (secondarySelected) {
    return "Selected";
  }

  if (secondaryAvailable) {
    if (turnCount >= 4) {
      return "Unlocked";
    }

    return "Charge x" + String(specialCharges);
  }

  return "Turn " + String(Math.max(1, 4 - turnCount)) + " to unlock";
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
  return String(Math.max(0, Math.ceil(value))).padStart(2, "0");
}
