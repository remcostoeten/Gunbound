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
  },
  dragon: {
    primary: {
      name: "Wing Burst",
      baseSpeed: 415,
      speedScale: 320,
      baseDamage: 32,
      damageScale: 23,
      blastRadius: 42,
      bouncesLeft: 0,
      windScale: 1.12,
      gravityScale: 0.86,
      radius: 4
    },
    secondary: {
      name: "Drake Dive",
      baseSpeed: 388,
      speedScale: 286,
      baseDamage: 40,
      damageScale: 26,
      blastRadius: 46,
      bouncesLeft: 0,
      windScale: 1.04,
      gravityScale: 0.8,
      radius: 5
    }
  },
  trico: {
    primary: {
      name: "Horn Burst",
      baseSpeed: 430,
      speedScale: 335,
      baseDamage: 30,
      damageScale: 22,
      blastRadius: 40,
      bouncesLeft: 0,
      windScale: 0.98,
      gravityScale: 0.9,
      radius: 4
    },
    secondary: {
      name: "Ricochet Horn",
      baseSpeed: 410,
      speedScale: 310,
      baseDamage: 35,
      damageScale: 23,
      blastRadius: 41,
      bouncesLeft: 2,
      windScale: 1.04,
      gravityScale: 0.88,
      radius: 4
    }
  },
  aduko: {
    primary: {
      name: "Spark Needle",
      baseSpeed: 390,
      speedScale: 280,
      baseDamage: 34,
      damageScale: 22,
      blastRadius: 44,
      bouncesLeft: 0,
      windScale: 1.28,
      gravityScale: 0.84,
      radius: 4
    },
    secondary: {
      name: "Thor Chain",
      baseSpeed: 350,
      speedScale: 240,
      baseDamage: 48,
      damageScale: 28,
      blastRadius: 58,
      bouncesLeft: 1,
      windScale: 1.35,
      gravityScale: 0.78,
      radius: 5
    }
  },
  snow: {
    primary: {
      name: "Powder Pot",
      baseSpeed: 405,
      speedScale: 300,
      baseDamage: 36,
      damageScale: 24,
      blastRadius: 44,
      bouncesLeft: 0,
      windScale: 0.9,
      gravityScale: 1,
      radius: 5
    },
    secondary: {
      name: "Avalanche Lob",
      baseSpeed: 360,
      speedScale: 250,
      baseDamage: 50,
      damageScale: 30,
      blastRadius: 58,
      bouncesLeft: 0,
      windScale: 0.82,
      gravityScale: 1.16,
      radius: 6
    }
  },
  mage: {
    primary: {
      name: "Twin Orb",
      baseSpeed: 410,
      speedScale: 308,
      baseDamage: 33,
      damageScale: 23,
      blastRadius: 42,
      bouncesLeft: 0,
      windScale: 1.08,
      gravityScale: 0.92,
      radius: 4
    },
    secondary: {
      name: "Arc Bolt",
      baseSpeed: 396,
      speedScale: 290,
      baseDamage: 42,
      damageScale: 26,
      blastRadius: 48,
      bouncesLeft: 1,
      windScale: 1.18,
      gravityScale: 0.86,
      radius: 5
    }
  },
  nak: {
    primary: {
      name: "Drill Bite",
      baseSpeed: 420,
      speedScale: 320,
      baseDamage: 30,
      damageScale: 21,
      blastRadius: 38,
      bouncesLeft: 0,
      windScale: 0.96,
      gravityScale: 0.94,
      radius: 4
    },
    secondary: {
      name: "Burrow Strike",
      baseSpeed: 395,
      speedScale: 280,
      baseDamage: 38,
      damageScale: 24,
      blastRadius: 46,
      bouncesLeft: 0,
      windScale: 1.02,
      gravityScale: 1.06,
      radius: 5
    }
  },
  turtle: {
    primary: {
      name: "Shell Round",
      baseSpeed: 400,
      speedScale: 290,
      baseDamage: 40,
      damageScale: 26,
      blastRadius: 46,
      bouncesLeft: 0,
      windScale: 0.84,
      gravityScale: 1.04,
      radius: 5
    },
    secondary: {
      name: "Carapace Burst",
      baseSpeed: 355,
      speedScale: 240,
      baseDamage: 54,
      damageScale: 32,
      blastRadius: 60,
      bouncesLeft: 0,
      windScale: 0.78,
      gravityScale: 1.18,
      radius: 6
    }
  },
  frog: {
    primary: {
      name: "Hop Bomb",
      baseSpeed: 405,
      speedScale: 300,
      baseDamage: 32,
      damageScale: 22,
      blastRadius: 42,
      bouncesLeft: 2,
      windScale: 1,
      gravityScale: 0.96,
      radius: 4
    },
    secondary: {
      name: "Skipper",
      baseSpeed: 392,
      speedScale: 282,
      baseDamage: 38,
      damageScale: 24,
      blastRadius: 44,
      bouncesLeft: 3,
      windScale: 1.06,
      gravityScale: 0.92,
      radius: 4
    }
  },
  sate: {
    primary: {
      name: "Sonar Pulse",
      baseSpeed: 402,
      speedScale: 296,
      baseDamage: 36,
      damageScale: 24,
      blastRadius: 46,
      bouncesLeft: 0,
      windScale: 0.94,
      gravityScale: 1,
      radius: 5
    },
    secondary: {
      name: "Depth Charge",
      baseSpeed: 368,
      speedScale: 256,
      baseDamage: 48,
      damageScale: 28,
      blastRadius: 56,
      bouncesLeft: 0,
      windScale: 0.86,
      gravityScale: 1.12,
      radius: 6
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
