import type { MobileType } from "../types/shared";
import { mobilePresentationOptions } from "../constants/mobile-presentation";

export type MobileDefinition = {
  type: MobileType;
  label: string;
};

const MOBILE_DEFINITIONS: MobileDefinition[] = mobilePresentationOptions.map((mobile) => ({
  type: mobile.value,
  label: mobile.label,
}));

const MOBILE_TYPES = new Set<MobileType>(
  MOBILE_DEFINITIONS.map((mobile) => mobile.type),
);

export const DEFAULT_MOBILE: MobileType = MOBILE_DEFINITIONS[0]?.type ?? "armor";

export function listAvailableMobiles(): MobileDefinition[] {
  return MOBILE_DEFINITIONS;
}

export function getRandomMobileType(): MobileType {
  const index = Math.floor(Math.random() * MOBILE_DEFINITIONS.length);
  return MOBILE_DEFINITIONS[index]?.type ?? DEFAULT_MOBILE;
}

export function isMobileType(value: string): value is MobileType {
  return MOBILE_TYPES.has(value as MobileType);
}

export function parseMobileType(value: string): MobileType | undefined {
  return isMobileType(value) ? value : undefined;
}
