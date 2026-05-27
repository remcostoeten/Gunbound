import type { PendingButtShot } from "@/features/game/types/state";
import type { Mobile } from "@/features/game/types/entities";
import type { ShotMode, ShotTechnique } from "@/features/game/types/shared";

export const buttShotWindowSeconds = 0.18;
export const defaultShotMode: ShotMode = "slice";

export function isButtShotEligible(mobile: Mobile, shotMode: ShotMode): boolean {
  return shotMode === "slice" && mobile.angle < 90;
}

export function canTriggerButtShot(pendingButtShot: PendingButtShot | null, direction: -1 | 1): boolean {
  return pendingButtShot !== null && direction === getButtShotDirection(pendingButtShot.sourceFacing);
}

export function getButtShotDirection(facing: 1 | -1): -1 | 1 {
  return facing === 1 ? -1 : 1;
}

export function mirrorShotAngle(angle: number): number {
  return Math.max(0, Math.min(180, 180 - angle));
}

export function detectBackshot(
  technique: ShotTechnique | null,
  rearArc: boolean,
  launchDirection: -1 | 1,
  velocityX: number,
  life: number
): ShotTechnique | null {
  if (technique !== null || !rearArc || life < 0.06 || Math.abs(velocityX) < 24) {
    return technique;
  }

  const direction = velocityX >= 0 ? 1 : -1;
  return direction !== launchDirection ? "backshot" : null;
}

export function getShotModeLabel(shotMode: ShotMode): string {
  return shotMode === "slice" ? "Slice" : "Drag";
}

export function getShotTechniqueLabel(technique: ShotTechnique | null): string {
  if (technique === "buttshot") {
    return "Butt Shot";
  }

  if (technique === "backshot") {
    return "Back Shot";
  }

  return "Standard";
}
