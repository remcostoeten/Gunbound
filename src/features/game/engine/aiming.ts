import type { MobileType } from "@/features/game/types/shared";

export type MobileAngleProfile = {
  min: number;
  max: number;
  trueAngleMin: number;
  trueAngleMax: number;
  trueAngleDamageScale: number;
};

const mobileAngleProfiles: Record<MobileType, MobileAngleProfile> = {
  armor: { min: 18, max: 128, trueAngleMin: 34, trueAngleMax: 56, trueAngleDamageScale: 1.14 },
  knight: { min: 22, max: 154, trueAngleMin: 46, trueAngleMax: 72, trueAngleDamageScale: 1.12 },
  dragon: { min: 28, max: 164, trueAngleMin: 74, trueAngleMax: 104, trueAngleDamageScale: 1.13 },
  snow: { min: 18, max: 136, trueAngleMin: 34, trueAngleMax: 54, trueAngleDamageScale: 1.16 },
  trico: { min: 20, max: 158, trueAngleMin: 52, trueAngleMax: 78, trueAngleDamageScale: 1.12 },
  aduko: { min: 24, max: 164, trueAngleMin: 68, trueAngleMax: 96, trueAngleDamageScale: 1.14 },
  mage: { min: 22, max: 160, trueAngleMin: 64, trueAngleMax: 92, trueAngleDamageScale: 1.13 },
  nak: { min: 16, max: 142, trueAngleMin: 28, trueAngleMax: 48, trueAngleDamageScale: 1.15 },
  turtle: { min: 18, max: 124, trueAngleMin: 32, trueAngleMax: 50, trueAngleDamageScale: 1.16 },
  frog: { min: 20, max: 156, trueAngleMin: 60, trueAngleMax: 88, trueAngleDamageScale: 1.12 },
  sate: { min: 18, max: 148, trueAngleMin: 42, trueAngleMax: 70, trueAngleDamageScale: 1.13 }
};

export function getMobileAngleProfile(type: MobileType): MobileAngleProfile {
  return mobileAngleProfiles[type];
}

export function clampMobileAngle(type: MobileType, value: number): number {
  const profile = getMobileAngleProfile(type);
  return clamp(value, profile.min, profile.max);
}

export function isTrueAngle(type: MobileType, angle: number): boolean {
  const profile = getMobileAngleProfile(type);
  return angle >= profile.trueAngleMin && angle <= profile.trueAngleMax;
}

export function getTrueAngleDamageScale(type: MobileType, angle: number): number {
  return isTrueAngle(type, angle)
    ? getMobileAngleProfile(type).trueAngleDamageScale
    : 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
