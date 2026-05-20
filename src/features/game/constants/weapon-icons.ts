import type { BonusType, MobileType, WeaponType } from "@/features/game/types/shared";

const weaponIconPaths: Record<MobileType, Record<WeaponType, string>> = {
  armor: {
    primary: "/weapons/armor-cannon.png",
    secondary: "/weapons/armor-heavy-mortar.png"
  },
  knight: {
    primary: "/weapons/knight-lance-shot.png",
    secondary: "/weapons/knight-sky-bounce.png"
  },
  dragon: {
    primary: "/weapons/dragon-wing-burst.png",
    secondary: "/weapons/dragon-drake-dive.png"
  },
  snow: {
    primary: "/weapons/snow-powder-pot.png",
    secondary: "/weapons/snow-avalanche-lob.png"
  },
  trico: {
    primary: "/weapons/trico-horn-burst.png",
    secondary: "/weapons/trico-ricochet-horn.png"
  },
  aduko: {
    primary: "/weapons/aduko-spark-needle.png",
    secondary: "/weapons/aduko-thor-chain.png"
  },
  mage: {
    primary: "/weapons/mage-twin-orb.png",
    secondary: "/weapons/mage-arc-bolt.png"
  },
  nak: {
    primary: "/weapons/nak-drill-bite.png",
    secondary: "/weapons/nak-burrow-strike.png"
  },
  turtle: {
    primary: "/weapons/turtle-shell-round.png",
    secondary: "/weapons/turtle-carapace-burst.png"
  },
  frog: {
    primary: "/weapons/frog-hop-bomb.png",
    secondary: "/weapons/frog-skipper.png"
  },
  sate: {
    primary: "/weapons/sate-sonar-pulse.png",
    secondary: "/weapons/sate-depth-charge.png"
  }
};

const bonusIconPaths: Record<BonusType, string> = {
  weapon: "/weapons/bonus-weapon.png",
  repair: "/weapons/bonus-repair.png",
  double: "/weapons/bonus-double.png"
};

export function getWeaponIconPath(mobileType: MobileType, weaponType: WeaponType): string {
  return weaponIconPaths[mobileType][weaponType];
}

export function getBonusIconPath(bonusType: BonusType): string {
  return bonusIconPaths[bonusType];
}
