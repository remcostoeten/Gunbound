import { applyWeatherToFlightState } from "@/features/game/engine/weather";
import { tracePlayerCollision, traceTerrainCollision } from "@/features/game/engine/collision";
import { detectBackshot } from "@/features/game/engine/shot-techniques";
import { clamp, getTerrainNormal } from "@/features/game/engine/terrain";
import type {
  CombatHit,
  ExplosionState,
  ExplosionDamageResult,
  ProjectileState,
} from "@/features/game/types/combat";
import type { Mobile, Player, TerrainState } from "@/features/game/types/entities";
import type { Vec2, WeatherState } from "@/features/game/types/shared";

// A single projectile can resolve into several outcomes in one tick: it may
// keep flying (1), split into a fan of children (N), or detonate (an explosion
// plus 0 live projectiles). Bounce/roll mini-blasts come back as bonusExplosions
// so the lead shot can keep travelling.
export type ProjectileStep = {
  projectiles: ProjectileState[];
  explosions: ExplosionState[];
  bonusExplosions: ExplosionState[];
};

// Horizontal force applied by wind per unit of wind magnitude. Kept well below
// gravity (~530) so the wind bends a shot's arc — costing you range you make up
// with angle and power — without ever overpowering it. At the wind cap this is
// roughly a third of gravity, which guarantees every target stays reachable.
// Exported so the on-canvas aim guide previews the exact same drift.
export const windForceCoefficient = 200;

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
  weather: WeatherState,
  dt: number
): ProjectileStep {
  const previousPosition = projectile.position;
  let velocity = {
    x: projectile.velocity.x + wind.x * windForceCoefficient * projectile.windScale * dt,
    y: projectile.velocity.y + (530 * projectile.gravityScale + wind.y * 120) * dt
  };
  let nextPosition = {
    x: projectile.position.x + velocity.x * dt,
    y: projectile.position.y + velocity.y * dt
  };
  const weatherFlight = applyWeatherToFlightState(
    {
      position: nextPosition,
      previousPosition,
      velocity,
      damage: projectile.damage,
      blastRadius: projectile.blastRadius,
      forceBoosted: projectile.forceBoosted,
      tornadoTriggered: projectile.tornadoTriggered
    },
    weather
  );
  velocity = weatherFlight.velocity;
  nextPosition = weatherFlight.position;
  const effectiveProjectile: ProjectileState = {
    ...projectile,
    damage: weatherFlight.damage,
    blastRadius: weatherFlight.blastRadius,
    forceBoosted: weatherFlight.forceBoosted,
    tornadoTriggered: weatherFlight.tornadoTriggered,
    technique: detectBackshot(projectile.technique, projectile.rearArc, projectile.launchDirection, velocity.x, projectile.life + dt)
  };

  const behavior = projectile.behavior;

  // Air-split: a split shot fractures into a fan of children that come down in
  // two or three directions. We fire it on the first descending tick (the top
  // of the arc) once the shot has cleared the muzzle; a short life guard keeps
  // flat, near-horizontal shots from bursting right at the barrel. Fires once,
  // guarded by hasSplit.
  if (
    behavior.kind === "airSplit" &&
    !projectile.hasSplit &&
    velocity.y >= 0 &&
    projectile.life > 0.18
  ) {
    return {
      projectiles: buildAirSplitChildren(projectile, effectiveProjectile, nextPosition, velocity, dt),
      bonusExplosions: [],
      explosions: []
    };
  }

  const directHit = tracePlayerCollision(players, projectile.owner, previousPosition, nextPosition, projectile.radius);
  if (directHit !== null) {
    return {
      projectiles: [],
      bonusExplosions: [],
      explosions: [
        buildExplosion(effectiveProjectile, {
          x: directHit.mobile.position.x,
          y: directHit.mobile.position.y - directHit.mobile.height * 0.55
        })
      ]
    };
  }

  if (projectile.tunnelingTicks > 0) {
    if (projectile.tunnelingTicks === 1) {
      return {
        projectiles: [],
        bonusExplosions: [],
        explosions: [buildExplosion(effectiveProjectile, nextPosition)]
      };
    }

    return {
      projectiles: [advanceProjectile(projectile, nextPosition, previousPosition, velocity, dt, projectile.tunnelingTicks - 1, weatherFlight.damage, weatherFlight.blastRadius, weatherFlight.forceBoosted, weatherFlight.tornadoTriggered)],
      bonusExplosions: [],
      explosions: []
    };
  }

  const terrainHit = traceTerrainCollision(terrain, previousPosition, nextPosition, projectile.radius);
  if (terrainHit !== null) {
    if (behavior.kind === "drill") {
      return {
        projectiles: [advanceProjectile(projectile, nextPosition, previousPosition, velocity, dt, behavior.drillTicks ?? 22, weatherFlight.damage, weatherFlight.blastRadius, weatherFlight.forceBoosted, weatherFlight.tornadoTriggered)],
        bonusExplosions: [],
        explosions: []
      };
    }

    const canBounce =
      projectile.bouncesLeft > 0 &&
      (projectile.weapon !== "primary" || behavior.kind === "roll");

    if (canBounce) {
      const normal = getTerrainNormal(terrain, terrainHit);
      const reflectedVelocity = reflectVelocity(velocity, normal);
      const reducedVelocity = {
        x: reflectedVelocity.x * 0.72,
        y: reflectedVelocity.y * 0.72
      };
      const magnitude = Math.hypot(reducedVelocity.x, reducedVelocity.y);

      if (magnitude > 120) {
        const bounceExplosions: ExplosionState[] =
          behavior.kind === "roll"
            ? [buildExplosion(effectiveProjectile, terrainHit, effectiveProjectile.damage * 0.35, effectiveProjectile.blastRadius * 0.55)]
            : [];

        return {
          projectiles: [
            {
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
              damage: effectiveProjectile.damage,
              blastRadius: effectiveProjectile.blastRadius,
              bouncesLeft: projectile.bouncesLeft - 1,
              tunnelingTicks: 0,
              power: projectile.power,
              life: projectile.life + dt,
              windScale: projectile.windScale,
              gravityScale: projectile.gravityScale,
              item: projectile.item,
              forceBoosted: weatherFlight.forceBoosted,
              tornadoTriggered: weatherFlight.tornadoTriggered,
              technique: effectiveProjectile.technique,
              launchDirection: projectile.launchDirection,
              rearArc: projectile.rearArc,
              behavior: projectile.behavior,
              fuse: projectile.fuse,
              hasSplit: projectile.hasSplit
            }
          ],
          bonusExplosions: bounceExplosions,
          explosions: []
        };
      }
    }

    return {
      projectiles: [],
      bonusExplosions: [],
      explosions: [buildExplosion(effectiveProjectile, terrainHit)]
    };
  }

  if (nextPosition.y > terrain.height + 40 || nextPosition.x < -40 || nextPosition.x > terrain.width + 40 || projectile.life > 8) {
    return {
      projectiles: [],
      bonusExplosions: [],
      explosions: [
        buildExplosion(effectiveProjectile, {
          x: clamp(nextPosition.x, 0, terrain.width - 1),
          y: clamp(nextPosition.y, 0, terrain.height - 1)
        }, effectiveProjectile.damage * 0.6)
      ]
    };
  }

  return {
    projectiles: [advanceProjectile(projectile, nextPosition, previousPosition, velocity, dt, 0, weatherFlight.damage, weatherFlight.blastRadius, weatherFlight.forceBoosted, weatherFlight.tornadoTriggered)],
    bonusExplosions: [],
    explosions: []
  };
}

// Builds the fanned children for an airSplit shot. Children share the parent's
// owner/weapon/behavior but each gets a horizontal velocity offset so they
// scatter, reduced damage, and hasSplit set so they never split again.
function buildAirSplitChildren(
  projectile: ProjectileState,
  effective: ProjectileState,
  position: Vec2,
  velocity: Vec2,
  dt: number
): ProjectileState[] {
  const count = Math.max(2, projectile.behavior.splitCount ?? 2);
  const spread = projectile.behavior.splitSpread ?? 70;
  const damageMul = projectile.behavior.splitDamageMul ?? 0.6;
  const children: ProjectileState[] = [];
  let index = 0;

  while (index < count) {
    const t = count === 1 ? 0 : index / (count - 1) - 0.5;
    const horizontalOffset = t * 2 * spread;
    children.push({
      active: true,
      position,
      previousPosition: position,
      velocity: { x: velocity.x + horizontalOffset, y: velocity.y - Math.abs(t) * 40 },
      radius: Math.max(3, projectile.radius - 1),
      owner: projectile.owner,
      mobileType: projectile.mobileType,
      weapon: projectile.weapon,
      damage: effective.damage * damageMul,
      blastRadius: effective.blastRadius * 0.86,
      bouncesLeft: projectile.bouncesLeft,
      tunnelingTicks: 0,
      power: projectile.power,
      life: projectile.life + dt,
      windScale: projectile.windScale,
      gravityScale: projectile.gravityScale,
      item: projectile.item,
      forceBoosted: effective.forceBoosted,
      tornadoTriggered: effective.tornadoTriggered,
      technique: effective.technique,
      launchDirection: projectile.launchDirection,
      rearArc: projectile.rearArc,
      behavior: projectile.behavior,
      fuse: null,
      hasSplit: true
    });
    index += 1;
  }

  return children;
}

function advanceProjectile(
  projectile: ProjectileState,
  position: Vec2,
  previousPosition: Vec2,
  velocity: Vec2,
  dt: number,
  tunnelingTicks: number,
  damage: number,
  blastRadius: number,
  forceBoosted: boolean,
  tornadoTriggered: boolean
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
    damage,
    blastRadius,
    bouncesLeft: projectile.bouncesLeft,
    tunnelingTicks,
    power: projectile.power,
    life: projectile.life + dt,
    windScale: projectile.windScale,
    gravityScale: projectile.gravityScale,
    item: projectile.item,
    forceBoosted,
    tornadoTriggered,
    technique: detectBackshot(projectile.technique, projectile.rearArc, projectile.launchDirection, velocity.x, projectile.life + dt),
    launchDirection: projectile.launchDirection,
    rearArc: projectile.rearArc,
    behavior: projectile.behavior,
    fuse: projectile.fuse,
    hasSplit: projectile.hasSplit
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
    weapon: projectile.weapon,
    item: projectile.item,
    vulnerableTurns: projectile.behavior.kind === "debuff" ? projectile.behavior.vulnerableTurns : undefined
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

    // A target softened by a previous defense-down hit takes extra damage.
    if (player.mobile.vulnerableTurns > 0) {
      damage *= 1.25;
    }

    const roundedDamage = Math.round(damage);
    player.mobile.hp = Math.max(0, Math.round(player.mobile.hp - damage));

    // Snow/Ice shots leave a struck enemy defense-down for a few turns.
    if (roundedDamage > 0 && explosion.vulnerableTurns !== undefined && player.id !== explosion.owner) {
      player.mobile.vulnerableTurns = Math.max(player.mobile.vulnerableTurns, explosion.vulnerableTurns);
    }

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
    lastShotAngle: mobile.lastShotAngle,
    lastShotTechnique: mobile.lastShotTechnique,
    doubleDamageTurns: mobile.doubleDamageTurns,
    vulnerableTurns: mobile.vulnerableTurns,
    verticalVelocity: mobile.verticalVelocity
  };
}
