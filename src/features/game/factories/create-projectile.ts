import { getTrueAngleDamageScale } from "@/features/game/engine/aiming";
import { getMuzzlePosition, getLaunchRadians } from "@/features/game/engine/physics";
import { createWeaponProfile } from "@/features/game/engine/weapons";
import type { ProjectileState } from "@/features/game/types/combat";
import type { Mobile } from "@/features/game/types/entities";
import type { BattleItemType, PlayerId } from "@/features/game/types/shared";

export function createProjectile(mobile: Mobile, owner: PlayerId, power: number, item: BattleItemType | null = null): ProjectileState {
  const launchAngle = getLaunchRadians(mobile);
  const profile = createWeaponProfile(mobile.type, mobile.weapon, power);
  const muzzle = getMuzzlePosition(mobile, launchAngle);
  const damageScale = item === "power" ? 1.35 : 1;
  const blastRadiusScale = item === "bunge" ? 1.28 : 1;
  const trueAngleDamageScale = getTrueAngleDamageScale(mobile.type, mobile.angle);

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
    damage: profile.damage * damageScale * trueAngleDamageScale,
    blastRadius: profile.blastRadius * blastRadiusScale,
    bouncesLeft: profile.bouncesLeft,
    tunnelingTicks: 0,
    power,
    life: 0,
    windScale: profile.windScale,
    gravityScale: profile.gravityScale,
    item,
    forceBoosted: false,
    tornadoTriggered: false
  };
}
