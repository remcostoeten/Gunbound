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
};

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
