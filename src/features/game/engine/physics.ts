import { createWeaponProfile } from "@/features/game/engine/weapons";
import { tracePlayerCollision, traceTerrainCollision } from "@/features/game/engine/collision";
import { clamp, getTerrainNormal } from "@/features/game/engine/terrain";
import type {
  ExplosionState,
  Mobile,
  Player,
  ProjectileState,
  TerrainState,
  Vec2,
  WeaponType
} from "@/features/game/types/game";

export type ProjectileStep = {
  projectile: ProjectileState | null;
  explosion: ExplosionState | null;
};

export function createProjectile(mobile: Mobile, owner: 1 | 2, power: number): ProjectileState {
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
    weapon: mobile.weapon,
    damage: profile.damage,
    blastRadius: profile.blastRadius,
    bouncesLeft: profile.bouncesLeft,
    power,
    life: 0,
    windScale: profile.windScale,
    gravityScale: profile.gravityScale
  };
}

export function getLaunchRadians(mobile: Mobile): number {
  const degrees = mobile.facing === 1 ? mobile.angle : 180 - mobile.angle;
  return (degrees * Math.PI) / 180;
}

export function getMuzzlePosition(mobile: Mobile, radians: number): Vec2 {
  return {
    x: mobile.position.x + Math.cos(radians) * 24,
    y: mobile.position.y - mobile.height * 0.6 - Math.sin(radians) * 10
  };
}

export function stepProjectile(
  projectile: ProjectileState,
  terrain: TerrainState,
  players: [Player, Player],
  wind: Vec2,
  dt: number
): ProjectileStep {
  const previousPosition = projectile.position;
  const velocity = {
    x: projectile.velocity.x + wind.x * 580 * projectile.windScale * dt,
    y: projectile.velocity.y + (530 * projectile.gravityScale + wind.y * 120) * dt
  };
  const nextPosition = {
    x: projectile.position.x + velocity.x * dt,
    y: projectile.position.y + velocity.y * dt
  };
  const directHit = tracePlayerCollision(players, projectile.owner, previousPosition, nextPosition, projectile.radius);

  if (directHit !== null) {
    return {
      projectile: null,
      explosion: {
        point: {
          x: directHit.mobile.position.x,
          y: directHit.mobile.position.y - directHit.mobile.height * 0.55
        },
        damage: projectile.damage,
        radius: projectile.blastRadius,
        owner: projectile.owner
      }
    };
  }

  const terrainHit = traceTerrainCollision(terrain, previousPosition, nextPosition, projectile.radius);
  if (terrainHit !== null) {
    if (projectile.weapon === "secondary" && projectile.bouncesLeft > 0) {
      const normal = getTerrainNormal(terrain, terrainHit);
      const reflectedVelocity = reflectVelocity(velocity, normal);
      const reducedVelocity = {
        x: reflectedVelocity.x * 0.72,
        y: reflectedVelocity.y * 0.72
      };
      const magnitude = Math.hypot(reducedVelocity.x, reducedVelocity.y);

      if (magnitude > 120) {
        return {
          projectile: {
            active: true,
            position: {
              x: terrainHit.x + normal.x * (projectile.radius + 2),
              y: terrainHit.y + normal.y * (projectile.radius + 2)
            },
            previousPosition: terrainHit,
            velocity: reducedVelocity,
            radius: projectile.radius,
            owner: projectile.owner,
            weapon: projectile.weapon,
            damage: projectile.damage,
            blastRadius: projectile.blastRadius,
            bouncesLeft: projectile.bouncesLeft - 1,
            power: projectile.power,
            life: projectile.life + dt,
            windScale: projectile.windScale,
            gravityScale: projectile.gravityScale
          },
          explosion: null
        };
      }
    }

    return {
      projectile: null,
      explosion: {
        point: terrainHit,
        damage: projectile.damage,
        radius: projectile.blastRadius,
        owner: projectile.owner
      }
    };
  }

  if (nextPosition.y > terrain.height + 40 || nextPosition.x < -40 || nextPosition.x > terrain.width + 40 || projectile.life > 8) {
    return {
      projectile: null,
      explosion: {
        point: {
          x: clamp(nextPosition.x, 0, terrain.width - 1),
          y: clamp(nextPosition.y, 0, terrain.height - 1)
        },
        damage: projectile.damage * 0.6,
        radius: projectile.blastRadius,
        owner: projectile.owner
      }
    };
  }

  return {
    projectile: {
      active: true,
      position: nextPosition,
      previousPosition,
      velocity,
      radius: projectile.radius,
      owner: projectile.owner,
      weapon: projectile.weapon,
      damage: projectile.damage,
      blastRadius: projectile.blastRadius,
      bouncesLeft: projectile.bouncesLeft,
      power: projectile.power,
      life: projectile.life + dt,
      windScale: projectile.windScale,
      gravityScale: projectile.gravityScale
    },
    explosion: null
  };
}

export function reflectVelocity(velocity: Vec2, normal: Vec2): Vec2 {
  const dot = velocity.x * normal.x + velocity.y * normal.y;
  return {
    x: velocity.x - 2 * dot * normal.x,
    y: velocity.y - 2 * dot * normal.y
  };
}

export function distanceDamage(explosion: ExplosionState, target: Vec2): number {
  const distance = Math.hypot(target.x - explosion.point.x, target.y - explosion.point.y);
  if (distance >= explosion.radius) {
    return 0;
  }

  const falloff = 1 - distance / explosion.radius;
  return explosion.damage * falloff;
}

export function canUseSecondary(weapon: WeaponType, specialCharges: number, turnCount: number): boolean {
  if (weapon === "primary") {
    return true;
  }

  return turnCount >= 4 || specialCharges > 0;
}
