import type { ProjectileBehavior } from "@/features/game/types/combat";
import type { MobileType, WeaponType } from "@/features/game/types/shared";

const STANDARD: ProjectileBehavior = { kind: "standard" };

// Authentic-flavored per-mobile flight identities, grounded in the original
// GunBound mobiles. Each entry is the [primary, secondary] behavior; the SS
// (super shot) reuses the secondary behavior unless overridden in `ssOverrides`.
//
//  armor   secondary "Heavy Mortar" splits into two explosive parts mid-air.
//  trico   secondary "Ricochet Horn" throws three revolving horns that fan out.
//  mage    secondary "Arc Bolt" forks into a twin bolt that lands apart.
//  aduko   secondary "Thor Chain" forks into a short spark pair.
//  turtle  secondary "Carapace Burst" splits into a twin shell.
//  nak     primary "Drill Bite" tunnels through terrain, then erupts.
//  frog    both shots are rolling, fused jelly that skips before detonating.
//  sate    secondary "Depth Charge" calls a vertical satellite barrage on impact.
//  snow    secondary "Avalanche Lob" leaves the target defense-down.
//  dragon / knight stay clean close-combat single shots.
const behaviorTable: Record<MobileType, { primary: ProjectileBehavior; secondary: ProjectileBehavior }> = {
  armor: {
    primary: STANDARD,
    secondary: { kind: "airSplit", splitCount: 2, splitSpread: 80, splitDamageMul: 0.62 }
  },
  knight: { primary: STANDARD, secondary: STANDARD },
  dragon: { primary: STANDARD, secondary: STANDARD },
  snow: {
    primary: { kind: "debuff", vulnerableTurns: 1 },
    secondary: { kind: "debuff", vulnerableTurns: 2 }
  },
  trico: {
    primary: STANDARD,
    secondary: { kind: "airSplit", splitCount: 3, splitSpread: 95, splitDamageMul: 0.5 }
  },
  aduko: {
    primary: STANDARD,
    secondary: { kind: "airSplit", splitCount: 2, splitSpread: 55, splitDamageMul: 0.6 }
  },
  mage: {
    primary: STANDARD,
    secondary: { kind: "airSplit", splitCount: 2, splitSpread: 44, splitDamageMul: 0.62 }
  },
  nak: {
    primary: { kind: "drill", drillTicks: 22 },
    secondary: STANDARD
  },
  turtle: {
    primary: STANDARD,
    secondary: { kind: "airSplit", splitCount: 2, splitSpread: 50, splitDamageMul: 0.62 }
  },
  frog: {
    primary: { kind: "roll", fuseSeconds: 1.1 },
    secondary: { kind: "roll", fuseSeconds: 1.4 }
  },
  sate: {
    primary: STANDARD,
    secondary: { kind: "skyStrike", skyStrikeCount: 5, skyStrikeSpread: 46 }
  }
};

// SS overrides where the super shot wants a distinct identity from the secondary.
const ssOverrides: Partial<Record<MobileType, ProjectileBehavior>> = {
  sate: { kind: "skyStrike", skyStrikeCount: 8, skyStrikeSpread: 54 },
  snow: { kind: "debuff", vulnerableTurns: 3 }
};

export function getProjectileBehavior(mobileType: MobileType, weaponType: WeaponType): ProjectileBehavior {
  // The super shot keeps its distinct crater-pattern identity and flies as a
  // single projectile, so it stays standard unless a mobile explicitly wants a
  // different SS flight behavior (A.Sate barrage, Snow defense-down).
  if (weaponType === "ss") {
    return ssOverrides[mobileType] ?? STANDARD;
  }

  return behaviorTable[mobileType][weaponType];
}
