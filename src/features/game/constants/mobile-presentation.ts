import type { MobileType } from "@/features/game/types/shared";

export type MobilePresentation = {
  label: string;
  hp: string;
  move: string;
  shot: string;
  role: string;
  profile: string;
};

const mobilePresentationMap: Record<MobileType, MobilePresentation> = {
  armor: {
    label: "Armor",
    hp: "118",
    move: "Short",
    shot: "Heavy",
    role: "Frontline Tank",
    profile: "Low arc shell with weighty impact timing."
  },
  knight: {
    label: "Knight",
    hp: "92",
    move: "Long",
    shot: "Arc",
    role: "Precision Skirmisher",
    profile: "Longer movement with a cleaner artillery curve."
  }
};

export function getMobilePresentation(type: MobileType): MobilePresentation {
  return mobilePresentationMap[type];
}
