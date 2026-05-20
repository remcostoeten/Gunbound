import { tracePlayerCollision, traceTerrainCollision } from "@/features/game/engine/collision";
import { clamp, getTerrainNormal } from "@/features/game/engine/terrain";
import type {
  CombatHit,
  ExplosionState,
  ExplosionDamageResult,
  ProjectileState,
} from "@/features/game/types/combat";
import type { Mobile, Player, TerrainState } from "@/features/game/types/entities";
import type { Vec2 } from "@/features/game/types/shared";

export type ProjectileStep = {
  projectile: ProjectileState | null;
  explosion: ExplosionState | null;
  bonusExplosion: ExplosionState | null;
};

export function getLaunchRadians(mobile: Mobile): number {
  const degrees = mobile.facing === 1 ? mobile.angle : 180 - mobile.angle;
  return (degrees * Math.PI) / 180;
}

export function getMuzzlePosition(mobile: Mobile, radians: number): Vec2 {
  const offset = getMobileCannonOffset(mobile.type);
  return {
    x: mobile.position.x + Math.cos(radians) * offset.reach,
    y: mobile.position.y - mobile.height * offset.heightFraction - Math.sin(radians) * 10
  };
}

function getMobileCannonOffset(type: Mobile["type"]): { reach: number; heightFraction: number } {
  if (type === "armor" || type === "turtle" || type === "sate") {
    return { reach: 26, heightFraction: 0.65 };
  }

  if (type === "mage") {
    return { reach: 22, heightFraction: 0.72 };
  }

  if (type === "nak" || type === "frog") {
    return { reach: 20, heightFraction: 0.45 };
  }

  if (type === "snow" || type === "aduko") {
    return { reach: 24, heightFraction: 0.7 };
  }

  return { reach: 24, heightFraction: 0.6 };
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
      bonusExplosion: null,
      explosion: buildExplosion(projectile, {
        x: directHit.mobile.position.x,
        y: directHit.mobile.position.y - directHit.mobile.height * 0.55
      })
    };
  }

  if (projectile.tunnelingTicks > 0) {
    if (projectile.tunnelingTicks === 1) {
      return {
        projectile: null,
        bonusExplosion: null,
        explosion: buildExplosion(projectile, nextPosition)
      };
    }

    return {
      projectile: advanceProjectile(projectile, nextPosition, previousPosition, velocity, dt, projectile.tunnelingTicks - 1),
      bonusExplosion: null,
      explosion: null
    };
  }

  const terrainHit = traceTerrainCollision(terrain, previousPosition, nextPosition, projectile.radius);
  if (terrainHit !== null) {
    if (projectile.mobileType === "nak" && projectile.weapon === "primary") {
      return {
        projectile: advanceProjectile(projectile, nextPosition, previousPosition, velocity, dt, 22),
        bonusExplosion: null,
        explosion: null
      };
    }

    const canBounce =
      projectile.bouncesLeft > 0 &&
      (projectile.weapon === "secondary" || projectile.mobileType === "frog");

    if (canBounce) {
      const normal = getTerrainNormal(terrain, terrainHit);
      const reflectedVelocity = reflectVelocity(velocity, normal);
      const reducedVelocity = {
        x: reflectedVelocity.x * 0.72,
        y: reflectedVelocity.y * 0.72
      };
      const magnitude = Math.hypot(reducedVelocity.x, reducedVelocity.y);

      if (magnitude > 120) {
        const bounceExplosion: ExplosionState | null =
          projectile.mobileType === "frog"
            ? buildExplosion(projectile, terrainHit, projectile.damage * 0.35, projectile.blastRadius * 0.55)
            : null;

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
            mobileType: projectile.mobileType,
            weapon: projectile.weapon,
            damage: projectile.damage,
            blastRadius: projectile.blastRadius,
            bouncesLeft: projectile.bouncesLeft - 1,
            tunnelingTicks: 0,
            power: projectile.power,
            life: projectile.life + dt,
            windScale: projectile.windScale,
            gravityScale: projectile.gravityScale
          },
          bonusExplosion: bounceExplosion,
          explosion: null
        };
      }
    }

    return {
      projectile: null,
      bonusExplosion: null,
      explosion: buildExplosion(projectile, terrainHit)
    };
  }

  if (nextPosition.y > terrain.height + 40 || nextPosition.x < -40 || nextPosition.x > terrain.width + 40 || projectile.life > 8) {
    return {
      projectile: null,
      bonusExplosion: null,
      explosion: buildExplosion(projectile, {
        x: clamp(nextPosition.x, 0, terrain.width - 1),
        y: clamp(nextPosition.y, 0, terrain.height - 1)
      }, projectile.damage * 0.6)
    };
  }

  return {
    projectile: advanceProjectile(projectile, nextPosition, previousPosition, velocity, dt, 0),
    bonusExplosion: null,
    explosion: null
  };
}

function advanceProjectile(
  projectile: ProjectileState,
  position: Vec2,
  previousPosition: Vec2,
  velocity: Vec2,
  dt: number,
  tunnelingTicks: number
): ProjectileState {
  return {
    active: true,
    position,
    previousPosition,
    velocity,
    radius: projectile.radius,
    owner: projectile.owner,
    mobileType: projectile.mobileType,
    weapon: projectile.weapon,
    damage: projectile.damage,
    blastRadius: projectile.blastRadius,
    bouncesLeft: projectile.bouncesLeft,
    tunnelingTicks,
    power: projectile.power,
    life: projectile.life + dt,
    windScale: projectile.windScale,
    gravityScale: projectile.gravityScale
  };
}

function buildExplosion(
  projectile: ProjectileState,
  point: Vec2,
  damage = projectile.damage,
  radius = projectile.blastRadius
): ExplosionState {
  return {
    point,
    damage,
    radius,
    owner: projectile.owner,
    mobileType: projectile.mobileType,
    weapon: projectile.weapon
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

export function applyExplosionDamage(players: [Player, Player], explosion: ExplosionState): ExplosionDamageResult {
  const nextPlayers = clonePlayers(players);
  const hits: CombatHit[] = [];
  let index = 0;

  while (index < nextPlayers.length) {
    const player = nextPlayers[index];
    const targetPoint = {
      x: player.mobile.position.x,
      y: player.mobile.position.y - player.mobile.height * 0.5
    };
    let damage = distanceDamage(explosion, targetPoint);
    const owner = nextPlayers[explosion.owner - 1];

    if (owner.mobile.doubleDamageTurns > 0) {
      damage *= 2;
    }

    const roundedDamage = Math.round(damage);
    player.mobile.hp = Math.max(0, Math.round(player.mobile.hp - damage));

    if (roundedDamage > 0) {
      hits.push({
        playerId: player.id,
        playerName: player.name,
        damage: roundedDamage,
        popupPosition: {
          x: player.mobile.position.x,
          y: player.mobile.position.y - player.mobile.height - 16
        }
      });
    }

    index += 1;
  }

  nextPlayers[explosion.owner - 1].mobile.doubleDamageTurns = Math.max(0, nextPlayers[explosion.owner - 1].mobile.doubleDamageTurns - 1);

  return {
    players: nextPlayers,
    hits
  };
}

function clonePlayers(players: [Player, Player]): [Player, Player] {
  return [
    {
      id: players[0].id,
      name: players[0].name,
      title: players[0].title,
      accent: players[0].accent,
      score: players[0].score,
      mobile: cloneMobile(players[0].mobile)
    },
    {
      id: players[1].id,
      name: players[1].name,
      title: players[1].title,
      accent: players[1].accent,
      score: players[1].score,
      mobile: cloneMobile(players[1].mobile)
    }
  ];
}

function cloneMobile(mobile: Mobile): Mobile {
  return {
    id: mobile.id,
    type: mobile.type,
    hp: mobile.hp,
    maxHp: mobile.maxHp,
    position: {
      x: mobile.position.x,
      y: mobile.position.y
    },
    weapon: mobile.weapon,
    width: mobile.width,
    height: mobile.height,
    angle: mobile.angle,
    facing: mobile.facing,
    moveRange: mobile.moveRange,
    shotDelay: mobile.shotDelay,
    specialCharges: mobile.specialCharges,
    doubleDamageTurns: mobile.doubleDamageTurns,
    verticalVelocity: mobile.verticalVelocity
  };
}
