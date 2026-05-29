import type { MobileType } from "@/features/game/types/shared";

export type SsPattern =
  | "heavy-single"
  | "cluster-rain"
  | "split-spread"
  | "dive-fan"
  | "ring-burst"
  | "burrow-line"
  | "bounce-chain"
  | "lightning-strike"
  | "split-homing";

export type ExplosionMotif =
  | "fire"
  | "frost"
  | "shell"
  | "horn"
  | "spark"
  | "rune"
  | "dust"
  | "bubble"
  | "sonar"
  | "blade";

export type MobileSsAttack = {
  name: string;
  pattern: SsPattern;
  count: number;
  spread: number;
};

export type MobileExplosionStyle = {
  motif: ExplosionMotif;
  core: string;
  ring: string;
  spark: string;
  smoke: string;
  debris: string;
};

const ssAttacks: Record<MobileType, MobileSsAttack> = {
  armor: { name: "Siege Barrage", pattern: "cluster-rain", count: 4, spread: 70 },
  knight: { name: "Sky Lance", pattern: "split-spread", count: 3, spread: 60 },
  dragon: { name: "Drake Descent", pattern: "dive-fan", count: 3, spread: 54 },
  snow: { name: "Avalanche", pattern: "cluster-rain", count: 5, spread: 90 },
  trico: { name: "Triple Horn", pattern: "split-spread", count: 3, spread: 64 },
  aduko: { name: "Thunder Spear", pattern: "lightning-strike", count: 3, spread: 40 },
  mage: { name: "Arcane Split", pattern: "split-homing", count: 3, spread: 30 },
  nak: { name: "Burrow Erupt", pattern: "burrow-line", count: 4, spread: 44 },
  turtle: { name: "Triad Shell", pattern: "split-spread", count: 3, spread: 50 },
  frog: { name: "Skip Bombard", pattern: "bounce-chain", count: 4, spread: 58 },
  sate: { name: "Sonar Storm", pattern: "ring-burst", count: 6, spread: 48 }
};

const explosionStyles: Record<MobileType, MobileExplosionStyle> = {
  armor: { motif: "fire", core: "#fff2b8", ring: "#ffb33d", spark: "#ff9f38", smoke: "#6c2f1e", debris: "#743f24" },
  knight: { motif: "blade", core: "#ffffff", ring: "#9bdcff", spark: "#aee6ff", smoke: "#416ea5", debris: "#6897c8" },
  dragon: { motif: "fire", core: "#ffe08a", ring: "#ff412f", spark: "#ff4d35", smoke: "#7f2528", debris: "#6f1731" },
  snow: { motif: "frost", core: "#ffffff", ring: "#bdf4ff", spark: "#c9f7ff", smoke: "#79b9cf", debris: "#5aa8c8" },
  trico: { motif: "horn", core: "#fff0a0", ring: "#ffd84f", spark: "#d77fff", smoke: "#704496", debris: "#7d6330" },
  aduko: { motif: "spark", core: "#eaffe9", ring: "#9cff7e", spark: "#62e0ff", smoke: "#2a8e5a", debris: "#1a6b3a" },
  mage: { motif: "rune", core: "#f7eaff", ring: "#9b77ff", spark: "#58e3ff", smoke: "#5440a6", debris: "#286995" },
  nak: { motif: "dust", core: "#ffe0a6", ring: "#c98b45", spark: "#ffd37a", smoke: "#4d3828", debris: "#5f4636" },
  turtle: { motif: "shell", core: "#cafad7", ring: "#54d184", spark: "#62d98d", smoke: "#21513e", debris: "#143d32" },
  frog: { motif: "bubble", core: "#eaffb3", ring: "#7df36e", spark: "#4ee8c2", smoke: "#2b6e32", debris: "#1f6c62" },
  sate: { motif: "sonar", core: "#effbff", ring: "#55c7ff", spark: "#68d0ff", smoke: "#245d8f", debris: "#182f8f" }
};

export function getSsAttack(type: MobileType): MobileSsAttack {
  return ssAttacks[type];
}

export function getExplosionStyle(type: MobileType): MobileExplosionStyle {
  return explosionStyles[type];
}
