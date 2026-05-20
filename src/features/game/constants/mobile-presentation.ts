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
  },
  trico: {
    value: "trico",
    label: "Trico",
    hp: "88",
    move: "Long",
    shot: "Glide",
    role: "Horned Artillery",
    profile: "Light mobile using Dragon-tuned movement and projectile timing."
  },
  aduko: {
    value: "aduko",
    label: "Aduka",
    hp: "96",
    move: "Medium",
    shot: "Storm",
    role: "Lightning Control",
    profile: "High wind sensitivity with stronger secondary arcs."
  },
  mage: {
    value: "mage",
    label: "Mage",
    hp: "100",
    move: "Medium",
    shot: "Beam",
    role: "Arcane Disruptor",
    profile: "Channels twin orbs for piercing arcs and split bolts."
  },
  nak: {
    value: "nak",
    label: "Nak",
    hp: "90",
    move: "Long",
    shot: "Drill",
    role: "Burrowing Skirmisher",
    profile: "Light frame with biting, ground-hugging shots."
  },
  turtle: {
    value: "turtle",
    label: "Turtle",
    hp: "110",
    move: "Short",
    shot: "Shell",
    role: "Bulwark Cannoneer",
    profile: "Heavy plating trades movement for steady damage."
  },
  frog: {
    value: "frog",
    label: "Frog",
    hp: "94",
    move: "Long",
    shot: "Hop",
    role: "Bouncing Bombardier",
    profile: "Lobs ricocheting shells that skip across terrain."
  },
  sate: {
    value: "sate",
    label: "Sate",
    hp: "104",
    move: "Medium",
    shot: "Pulse",
    role: "Recon Submersible",
    profile: "Mid-weight chassis with wide blasts and stable arcs."
  }
};

export const mobilePresentationOptions: MobilePresentation[] = [
  mobilePresentationMap.armor,
  mobilePresentationMap.knight,
  mobilePresentationMap.dragon,
  mobilePresentationMap.snow,
  mobilePresentationMap.trico,
  mobilePresentationMap.aduko,
  mobilePresentationMap.mage,
  mobilePresentationMap.nak,
  mobilePresentationMap.turtle,
  mobilePresentationMap.frog,
  mobilePresentationMap.sate
];

export function getMobilePresentation(type: MobileType): MobilePresentation {
  return mobilePresentationMap[type];
}
