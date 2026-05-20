import { getMuzzlePosition, getLaunchRadians } from "@/features/game/engine/physics";
import { createWeaponProfile } from "@/features/game/engine/weapons";
import type { ProjectileState } from "@/features/game/types/combat";
import type { Mobile } from "@/features/game/types/entities";
import type { PlayerId } from "@/features/game/types/shared";

export function createProjectile(mobile: Mobile, owner: PlayerId, power: number): ProjectileState {
  const launchAngle = getLaunchRadians(mobile);
  const profile = createWeaponProfile(mobile.type, mobile.weapon, power);
  const muzzle = getMuzzlePosition(mobile, launchAngle);

  return {
    active: true,
    position: muzzle,
    previousPosition: muzzle,
    velocity: {
      x: Math.cos(launchAngle) * profile.speed,
      y: -Math.sin(launchAngle) * profile.speed
    },
    radius: profile.radius,
    owner,
    mobileType: mobile.type,
    weapon: mobile.weapon,
    damage: profile.damage,
    blastRadius: profile.blastRadius,
    bouncesLeft: profile.bouncesLeft,
    tunnelingTicks: 0,
    power,
    life: 0,
    windScale: profile.windScale,
    gravityScale: profile.gravityScale
  };
}
