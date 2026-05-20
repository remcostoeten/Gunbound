import type { ProjectileState } from "@/features/game/types/combat";
import type { MobileType, Vec2, WeaponType } from "@/features/game/types/shared";

export type ProjectileShapeKind =
  | "orb"
  | "shell"
  | "bolt"
  | "ember"
  | "snowball"
  | "drill"
  | "droplet"
  | "pulse"
  | "seed";

export type ProjectileBodyStyle = {
  shape: ProjectileShapeKind;
  fill: string;
  core: string;
  stroke: string;
  strokeWidth: number;
  glow: string;
  glowRadius: number;
  radiusScale: number;
  aspectRatio: number;
  rotationSpeed: number;
};

export type ProjectileTrailStyle = {
  color: string;
  accent: string;
  glow: string;
  length: number;
  width: number;
  alpha: number;
  taper: number;
};

export type ProjectileImpactStyle = {
  flash: string;
  ring: string;
  sparks: string;
  smoke: string;
  craterTint: string;
  radiusScale: number;
};

export type ProjectilePresentationStyle = {
  mobileType: MobileType;
  weapon: WeaponType;
  body: ProjectileBodyStyle;
  trail: ProjectileTrailStyle;
  impact: ProjectileImpactStyle;
};

export type ProjectileRenderStyle = ProjectilePresentationStyle & {
  radius: number;
  angle: number;
  speed: number;
  powerScale: number;
  trailStep: number;
};

export type ProjectileTrailSample = {
  point: Vec2;
  radius: number;
  alpha: number;
  color: string;
};

type ProjectileWeaponStylePair = Record<WeaponType, ProjectilePresentationStyle>;

const projectileStyles: Record<MobileType, ProjectileWeaponStylePair> = {
  armor: {
    primary: createProjectileStyle("armor", "primary", "shell", "#e8a44c", "#fff2b8", "#743f24", "#ffb33d", 1.08, 1.22, "#ff9f38", "#ffd37a"),
    secondary: createProjectileStyle("armor", "secondary", "shell", "#ff7a32", "#ffe09b", "#6c2f1e", "#ff6a26", 1.26, 1.34, "#ff6a26", "#ffc069")
  },
  knight: {
    primary: createProjectileStyle("knight", "primary", "bolt", "#d9f0ff", "#ffffff", "#6897c8", "#9bdcff", 0.94, 1.62, "#aee6ff", "#ffffff"),
    secondary: createProjectileStyle("knight", "secondary", "bolt", "#94c7ff", "#f3fbff", "#416ea5", "#6ab7ff", 1, 1.74, "#7bc4ff", "#dff5ff")
  },
  dragon: {
    primary: createProjectileStyle("dragon", "primary", "ember", "#ff6241", "#ffe08a", "#7f2528", "#ff412f", 0.96, 1.18, "#ff4d35", "#ffcf60"),
    secondary: createProjectileStyle("dragon", "secondary", "ember", "#ff3658", "#ffd27c", "#6f1731", "#ff2a45", 1.12, 1.28, "#ff3150", "#ff9c55")
  },
  snow: {
    primary: createProjectileStyle("snow", "primary", "snowball", "#dff8ff", "#ffffff", "#79b9cf", "#bdf4ff", 1.02, 1, "#c9f7ff", "#ffffff"),
    secondary: createProjectileStyle("snow", "secondary", "snowball", "#aee8ff", "#ffffff", "#5aa8c8", "#9eeaff", 1.2, 1.06, "#a6efff", "#e8fcff")
  },
  trico: {
    primary: createProjectileStyle("trico", "primary", "seed", "#f2cf65", "#fff0a0", "#7d6330", "#ffd84f", 0.92, 1.3, "#ffd65a", "#fff0a0"),
    secondary: createProjectileStyle("trico", "secondary", "seed", "#df9dff", "#fff0ff", "#704496", "#d681ff", 1, 1.42, "#d77fff", "#f2ccff")
  },
  aduko: {
    primary: createProjectileStyle("aduko", "primary", "bolt", "#ffe859", "#fffad1", "#8a761a", "#fff15a", 0.92, 1.7, "#ffef55", "#ffffff"),
    secondary: createProjectileStyle("aduko", "secondary", "pulse", "#b15cff", "#fff0ff", "#592a8e", "#ad55ff", 1.14, 1.22, "#ba64ff", "#ffe8ff")
  },
  mage: {
    primary: createProjectileStyle("mage", "primary", "orb", "#9b7cff", "#f7eaff", "#5440a6", "#9b77ff", 0.98, 1, "#a98aff", "#f5eaff"),
    secondary: createProjectileStyle("mage", "secondary", "pulse", "#56dcff", "#ffffff", "#286995", "#45d9ff", 1.12, 1.08, "#58e3ff", "#dbfbff")
  },
  nak: {
    primary: createProjectileStyle("nak", "primary", "drill", "#b98755", "#ffe0a6", "#4d3828", "#c98b45", 0.9, 1.82, "#c98b45", "#ffe0a6"),
    secondary: createProjectileStyle("nak", "secondary", "drill", "#6d4d38", "#e2b179", "#2f241d", "#9b6c3d", 1.08, 1.96, "#a06e42", "#dfb27a")
  },
  turtle: {
    primary: createProjectileStyle("turtle", "primary", "shell", "#4fb97b", "#cafad7", "#21513e", "#54d184", 1.06, 1.18, "#62d98d", "#cafad7"),
    secondary: createProjectileStyle("turtle", "secondary", "shell", "#2f8d68", "#b9ffd2", "#143d32", "#43c983", 1.24, 1.3, "#4ad081", "#bfffd4")
  },
  frog: {
    primary: createProjectileStyle("frog", "primary", "droplet", "#67df63", "#eaffb3", "#2b6e32", "#7df36e", 0.92, 1.18, "#7cec6a", "#eaffb3"),
    secondary: createProjectileStyle("frog", "secondary", "droplet", "#38cfa8", "#d8fff1", "#1f6c62", "#44ecc5", 1.02, 1.32, "#4ee8c2", "#d8fff1")
  },
  sate: {
    primary: createProjectileStyle("sate", "primary", "pulse", "#5bc7ff", "#effbff", "#245d8f", "#55c7ff", 1, 1.08, "#68d0ff", "#e7f9ff"),
    secondary: createProjectileStyle("sate", "secondary", "pulse", "#3157ff", "#cde6ff", "#182f8f", "#4264ff", 1.18, 1.18, "#5577ff", "#c9e3ff")
  }
};

export function getProjectilePresentationStyle(mobileType: MobileType, weapon: WeaponType): ProjectilePresentationStyle {
  return cloneProjectilePresentationStyle(projectileStyles[mobileType][weapon]);
}

export function getProjectileBodyStyle(mobileType: MobileType, weapon: WeaponType): ProjectileBodyStyle {
  return getProjectilePresentationStyle(mobileType, weapon).body;
}

export function getProjectileTrailStyle(mobileType: MobileType, weapon: WeaponType): ProjectileTrailStyle {
  return getProjectilePresentationStyle(mobileType, weapon).trail;
}

export function getProjectileImpactStyle(mobileType: MobileType, weapon: WeaponType): ProjectileImpactStyle {
  return getProjectilePresentationStyle(mobileType, weapon).impact;
}

export function createProjectileRenderStyle(projectile: ProjectileState): ProjectileRenderStyle {
  const style = getProjectilePresentationStyle(projectile.mobileType, projectile.weapon);
  const speed = getVectorLength(projectile.velocity);
  const powerScale = 0.9 + projectile.power * 0.24;

  return {
    ...style,
    radius: projectile.radius * style.body.radiusScale * powerScale,
    angle: getProjectileAngle(projectile),
    speed,
    powerScale,
    trailStep: getProjectileTrailStep(speed)
  };
}

export function createProjectileTrailSample(point: Vec2, projectile: ProjectileState, index: number): ProjectileTrailSample {
  const renderStyle = createProjectileRenderStyle(projectile);
  const fade = clamp(1 - index / Math.max(1, renderStyle.trail.length), 0, 1);
  const alpha = renderStyle.trail.alpha * fade;

  return {
    point,
    radius: renderStyle.radius * (0.35 + fade * renderStyle.trail.taper),
    alpha,
    color: index % 2 === 0 ? renderStyle.trail.color : renderStyle.trail.accent
  };
}

export function getProjectileAngle(projectile: ProjectileState): number {
  const velocityAngle = Math.atan2(projectile.velocity.y, projectile.velocity.x);
  return velocityAngle + projectile.life * getProjectileBodyStyle(projectile.mobileType, projectile.weapon).rotationSpeed;
}

export function getProjectileTrailStep(speed: number): number {
  return clamp(speed / 520, 0.7, 1.8);
}

function createProjectileStyle(
  mobileType: MobileType,
  weapon: WeaponType,
  shape: ProjectileShapeKind,
  fill: string,
  core: string,
  stroke: string,
  glow: string,
  radiusScale: number,
  aspectRatio: number,
  trailColor: string,
  trailAccent: string
): ProjectilePresentationStyle {
  const secondaryScale = weapon === "secondary" ? 1.14 : 1;

  return {
    mobileType,
    weapon,
    body: {
      shape,
      fill,
      core,
      stroke,
      strokeWidth: weapon === "secondary" ? 2 : 1.35,
      glow,
      glowRadius: 15 * secondaryScale,
      radiusScale,
      aspectRatio,
      rotationSpeed: getRotationSpeed(shape, weapon)
    },
    trail: {
      color: trailColor,
      accent: trailAccent,
      glow,
      length: Math.round(9 * secondaryScale + radiusScale * 4),
      width: 4.8 * secondaryScale * radiusScale,
      alpha: weapon === "secondary" ? 0.72 : 0.58,
      taper: getTrailTaper(shape)
    },
    impact: {
      flash: core,
      ring: glow,
      sparks: trailAccent,
      smoke: getImpactSmokeColor(shape),
      craterTint: getCraterTint(shape),
      radiusScale: secondaryScale * (0.95 + radiusScale * 0.14)
    }
  };
}

function getRotationSpeed(shape: ProjectileShapeKind, weapon: WeaponType): number {
  const weaponScale = weapon === "secondary" ? 1.2 : 1;

  if (shape === "drill") {
    return 18 * weaponScale;
  }

  if (shape === "bolt") {
    return 3.5 * weaponScale;
  }

  if (shape === "shell" || shape === "seed") {
    return 8 * weaponScale;
  }

  if (shape === "pulse") {
    return 2.4 * weaponScale;
  }

  return 5.6 * weaponScale;
}

function getTrailTaper(shape: ProjectileShapeKind): number {
  if (shape === "bolt" || shape === "drill") {
    return 0.92;
  }

  if (shape === "pulse" || shape === "orb") {
    return 0.72;
  }

  return 0.82;
}

function getImpactSmokeColor(shape: ProjectileShapeKind): string {
  if (shape === "snowball") {
    return "#d5f6ff";
  }

  if (shape === "ember") {
    return "#68423a";
  }

  if (shape === "pulse" || shape === "bolt") {
    return "#d8d6ff";
  }

  if (shape === "droplet") {
    return "#b7ead9";
  }

  return "#8b7665";
}

function getCraterTint(shape: ProjectileShapeKind): string {
  if (shape === "snowball") {
    return "#b9e9f7";
  }

  if (shape === "ember") {
    return "#7b322b";
  }

  if (shape === "pulse" || shape === "bolt") {
    return "#695fba";
  }

  if (shape === "droplet") {
    return "#4aa984";
  }

  if (shape === "drill") {
    return "#5f4636";
  }

  return "#6f513b";
}

function getVectorLength(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cloneProjectilePresentationStyle(style: ProjectilePresentationStyle): ProjectilePresentationStyle {
  return {
    mobileType: style.mobileType,
    weapon: style.weapon,
    body: {
      shape: style.body.shape,
      fill: style.body.fill,
      core: style.body.core,
      stroke: style.body.stroke,
      strokeWidth: style.body.strokeWidth,
      glow: style.body.glow,
      glowRadius: style.body.glowRadius,
      radiusScale: style.body.radiusScale,
      aspectRatio: style.body.aspectRatio,
      rotationSpeed: style.body.rotationSpeed
    },
    trail: {
      color: style.trail.color,
      accent: style.trail.accent,
      glow: style.trail.glow,
      length: style.trail.length,
      width: style.trail.width,
      alpha: style.trail.alpha,
      taper: style.trail.taper
    },
    impact: {
      flash: style.impact.flash,
      ring: style.impact.ring,
      sparks: style.impact.sparks,
      smoke: style.impact.smoke,
      craterTint: style.impact.craterTint,
      radiusScale: style.impact.radiusScale
    }
  };
}
