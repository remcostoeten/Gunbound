import type { WeaponProfile, WeaponProfileDefinition, WeaponProfileMap } from "@/features/game/types/combat";
import type { MobileType, WeaponType } from "@/features/game/types/shared";

const weaponProfileDefinitions: WeaponProfileMap = {
  armor: {
    primary: {
      name: "Armor Cannon",
      baseSpeed: 430,
      speedScale: 340,
      baseDamage: 42,
      damageScale: 28,
      blastRadius: 48,
      bouncesLeft: 0,
      windScale: 0.82,
      gravityScale: 1.05,
      radius: 5
    },
    secondary: {
      name: "Heavy Mortar",
      baseSpeed: 360,
      speedScale: 250,
      baseDamage: 58,
      damageScale: 34,
      blastRadius: 62,
      bouncesLeft: 0,
      windScale: 0.74,
      gravityScale: 1.22,
      radius: 6
    }
  },
  knight: {
    primary: {
      name: "Lance Shot",
      baseSpeed: 400,
      speedScale: 300,
      baseDamage: 30,
      damageScale: 22,
      blastRadius: 40,
      bouncesLeft: 0,
      windScale: 1.05,
      gravityScale: 0.92,
      radius: 4
    },
    secondary: {
      name: "Sky Bounce",
      baseSpeed: 410,
      speedScale: 310,
      baseDamage: 36,
      damageScale: 24,
      blastRadius: 42,
      bouncesLeft: 2,
      windScale: 1.15,
      gravityScale: 0.88,
      radius: 4
    }
  }
};

export function createWeaponProfile(mobileType: MobileType, weaponType: WeaponType, power: number): WeaponProfile {
  const definition = getWeaponProfileDefinition(mobileType, weaponType);

  return {
    name: definition.name,
    speed: definition.baseSpeed + power * definition.speedScale,
    damage: definition.baseDamage + power * definition.damageScale,
    blastRadius: definition.blastRadius,
    bouncesLeft: definition.bouncesLeft,
    windScale: definition.windScale,
    gravityScale: definition.gravityScale,
    radius: definition.radius
  };
}

export function getWeaponProfileDefinition(mobileType: MobileType, weaponType: WeaponType): WeaponProfileDefinition {
  return weaponProfileDefinitions[mobileType][weaponType];
}

export function getWeaponDisplayName(mobileType: MobileType, weaponType: WeaponType): string {
  return getWeaponProfileDefinition(mobileType, weaponType).name;
}

export function canSelectWeapon(weapon: WeaponType, specialCharges: number, turnCount: number): boolean {
  if (weapon === "primary") {
    return true;
  }

  return turnCount >= 4 || specialCharges > 0;
}

export function shouldConsumeSpecialCharge(weapon: WeaponType, specialCharges: number, turnCount: number): boolean {
  return weapon === "secondary" && turnCount < 4 && specialCharges > 0;
}

export function getNextWeapon(currentWeapon: WeaponType): WeaponType {
  if (currentWeapon === "primary") {
    return "secondary";
  }

  return "primary";
}
