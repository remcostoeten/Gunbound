import { worldHeight, worldWidth } from "@/features/game/constants/world";
import type {
  DamagePopup,
  ExplosionSpriteEffect,
  ExplosionSpriteSheet,
  ExplosionVisual,
  GrassTuft,
  VisualEffectsInput,
  VisualEffectsState
} from "@/features/game/types/effects";
import type { ProjectileState } from "@/features/game/types/combat";
import type { Player } from "@/features/game/types/entities";
import type { GamePhase, GameScene, Vec2 } from "@/features/game/types/shared";

const particleStep = 1 / 60;

export function createVisualEffectsState(): VisualEffectsState {
  return {
    trail: [],
    previousProjectile: null,
    muzzleFlash: null,
    explosionSprites: [],
    debris: [],
    leaves: [],
    sparks: [],
    dust: [],
    hitFlash: null,
    grass: [],
    previousExplosion: null,
    previousPhase: "",
    leafSpawnTimer: 0,
    windParticlesEnabled: false,
    shellCasings: [],
    smokePuffs: [],
    bounceSparks: [],
    fireShake: 0,
    previousBounces: 0,
    lastWeapon: "primary"
  };
}

export function stepVisualEffectsState(state: VisualEffectsState, input: VisualEffectsInput): VisualEffectsState {
  const projectileState = syncProjectileEffects(state, input.projectile, input.players, input.turn);
  const explosionState = syncExplosionEffects(projectileState, input.explosionVisual, input.damagePopups);
  const windState = syncWindLeaves(explosionState, input.wind, input.scene);
  const chargeState = syncChargeSparks(windState, input.charging, input.players, input.turn);
  const dustState = syncDustOnMove(chargeState, input.phase, input.players, input.turn);
  const flashState = syncHitFlash(dustState, input.damagePopups);
  const grassState = syncGrass(flashState, input.terrain);
  const bounceState = syncBounceSparks(grassState, input.projectile);
  const particlesState = updateParticles(bounceState, input.visualTime);
  const muzzleState = tickMuzzleFlash(particlesState, input.dt);
  const hitFlashState = tickHitFlash(muzzleState, input.dt);
  return tickFireShake(hitFlashState, input.dt);
}

function syncProjectileEffects(
  state: VisualEffectsState,
  projectile: ProjectileState | null,
  players: [Player, Player],
  turn: 1 | 2
): VisualEffectsState {
  let nextState = state;

  if (projectile !== null) {
    if (state.previousProjectile === null) {
      nextState = {
        ...nextState,
        muzzleFlash: {
          point: projectile.position,
          radius: 48,
          timer: 0.25,
          duration: 0.25
        },
        fireShake: 0.3,
        trail: []
      };

      const shooter = players[turn - 1];
      const shellCasings = nextState.shellCasings.slice();
      let casingIndex = 0;
      while (casingIndex < 2) {
        shellCasings.push({
          x: projectile.position.x + (Math.random() - 0.5) * 6,
          y: projectile.position.y + (Math.random() - 0.5) * 4,
          vx: (shooter.mobile.facing === 1 ? -1 : 1) * (40 + Math.random() * 30),
          vy: -60 - Math.random() * 40,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 12,
          life: 0.6 + Math.random() * 0.3,
          maxLife: 0.6 + Math.random() * 0.3
        });
        casingIndex += 1;
      }

      const smokePuffs = nextState.smokePuffs.slice();
      let smokeIndex = 0;
      while (smokeIndex < 3) {
        smokePuffs.push({
          x: projectile.position.x + (Math.random() - 0.5) * 8,
          y: projectile.position.y + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 15,
          vy: -15 - Math.random() * 15,
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.4 + Math.random() * 0.3,
          size: 6 + Math.random() * 6,
          alpha: 0.35
        });
        smokeIndex += 1;
      }

      nextState = {
        ...nextState,
        shellCasings,
        smokePuffs,
        lastWeapon: projectile.weapon
      };
    }

    nextState = {
      ...nextState,
      trail: pushTrailPoint(nextState.trail, projectile.position)
    };
  } else {
    nextState = {
      ...nextState,
      trail: decayTrail(nextState.trail)
    };
  }

  return {
    ...nextState,
    previousProjectile: projectile
  };
}

function syncExplosionEffects(state: VisualEffectsState, explosion: ExplosionVisual | null, damagePopups: DamagePopup[]): VisualEffectsState {
  let debris = state.debris;
  let explosionSprites = state.explosionSprites;
  const isNewExplosion = explosion !== null && (state.previousExplosion === null || explosion.timer > state.previousExplosion.timer);

  if (explosion !== null && isNewExplosion) {
    const count = 12 + Math.floor(Math.random() * 8);
    const particles = [];
    let index = 0;
    while (index < count) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      particles.push({
        x: explosion.point.x + (Math.random() - 0.5) * 8,
        y: explosion.point.y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.6 + Math.random() * 0.6,
        maxLife: 0.6 + Math.random() * 0.6,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.5 ? "#8a5433" : "#613923"
      });
      index += 1;
    }
    debris = debris.concat(particles);
    if (debris.length > 120) {
      debris = debris.slice(-120);
    }

    explosionSprites = explosionSprites.concat(createExplosionSpriteEffect(explosion, damagePopups.length > 0));
    if (explosionSprites.length > 8) {
      explosionSprites = explosionSprites.slice(-8);
    }
  }

  return {
    ...state,
    debris,
    explosionSprites,
    previousExplosion: explosion
  };
}

function createExplosionSpriteEffect(explosion: ExplosionVisual, hasDamage: boolean): ExplosionSpriteEffect {
  return {
    point: {
      x: explosion.point.x,
      y: explosion.point.y
    },
    radius: explosion.radius,
    timer: 0,
    duration: 0.62,
    sheet: selectExplosionSpriteSheet(explosion, hasDamage),
    scale: getExplosionSpriteScale(explosion.radius)
  };
}

function selectExplosionSpriteSheet(explosion: ExplosionVisual, hasDamage: boolean): ExplosionSpriteSheet {
  const seed = Math.abs(Math.floor(explosion.point.x * 7 + explosion.point.y * 11 + explosion.radius * 13));
  if (hasDamage && explosion.radius >= 78) {
    return seed % 2 === 0 ? "armor-secondary" : "jd-secondary";
  }
  if (hasDamage) {
    return seed % 2 === 0 ? "armor-primary" : "nak";
  }
  if (explosion.radius >= 82) {
    return seed % 2 === 0 ? "aduka-thor" : "jd-lightning";
  }
  return seed % 2 === 0 ? "gum" : "armor-primary";
}

function getExplosionSpriteScale(radius: number): number {
  return Math.max(0.82, Math.min(1.55, radius / 62));
}

function syncWindLeaves(state: VisualEffectsState, wind: Vec2, scene: GameScene): VisualEffectsState {
  const windParticlesEnabled = scene === "playing";
  if (!windParticlesEnabled) {
    return {
      ...state,
      windParticlesEnabled
    };
  }

  let leafSpawnTimer = state.leafSpawnTimer + 1;
  let leaves = state.leaves;
  const windSpeed = Math.abs(wind.x);
  const spawnRate = Math.max(8, Math.round(40 - windSpeed * 30));

  if (leafSpawnTimer >= spawnRate) {
    leafSpawnTimer = 0;
    const fromLeft = wind.x >= 0;
    const leaf = {
      x: fromLeft ? -30 : worldWidth + 30,
      y: 40 + Math.random() * (worldHeight * 0.55),
      vx: (fromLeft ? 1 : -1) * (20 + Math.abs(wind.x) * 60 + Math.random() * 20),
      vy: (Math.random() - 0.5) * 15,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 4,
      size: 4 + Math.random() * 4,
      alpha: 0.3 + Math.random() * 0.3
    };
    leaves = leaves.concat(leaf);
    if (leaves.length > 30) {
      leaves = leaves.slice(-30);
    }
  }

  return {
    ...state,
    windParticlesEnabled,
    leafSpawnTimer,
    leaves
  };
}

function syncChargeSparks(state: VisualEffectsState, charging: boolean, players: [Player, Player], turn: 1 | 2): VisualEffectsState {
  if (!charging) {
    if (state.sparks.length === 0) {
      return state;
    }

    return {
      ...state,
      sparks: []
    };
  }

  const mobile = players[turn - 1].mobile;
  let sparks = state.sparks.slice();
  let index = 0;
  while (index < 2) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 20;
    sparks.push({
      x: mobile.position.x + Math.cos(angle) * dist,
      y: mobile.position.y - mobile.height * 0.5 + Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 30,
      vy: -20 - Math.random() * 30,
      life: 0.2 + Math.random() * 0.3,
      maxLife: 0.2 + Math.random() * 0.3,
      size: 1.5 + Math.random() * 2
    });
    index += 1;
  }

  if (sparks.length > 40) {
    sparks = sparks.slice(-40);
  }

  return {
    ...state,
    sparks
  };
}

function syncDustOnMove(state: VisualEffectsState, phase: GamePhase, players: [Player, Player], turn: 1 | 2): VisualEffectsState {
  let dust = state.dust;

  if (phase === "move" && state.previousPhase !== "move") {
    dust = dust.slice();
    let index = 0;
    while (index < 4) {
      dust.push({
        x: players[turn - 1].mobile.position.x + (Math.random() - 0.5) * 20,
        y: players[turn - 1].mobile.position.y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 20,
        vy: -10 - Math.random() * 15,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.4 + Math.random() * 0.3,
        size: 3 + Math.random() * 4
      });
      index += 1;
    }
  }

  return {
    ...state,
    dust,
    previousPhase: phase
  };
}

function syncBounceSparks(state: VisualEffectsState, projectile: ProjectileState | null): VisualEffectsState {
  let bounceSparks = state.bounceSparks;

  if (projectile !== null && state.previousProjectile !== null && projectile.bouncesLeft < state.previousBounces) {
    bounceSparks = bounceSparks.slice();
    const count = 6 + Math.floor(Math.random() * 4);
    let index = 0;
    while (index < count) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 100;
      bounceSparks.push({
        x: projectile.position.x + (Math.random() - 0.5) * 4,
        y: projectile.position.y + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.3 + Math.random() * 0.3,
        size: 1.5 + Math.random() * 2
      });
      index += 1;
    }
    if (bounceSparks.length > 60) {
      bounceSparks = bounceSparks.slice(-60);
    }
  }

  return {
    ...state,
    bounceSparks,
    previousBounces: projectile === null ? 0 : projectile.bouncesLeft
  };
}

function syncHitFlash(state: VisualEffectsState, damagePopups: DamagePopup[]): VisualEffectsState {
  if (damagePopups.length > 0 && state.hitFlash === null) {
    return {
      ...state,
      hitFlash: { alpha: 0.15, timer: 0.25 }
    };
  }

  return state;
}

function syncGrass(state: VisualEffectsState, terrain: { width: number; heights: number[] } | null): VisualEffectsState {
  if (terrain === null || state.grass.length > 0) {
    return state;
  }

  return {
    ...state,
    grass: createGrassTufts(terrain.width, terrain.heights)
  };
}

function createGrassTufts(width: number, heights: number[]): GrassTuft[] {
  const tufts: GrassTuft[] = [];
  let x = 0;
  while (x < width) {
    if (Math.random() < 0.12) {
      tufts.push({
        x: x + (Math.random() - 0.5) * 3,
        y: heights[x],
        height: 5 + Math.random() * 8,
        sway: Math.random() * Math.PI * 2
      });
    }
    x += 1;
  }
  return tufts;
}

function updateParticles(state: VisualEffectsState, visualTime: number): VisualEffectsState {
  return {
    ...state,
    explosionSprites: state.explosionSprites
      .map(function mapExplosionSprite(sprite) {
        return {
          ...sprite,
          timer: sprite.timer + particleStep
        };
      })
      .filter(function filterExplosionSprite(sprite) {
        return sprite.timer < sprite.duration;
      }),
    debris: state.debris
      .map(function mapDebris(p) {
        return {
          ...p,
          x: p.x + p.vx * particleStep,
          y: p.y + p.vy * particleStep,
          vy: p.vy + 320 * particleStep,
          life: p.life - particleStep
        };
      })
      .filter(function filterDebris(p) {
        return p.life > 0;
      }),
    leaves: state.leaves
      .map(function mapLeaves(l) {
        return {
          ...l,
          x: l.x + l.vx * particleStep,
          y: l.y + l.vy * particleStep + Math.sin(visualTime * 2 + l.x * 0.01) * 0.3,
          rotation: l.rotation + l.rotSpeed * particleStep,
          vy: l.vy + 4 * particleStep,
          alpha: l.alpha * 0.998
        };
      })
      .filter(function filterLeaves(l) {
        return l.x > -60 && l.x < worldWidth + 60 && l.y < worldHeight + 20 && l.alpha > 0.01;
      }),
    sparks: state.sparks
      .map(function mapSparks(s) {
        return {
          ...s,
          x: s.x + s.vx * particleStep,
          y: s.y + s.vy * particleStep,
          vy: s.vy + 60 * particleStep,
          life: s.life - particleStep
        };
      })
      .filter(function filterSparks(s) {
        return s.life > 0;
      }),
    dust: state.dust
      .map(function mapDust(d) {
        return {
          ...d,
          x: d.x + d.vx * particleStep,
          y: d.y + d.vy * particleStep,
          vy: d.vy + 30 * particleStep,
          life: d.life - particleStep,
          size: d.size + 6 * particleStep
        };
      })
      .filter(function filterDust(d) {
        return d.life > 0;
      }),
    shellCasings: state.shellCasings
      .map(function mapCasing(c) {
        return {
          ...c,
          x: c.x + c.vx * particleStep,
          y: c.y + c.vy * particleStep,
          vy: c.vy + 280 * particleStep,
          rotation: c.rotation + c.rotSpeed * particleStep,
          life: c.life - particleStep
        };
      })
      .filter(function filterCasing(c) {
        return c.life > 0;
      }),
    smokePuffs: state.smokePuffs
      .map(function mapSmoke(s) {
        return {
          ...s,
          x: s.x + s.vx * particleStep,
          y: s.y + s.vy * particleStep,
          vy: s.vy + 15 * particleStep,
          life: s.life - particleStep,
          size: s.size + 12 * particleStep,
          alpha: s.alpha - 0.5 * particleStep
        };
      })
      .filter(function filterSmoke(s) {
        return s.life > 0 && s.alpha > 0;
      }),
    bounceSparks: state.bounceSparks
      .map(function mapBounce(s) {
        return {
          ...s,
          x: s.x + s.vx * particleStep,
          y: s.y + s.vy * particleStep,
          vy: s.vy + 160 * particleStep,
          life: s.life - particleStep
        };
      })
      .filter(function filterBounce(s) {
        return s.life > 0;
      })
  };
}

function tickMuzzleFlash(state: VisualEffectsState, delta: number): VisualEffectsState {
  const muzzleFlash = state.muzzleFlash;
  if (muzzleFlash === null) {
    return state;
  }

  const nextTimer = muzzleFlash.timer - delta;
  if (nextTimer <= 0) {
    return {
      ...state,
      muzzleFlash: null
    };
  }

  return {
    ...state,
    muzzleFlash: {
      point: muzzleFlash.point,
      radius: muzzleFlash.radius,
      timer: nextTimer,
      duration: muzzleFlash.duration
    }
  };
}

function tickHitFlash(state: VisualEffectsState, delta: number): VisualEffectsState {
  const flash = state.hitFlash;
  if (flash === null) {
    return state;
  }

  const nextFlash = {
    alpha: flash.alpha * 0.94,
    timer: flash.timer - delta
  };

  if (nextFlash.timer <= 0 || nextFlash.alpha < 0.01) {
    return {
      ...state,
      hitFlash: null
    };
  }

  return {
    ...state,
    hitFlash: nextFlash
  };
}

function tickFireShake(state: VisualEffectsState, delta: number): VisualEffectsState {
  if (state.fireShake <= 0) {
    return state;
  }

  return {
    ...state,
    fireShake: Math.max(0, state.fireShake - delta)
  };
}

function pushTrailPoint(trail: Vec2[], point: Vec2): Vec2[] {
  const nextTrail = trail.concat({
    x: point.x,
    y: point.y
  });
  if (nextTrail.length > 28) {
    return nextTrail.slice(1);
  }
  return nextTrail;
}

function decayTrail(trail: Vec2[]): Vec2[] {
  if (trail.length === 0) {
    return trail;
  }

  return trail.slice(1);
}
