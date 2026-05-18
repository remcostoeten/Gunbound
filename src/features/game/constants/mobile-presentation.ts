import type { MobileType } from "@/features/game/types/shared";

export type MobilePresentation = {
  value: MobileType;
  label: string;
  hp: string;
  move: string;
  shot: string;
  role: string;
  profile: string;
};

const mobilePresentationMap: Record<MobileType, MobilePresentation> = {
  armor: {
    value: "armor",
    label: "Armor",
    hp: "118",
    move: "Short",
    shot: "Heavy",
    role: "Frontline Tank",
    profile: "Low arc shell with weighty impact timing."
  },
  knight: {
    value: "knight",
    label: "Knight",
    hp: "92",
    move: "Long",
    shot: "Arc",
    role: "Precision Skirmisher",
    profile: "Longer movement with a cleaner artillery curve."
  },
  dragon: {
    value: "dragon",
    label: "Dragon",
    hp: "88",
    move: "Long",
    shot: "Glide",
    role: "Aerial Duelist",
    profile: "Fast, light, and built for mobile arc pressure."
  },
  snow: {
    value: "snow",
    label: "Snow",
    hp: "108",
    move: "Medium",
    shot: "Lob",
    role: "Siege Carrier",
    profile: "Stable platform with wider blasts and heavier shells."
  }
};

export const mobilePresentationOptions: MobilePresentation[] = [
  mobilePresentationMap.armor,
  mobilePresentationMap.knight,
  mobilePresentationMap.dragon,
  mobilePresentationMap.snow
];

export function getMobilePresentation(type: MobileType): MobilePresentation {
  return mobilePresentationMap[type];
}
