import type { MobileType, WeaponType } from "@/features/game/types/game";

export type WeaponProfile = {
  name: string;
  speed: number;
  damage: number;
  blastRadius: number;
  bouncesLeft: number;
  windScale: number;
  gravityScale: number;
  radius: number;
};

export function createWeaponProfile(mobileType: MobileType, weaponType: WeaponType, power: number): WeaponProfile {
  if (mobileType === "armor" && weaponType === "primary") {
    return {
      name: "Armor Cannon",
      speed: 430 + power * 340,
      damage: 42 + power * 28,
      blastRadius: 48,
      bouncesLeft: 0,
      windScale: 0.82,
      gravityScale: 1.05,
      radius: 5
    };
  }

  if (mobileType === "armor" && weaponType === "secondary") {
    return {
      name: "Heavy Mortar",
      speed: 360 + power * 250,
      damage: 58 + power * 34,
      blastRadius: 62,
      bouncesLeft: 0,
      windScale: 0.74,
      gravityScale: 1.22,
      radius: 6
    };
  }

  if (mobileType === "knight" && weaponType === "primary") {
    return {
      name: "Lance Shot",
      speed: 400 + power * 300,
      damage: 30 + power * 22,
      blastRadius: 40,
      bouncesLeft: 0,
      windScale: 1.05,
      gravityScale: 0.92,
      radius: 4
    };
  }

  return {
    name: "Sky Bounce",
    speed: 410 + power * 310,
    damage: 36 + power * 24,
    blastRadius: 42,
    bouncesLeft: 2,
    windScale: 1.15,
    gravityScale: 0.88,
    radius: 4
  };
}

export function getWeaponDisplayName(mobileType: MobileType, weaponType: WeaponType): string {
  return createWeaponProfile(mobileType, weaponType, 0.5).name;
}
