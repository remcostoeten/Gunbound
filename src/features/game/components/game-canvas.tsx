"use client";

import { useEffect, useRef } from "react";
import { getTerrainPalette } from "@/features/game/engine/terrain";
import { getMobileSpriteFrame, getMobileSpriteSource } from "@/features/game/engine/mobile-sprites";
import { getLaunchRadians, getMuzzlePosition } from "@/features/game/engine/physics";
import { useGameLoop } from "@/features/game/hooks/use-game-loop";
import { useInput } from "@/features/game/hooks/use-input";
import { useGameStore } from "@/features/game/store/game-store";
import { worldHeight, worldWidth } from "@/features/game/constants/world";
import type { ProjectileState } from "@/features/game/types/combat";
import type { BonusBox, Player, TerrainState } from "@/features/game/types/entities";
import type { DamagePopup, ExplosionVisual } from "@/features/game/types/effects";
import type { MobileType, PlayerAccent, TerrainTheme, Vec2, WeaponType } from "@/features/game/types/shared";

type SpriteCache = {
  armor: HTMLImageElement | null;
  knight: HTMLImageElement | null;
};

type DebrisParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

type WindLeaf = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  alpha: number;
};

type ChargeSpark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

type DustPuff = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

type HitFlash = {
  alpha: number;
  timer: number;
};

type ShellCasing = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
};

type SmokePuff = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
};

type BounceSpark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

type GrassTuft = {
  x: number;
  y: number;
  height: number;
  sway: number;
};

export function GameCanvas(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousFrameTimeRef = useRef(0);
  const visualTimeRef = useRef(0);
  const trailRef = useRef<Vec2[]>([]);
  const previousProjectileRef = useRef<ProjectileState | null>(null);
  const muzzleFlashRef = useRef<ExplosionVisual | null>(null);
  const spriteCacheRef = useRef<SpriteCache>({
    armor: null,
    knight: null
  });
  const debrisRef = useRef<DebrisParticle[]>([]);
  const leavesRef = useRef<WindLeaf[]>([]);
  const sparksRef = useRef<ChargeSpark[]>([]);
  const dustRef = useRef<DustPuff[]>([]);
  const hitFlashRef = useRef<HitFlash | null>(null);
  const grassRef = useRef<GrassTuft[]>([]);
  const previousExplosionRef = useRef<ExplosionVisual | null>(null);
  const previousPhaseRef = useRef<string>("");
  const leafSpawnTimerRef = useRef(0);
  const windParticlesEnabledRef = useRef(false);
  const shellCasingsRef = useRef<ShellCasing[]>([]);
  const smokePuffsRef = useRef<SmokePuff[]>([]);
  const bounceSparksRef = useRef<BounceSpark[]>([]);
  const fireShakeRef = useRef(0);
  const previousBouncesRef2 = useRef(0);
  const lastWeaponRef = useRef<WeaponType>("primary");

  useInput();
  useGameLoop(drawFrame);
  useEffect(setupCanvas, []);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Gunbound game canvas" />;

  function setupCanvas(): void {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    canvas.width = worldWidth;
    canvas.height = worldHeight;
    loadMobileSprites(spriteCacheRef.current);
  }

  function drawFrame(): void {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const context = canvas.getContext("2d");
    if (context === null) return;

    context.imageSmoothingEnabled = false;
    advanceVisualClock();

    const state = useGameStore.getState();
    syncProjectileEffects(state.projectile, state.players, state.turn);
    syncExplosionDebris(state.explosionVisual);
    syncWindLeaves(state.wind, state.scene);
    syncChargeSparks(state.charging, state.players, state.turn);
    syncDustOnMove(state.phase, state.players, state.turn);
    syncHitFlash(state.damagePopups);
    syncGrass(state.terrain);
    syncBounceSparks(state.projectile);
    updateParticles();
    syncParticleData();

    context.save();
    applyCameraShake(context, state.explosionVisual);

    drawBackground(context, state.terrain?.theme || "meadow", visualTimeRef.current);

    if (state.terrain !== null) {
      drawTerrain(context, state.terrain);
      drawGrass(context, state.terrain, visualTimeRef.current, state.wind);
    }

    drawBonusBoxes(context, state.bonusBoxes);

    if (state.scene === "playing" && state.projectile === null && state.terrain !== null) {
      drawAimGuide(context, state.players[state.turn - 1], state.wind, state.power, state.charging, state.terrain);
    }

    drawProjectileTrail(context, trailRef.current);
    drawWindLeaves(context, visualTimeRef.current);
    drawPlayers(context, state.players, state.turn, visualTimeRef.current, spriteCacheRef.current);

    if (state.projectile !== null) {
      drawProjectile(context, state.projectile);
    }

    drawChargeSparks(context);
    drawDustPuffs(context);
    drawDebris(context);
    drawShellCasings(context);
    drawSmokePuffs(context);
    drawBounceSparks(context);
    drawMuzzleFlash(context, muzzleFlashRef.current);
    drawExplosionVisual(context, state.explosionVisual);
    drawDamagePopups(context, state.damagePopups);
    drawHitFlash(context, hitFlashRef.current);
    context.restore();
  }

  function advanceVisualClock(): void {
    const now = performance.now();
    if (previousFrameTimeRef.current === 0) {
      previousFrameTimeRef.current = now;
      return;
    }
    const delta = Math.min(0.05, (now - previousFrameTimeRef.current) / 1000);
    previousFrameTimeRef.current = now;
    visualTimeRef.current += delta;
    tickMuzzleFlash(delta);
    tickHitFlash(delta);
    tickFireShake(delta);
  }

  function syncProjectileEffects(projectile: ProjectileState | null, players: [Player, Player], turn: 1 | 2): void {
    if (projectile !== null) {
      if (previousProjectileRef.current === null) {
        muzzleFlashRef.current = {
          point: projectile.position,
          radius: 48,
          timer: 0.25,
          duration: 0.25
        };
        fireShakeRef.current = 0.3;
        trailRef.current = [];

        const shooter = players[turn - 1];
        for (let i = 0; i < 2; i++) {
          const casingAngle = Math.random() * 0.8 - 0.5;
          shellCasingsRef.current.push({
            x: projectile.position.x + (Math.random() - 0.5) * 6,
            y: projectile.position.y + (Math.random() - 0.5) * 4,
            vx: (shooter.mobile.facing === 1 ? -1 : 1) * (40 + Math.random() * 30),
            vy: -60 - Math.random() * 40,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 12,
            life: 0.6 + Math.random() * 0.3,
            maxLife: 0.6 + Math.random() * 0.3,
          });
        }

        for (let i = 0; i < 3; i++) {
          smokePuffsRef.current.push({
            x: projectile.position.x + (Math.random() - 0.5) * 8,
            y: projectile.position.y + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 15,
            vy: -15 - Math.random() * 15,
            life: 0.4 + Math.random() * 0.3,
            maxLife: 0.4 + Math.random() * 0.3,
            size: 6 + Math.random() * 6,
            alpha: 0.35,
          });
        }

        lastWeaponRef.current = projectile.weapon;
      }
      pushTrailPoint(projectile.position);
    } else {
      decayTrail();
    }
    previousProjectileRef.current = projectile;
  }

  function syncExplosionDebris(explosion: ExplosionVisual | null): void {
    if (explosion !== null && (previousExplosionRef.current === null || explosion.timer > previousExplosionRef.current.timer)) {
      const count = 12 + Math.floor(Math.random() * 8);
      const particles: DebrisParticle[] = [];
      for (let i = 0; i < count; i++) {
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
          color: Math.random() > 0.5 ? "#8a5433" : "#613923",
        });
      }
      debrisRef.current = debrisRef.current.concat(particles);
      if (debrisRef.current.length > 120) {
        debrisRef.current = debrisRef.current.slice(-120);
      }
    }
    previousExplosionRef.current = explosion;
  }

  function syncWindLeaves(wind: { x: number; y: number }, scene: string): void {
    windParticlesEnabledRef.current = scene === "playing";

    if (!windParticlesEnabledRef.current) return;

    leafSpawnTimerRef.current += 1;
    const windSpeed = Math.abs(wind.x);
    const spawnRate = Math.max(8, Math.round(40 - windSpeed * 30));

    if (leafSpawnTimerRef.current >= spawnRate) {
      leafSpawnTimerRef.current = 0;
      const fromLeft = wind.x >= 0;
      const leaf: WindLeaf = {
        x: fromLeft ? -30 : worldWidth + 30,
        y: 40 + Math.random() * (worldHeight * 0.55),
        vx: (fromLeft ? 1 : -1) * (20 + Math.abs(wind.x) * 60 + Math.random() * 20),
        vy: (Math.random() - 0.5) * 15,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 4,
        size: 4 + Math.random() * 4,
        alpha: 0.3 + Math.random() * 0.3,
      };
      leavesRef.current.push(leaf);
      if (leavesRef.current.length > 30) {
        leavesRef.current.shift();
      }
    }
  }

  function syncChargeSparks(charging: boolean, players: [Player, Player], turn: 1 | 2): void {
    if (!charging) {
      if (sparksRef.current.length > 0) {
        sparksRef.current = [];
      }
      return;
    }

    const mobile = players[turn - 1].mobile;
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 14 + Math.random() * 20;
      sparksRef.current.push({
        x: mobile.position.x + Math.cos(angle) * dist,
        y: mobile.position.y - mobile.height * 0.5 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 30,
        vy: -20 - Math.random() * 30,
        life: 0.2 + Math.random() * 0.3,
        maxLife: 0.2 + Math.random() * 0.3,
        size: 1.5 + Math.random() * 2,
      });
    }

    if (sparksRef.current.length > 40) {
      sparksRef.current = sparksRef.current.slice(-40);
    }
  }

  function syncDustOnMove(phase: string, _players: [Player, Player], _turn: 1 | 2): void {
    if (phase === "move" && previousPhaseRef.current !== "move") {
      for (let i = 0; i < 4; i++) {
        dustRef.current.push({
          x: _players[_turn - 1].mobile.position.x + (Math.random() - 0.5) * 20,
          y: _players[_turn - 1].mobile.position.y + (Math.random() - 0.5) * 4,
          vx: (Math.random() - 0.5) * 20,
          vy: -10 - Math.random() * 15,
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.4 + Math.random() * 0.3,
          size: 3 + Math.random() * 4,
        });
      }
    }
    previousPhaseRef.current = phase;
  }

  function syncBounceSparks(projectile: ProjectileState | null): void {
    if (projectile !== null && previousProjectileRef.current !== null) {
      if (projectile.bouncesLeft < previousBouncesRef2.current) {
        const count = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 40 + Math.random() * 100;
          bounceSparksRef.current.push({
            x: projectile.position.x + (Math.random() - 0.5) * 4,
            y: projectile.position.y + (Math.random() - 0.5) * 4,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 30,
            life: 0.3 + Math.random() * 0.3,
            maxLife: 0.3 + Math.random() * 0.3,
            size: 1.5 + Math.random() * 2,
          });
        }
        if (bounceSparksRef.current.length > 60) {
          bounceSparksRef.current = bounceSparksRef.current.slice(-60);
        }
      }
    }
    if (projectile === null) {
      previousBouncesRef2.current = 0;
    } else {
      previousBouncesRef2.current = projectile.bouncesLeft;
    }
  }

  function syncHitFlash(damagePopups: DamagePopup[]): void {
    if (damagePopups.length > 0 && hitFlashRef.current === null) {
      hitFlashRef.current = { alpha: 0.15, timer: 0.25 };
    }
  }

  function syncGrass(terrain: TerrainState | null): void {
    if (terrain === null) return;
    if (grassRef.current.length > 0) {
      setGrassData(grassRef.current);
      return;
    }

    const tufts: GrassTuft[] = [];
    let x = 0;
    while (x < terrain.width) {
      if (Math.random() < 0.12) {
        tufts.push({
          x: x + (Math.random() - 0.5) * 3,
          y: terrain.heights[x],
          height: 5 + Math.random() * 8,
          sway: Math.random() * Math.PI * 2,
        });
      }
      x += 1;
    }
    grassRef.current = tufts;
    setGrassData(tufts);
  }

  function updateParticles(): void {
    const dt = 1 / 60;

    debrisRef.current = debrisRef.current
      .map(p => ({
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        vy: p.vy + 320 * dt,
        life: p.life - dt,
      }))
      .filter(p => p.life > 0);

    leavesRef.current = leavesRef.current
      .map(l => ({
        ...l,
        x: l.x + l.vx * dt,
        y: l.y + l.vy * dt + Math.sin(visualTimeRef.current * 2 + l.x * 0.01) * 0.3,
        rotation: l.rotation + l.rotSpeed * dt,
        vy: l.vy + 4 * dt,
        alpha: l.alpha * 0.998,
      }))
      .filter(l => l.x > -60 && l.x < worldWidth + 60 && l.y < worldHeight + 20 && l.alpha > 0.01);

    sparksRef.current = sparksRef.current
      .map(s => ({
        ...s,
        x: s.x + s.vx * dt,
        y: s.y + s.vy * dt,
        vy: s.vy + 60 * dt,
        life: s.life - dt,
      }))
      .filter(s => s.life > 0);

    dustRef.current = dustRef.current
      .map(d => ({
        ...d,
        x: d.x + d.vx * dt,
        y: d.y + d.vy * dt,
        vy: d.vy + 30 * dt,
        life: d.life - dt,
        size: d.size + 6 * dt,
      }))
      .filter(d => d.life > 0);

    if (shellCasingsRef.current.length > 0) {
      shellCasingsRef.current = shellCasingsRef.current
        .map(c => ({
          ...c,
          x: c.x + c.vx * dt,
          y: c.y + c.vy * dt,
          vy: c.vy + 280 * dt,
          rotation: c.rotation + c.rotSpeed * dt,
          life: c.life - dt,
        }))
        .filter(c => c.life > 0);
    }

    if (smokePuffsRef.current.length > 0) {
      smokePuffsRef.current = smokePuffsRef.current
        .map(s => ({
          ...s,
          x: s.x + s.vx * dt,
          y: s.y + s.vy * dt,
          vy: s.vy + 15 * dt,
          life: s.life - dt,
          size: s.size + 12 * dt,
          alpha: s.alpha - 0.5 * dt,
        }))
        .filter(s => s.life > 0 && s.alpha > 0);
    }

    if (bounceSparksRef.current.length > 0) {
      bounceSparksRef.current = bounceSparksRef.current
        .map(s => ({
          ...s,
          x: s.x + s.vx * dt,
          y: s.y + s.vy * dt,
          vy: s.vy + 160 * dt,
          life: s.life - dt,
        }))
        .filter(s => s.life > 0);
    }
  }

  function tickFireShake(delta: number): void {
    if (fireShakeRef.current > 0) {
      fireShakeRef.current = Math.max(0, fireShakeRef.current - delta);
    }
  }

  function syncParticleData(): void {
    setDebrisData(debrisRef.current);
    setLeafData(leavesRef.current);
    setSparkData(sparksRef.current);
    setDustData(dustRef.current);
    setCasingData(shellCasingsRef.current);
    setSmokeData(smokePuffsRef.current);
    setBounceData(bounceSparksRef.current);
    fireShakeData = fireShakeRef.current;
    setLastWeapon(lastWeaponRef.current);
  }

  function tickMuzzleFlash(delta: number): void {
    const muzzleFlash = muzzleFlashRef.current;
    if (muzzleFlash === null) return;
    const nextTimer = muzzleFlash.timer - delta;
    if (nextTimer <= 0) {
      muzzleFlashRef.current = null;
      return;
    }
    muzzleFlashRef.current = {
      point: muzzleFlash.point,
      radius: muzzleFlash.radius,
      timer: nextTimer,
      duration: muzzleFlash.duration
    };
  }

  function tickHitFlash(delta: number): void {
    const flash = hitFlashRef.current;
    if (flash === null) return;
    flash.timer -= delta;
    flash.alpha *= 0.94;
    if (flash.timer <= 0 || flash.alpha < 0.01) {
      hitFlashRef.current = null;
    }
  }

  function pushTrailPoint(point: Vec2): void {
    trailRef.current.push({ x: point.x, y: point.y });
    if (trailRef.current.length > 28) trailRef.current.shift();
  }

  function decayTrail(): void {
    if (trailRef.current.length > 0) trailRef.current.shift();
  }
}

// ---- Drawing helpers ----

function drawBackground(context: CanvasRenderingContext2D, theme: TerrainTheme, visualTime: number): void {
  const palette = getSkyPalette(theme);
  const gradient = context.createLinearGradient(0, 0, 0, worldHeight);
  gradient.addColorStop(0, palette.skyTop);
  gradient.addColorStop(0.45, palette.skyMid);
  gradient.addColorStop(1, palette.skyBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, worldWidth, worldHeight);

  drawSun(context, theme);
  drawCloud(context, 175 + Math.sin(visualTime * 0.16) * 12, 135, 1.18, palette.cloudAlpha);
  drawCloud(context, 418 + Math.sin(visualTime * 0.14 + 1.3) * 10, 110, 0.9, palette.cloudAlpha * 0.84);
  drawCloud(context, 985 + Math.sin(visualTime * 0.11 + 2.2) * 14, 100, 1.04, palette.cloudAlpha * 0.9);
  drawCloud(context, 1120 + Math.sin(visualTime * 0.19 + 0.7) * 8, 172, 0.82, palette.cloudAlpha * 0.72);
  drawBackMountains(context, theme);
  drawFrontMountains(context, theme);
}

function drawTerrain(context: CanvasRenderingContext2D, terrain: TerrainState): void {
  if (terrain.canvas !== null) {
    context.drawImage(terrain.canvas, 0, 0);
  }

  context.strokeStyle = "#d8f5a0";
  if (terrain.theme === "sunset") {
    context.strokeStyle = "#ffd889";
  }
  if (terrain.theme === "midnight") {
    context.strokeStyle = "#b7efcf";
  }
  context.lineWidth = 3;
  context.beginPath();
  let x = 0;
  while (x < terrain.heights.length) {
    const y = terrain.heights[x];
    if (x === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
    x += 8;
  }
  context.stroke();
  context.strokeStyle = "rgba(57, 31, 18, 0.35)";
  context.lineWidth = 1;
  context.stroke();
}

function drawGrass(context: CanvasRenderingContext2D, terrain: TerrainState, visualTime: number, wind: { x: number; y: number }): void {
  const palette = getTerrainPalette(terrain.theme);
  const grassData = getGrassData();
  for (let i = 0; i < grassData.length; i++) {
    const g = grassData[i];
    const sway = Math.sin(visualTime * 2.4 + g.sway) * 3 + wind.x * 4;
    context.strokeStyle = "rgba(" + String(palette.grassMid[0]) + ", " + String(palette.grassMid[1]) + ", " + String(palette.grassMid[2]) + ", 0.7)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(g.x, g.y);
    context.quadraticCurveTo(g.x + sway * 0.5, g.y - g.height * 0.8, g.x + sway, g.y - g.height);
    context.stroke();
  }
}

let cachedGrass: GrassTuft[] | null = null;
function getGrassData(): GrassTuft[] {
  return cachedGrass || [];
}

export function invalidateGrassCache(): void {
  cachedGrass = null;
}

export function setGrassData(grass: GrassTuft[]): void {
  cachedGrass = grass;
}

// ---- Bonus boxes ----

function drawBonusBoxes(context: CanvasRenderingContext2D, bonusBoxes: BonusBox[]): void {
  let index = 0;
  while (index < bonusBoxes.length) {
    const box = bonusBoxes[index];
    if (!box.landed) {
      drawParachute(context, box.position.x, box.position.y - 34, getBonusParachuteColor(box.type));
    }
    context.strokeStyle = "#5f3217";
    context.fillStyle = "#a56738";
    context.lineWidth = 2;
    context.fillRect(box.position.x - 12, box.position.y - 28, 24, 22);
    context.strokeRect(box.position.x - 12, box.position.y - 28, 24, 22);
    context.strokeStyle = "#704021";
    context.beginPath();
    context.moveTo(box.position.x - 6, box.position.y - 28);
    context.lineTo(box.position.x - 6, box.position.y - 6);
    context.moveTo(box.position.x + 4, box.position.y - 28);
    context.lineTo(box.position.x + 4, box.position.y - 6);
    context.stroke();
    context.fillStyle = "#fff5cc";
    context.font = '700 10px "Press Start 2P"';
    context.textAlign = "center";
    context.fillText(getBonusShortLabel(box.type), box.position.x, box.position.y - 12);
    index += 1;
  }
}

// ---- Players ----

function drawPlayers(context: CanvasRenderingContext2D, players: [Player, Player], turn: 1 | 2, visualTime: number, spriteCache: SpriteCache): void {
  let index = 0;
  while (index < players.length) {
    const player = players[index];
    const isTurn = player.id === turn;
    drawMobile(context, player, isTurn, visualTime, spriteCache);
    index += 1;
  }
}

function drawMobile(context: CanvasRenderingContext2D, player: Player, isTurn: boolean, visualTime: number, spriteCache: SpriteCache): void {
  const accent = getAccentColor(player.accent);
  const bob = Math.sin((player.mobile.position.x * 0.02 + visualTime * 4.2) * 0.9) * 1.6;

  if (isTurn) {
    drawTurnGlow(context, player.mobile.position.x, player.mobile.position.y + bob, accent);
  }

  context.save();
  context.translate(0, bob);
  drawAccentAura(context, player, accent);
  drawMobileShadow(context, player);
  drawMobileSprite(context, player, spriteCache, visualTime);
  drawHpTickMarks(context, player);
  drawPennant(context, player, accent);
  context.restore();
}

function getTurretAngle(player: Player): number {
  const degrees = player.mobile.facing === 1 ? player.mobile.angle : 180 - player.mobile.angle;
  return (degrees * Math.PI) / 180;
}

function drawProjectile(context: CanvasRenderingContext2D, projectile: ProjectileState): void {
  const isSecondary = projectile.weapon === "secondary";
  const color = isSecondary ? "#ffe7a5" : "#ffffff";
  const glowColor = isSecondary ? "rgba(255, 211, 97, 0.85)" : "rgba(255, 255, 255, 0.75)";

  context.shadowBlur = 20;
  context.shadowColor = glowColor;
  context.fillStyle = color;
  context.beginPath();
  context.arc(projectile.position.x, projectile.position.y, projectile.radius + 1, 0, Math.PI * 2);
  context.fill();

  context.shadowBlur = 8;
  context.fillStyle = isSecondary ? "#fff5d4" : "#ffffff";
  context.beginPath();
  context.arc(projectile.position.x, projectile.position.y, projectile.radius * 0.5, 0, Math.PI * 2);
  context.fill();

  context.shadowBlur = 0;
}

function getBonusShortLabel(type: BonusBox["type"]): string {
  if (type === "weapon") return "W";
  if (type === "repair") return "HP";
  return "2X";
}

function loadMobileSprites(spriteCache: SpriteCache): void {
  if (typeof Image === "undefined") return;
  if (spriteCache.armor === null) spriteCache.armor = createMobileSpriteImage("armor");
  if (spriteCache.knight === null) spriteCache.knight = createMobileSpriteImage("knight");
}

function createMobileSpriteImage(type: MobileType): HTMLImageElement {
  const image = new Image();
  image.src = getMobileSpriteSource(type).path;
  return image;
}

function drawMobileShadow(context: CanvasRenderingContext2D, player: Player): void {
  context.fillStyle = "rgba(28, 47, 54, 0.24)";
  context.beginPath();
  context.ellipse(player.mobile.position.x, player.mobile.position.y + 6, player.mobile.width * 0.78, 8, 0, 0, Math.PI * 2);
  context.fill();
}

function drawMobileSprite(context: CanvasRenderingContext2D, player: Player, spriteCache: SpriteCache, visualTime: number): void {
  const sprite = getCachedSprite(spriteCache, player.mobile.type);
  if (sprite === null || !sprite.complete || sprite.naturalWidth === 0) {
    drawFallbackMobile(context, player);
    return;
  }

  const spriteSource = getMobileSpriteSource(player.mobile.type);
  const frame = getMobileSpriteFrame(visualTime + player.id * 0.17, 6.5);
  const destinationX = player.mobile.position.x - 31;
  const destinationY = player.mobile.position.y - 50;

  context.save();
  if (player.mobile.facing === -1) {
    context.translate(player.mobile.position.x, 0);
    context.scale(-1, 1);
    context.translate(-player.mobile.position.x, 0);
  }
  context.drawImage(
    sprite, frame * spriteSource.width, 0, spriteSource.width, spriteSource.height,
    destinationX, destinationY, spriteSource.width, spriteSource.height
  );
  context.restore();
}

function getCachedSprite(spriteCache: SpriteCache, type: MobileType): HTMLImageElement | null {
  return type === "armor" ? spriteCache.armor : spriteCache.knight;
}

function drawFallbackMobile(context: CanvasRenderingContext2D, player: Player): void {
  if (player.mobile.type === "armor") {
    drawArmorMobile(context, player, "#62c3ff");
  } else {
    drawKnightMobile(context, player, "#ff9262");
  }
}

function drawHpTickMarks(context: CanvasRenderingContext2D, player: Player): void {
  const ratio = player.mobile.hp / player.mobile.maxHp;
  const filled = Math.max(0, Math.round(ratio * 5));
  let index = 0;
  while (index < 5) {
    context.fillStyle = index < filled ? "#ffe38d" : "rgba(16, 30, 48, 0.6)";
    context.fillRect(player.mobile.position.x - 14 + index * 6, player.mobile.position.y - player.mobile.height - 10, 4, 3);
    index += 1;
  }
}

function applyCameraShake(context: CanvasRenderingContext2D, explosionVisual: ExplosionVisual | null): void {
  let shakeIntensity = 0;
  if (explosionVisual !== null) {
    shakeIntensity = Math.max(shakeIntensity, (explosionVisual.timer / explosionVisual.duration) * 12);
  }
  const fireShake = getFireShake();
  if (fireShake > 0) {
    shakeIntensity = Math.max(shakeIntensity, fireShake * 3);
  }
  if (shakeIntensity > 0) {
    const offsetX = (Math.random() - 0.5) * shakeIntensity;
    const offsetY = (Math.random() - 0.5) * shakeIntensity * 0.8;
    context.translate(offsetX, offsetY);
  }
}

function drawProjectileTrail(context: CanvasRenderingContext2D, trail: Vec2[]): void {
  if (trail.length < 2) return;
  const weaponType = getLastWeapon();
  const color = weaponType === "secondary" ? "255, 211, 97" : "255, 250, 220";
  let index = 0;
  while (index < trail.length) {
    const point = trail[index];
    const alpha = (index + 1) / trail.length;
    const radius = 1 + alpha * 4;
    context.shadowBlur = 6 * alpha;
    context.shadowColor = "rgba(" + color + ", " + String(alpha * 0.5) + ")";
    context.fillStyle = "rgba(" + color + ", " + String(alpha * 0.5) + ")";
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
    index += 1;
  }
  context.shadowBlur = 0;
}

function drawMuzzleFlash(context: CanvasRenderingContext2D, muzzleFlash: ExplosionVisual | null): void {
  if (muzzleFlash === null) return;
  const progress = muzzleFlash.timer / muzzleFlash.duration;
  const radius = (1 - progress) * muzzleFlash.radius;
  const gradient = context.createRadialGradient(muzzleFlash.point.x, muzzleFlash.point.y, 0, muzzleFlash.point.x, muzzleFlash.point.y, radius);
  gradient.addColorStop(0, "rgba(255, 248, 213, 0.85)");
  gradient.addColorStop(0.5, "rgba(255, 197, 98, 0.54)");
  gradient.addColorStop(1, "rgba(255, 197, 98, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(muzzleFlash.point.x, muzzleFlash.point.y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawExplosionVisual(context: CanvasRenderingContext2D, explosionVisual: ExplosionVisual | null): void {
  if (explosionVisual === null) return;
  const progress = 1 - explosionVisual.timer / explosionVisual.duration;
  const alpha = 1 - progress;

  const flashRadius = explosionVisual.radius * (0.2 + progress * 0.5);
  const flashGradient = context.createRadialGradient(explosionVisual.point.x, explosionVisual.point.y, 0, explosionVisual.point.x, explosionVisual.point.y, flashRadius);
  flashGradient.addColorStop(0, "rgba(255, 255, 255, " + String(alpha * 0.95) + ")");
  flashGradient.addColorStop(0.3, "rgba(255, 242, 183, " + String(alpha * 0.85) + ")");
  flashGradient.addColorStop(0.7, "rgba(255, 190, 80, " + String(alpha * 0.5) + ")");
  flashGradient.addColorStop(1, "rgba(255, 190, 80, 0)");
  context.fillStyle = flashGradient;
  context.beginPath();
  context.arc(explosionVisual.point.x, explosionVisual.point.y, flashRadius, 0, Math.PI * 2);
  context.fill();

  const smokeRadius = explosionVisual.radius * (0.6 + progress * 0.8);
  const smokeGradient = context.createRadialGradient(explosionVisual.point.x, explosionVisual.point.y, 0, explosionVisual.point.x, explosionVisual.point.y, smokeRadius);
  smokeGradient.addColorStop(0, "rgba(255, 200, 100, " + String(alpha * 0.6) + ")");
  smokeGradient.addColorStop(0.4, "rgba(180, 110, 50, " + String(alpha * 0.5) + ")");
  smokeGradient.addColorStop(0.8, "rgba(100, 65, 40, " + String(alpha * 0.3) + ")");
  smokeGradient.addColorStop(1, "rgba(100, 65, 40, 0)");
  context.fillStyle = smokeGradient;
  context.beginPath();
  context.arc(explosionVisual.point.x, explosionVisual.point.y, smokeRadius, 0, Math.PI * 2);
  context.fill();

  const ringRadius = explosionVisual.radius * (0.4 + progress * 1.0);
  context.strokeStyle = "rgba(255, 252, 229, " + String(alpha * 0.8) + ")";
  context.lineWidth = 6 * alpha + 1;
  context.beginPath();
  context.arc(explosionVisual.point.x, explosionVisual.point.y, ringRadius, 0, Math.PI * 2);
  context.stroke();

  const outerRingRadius = explosionVisual.radius * (0.5 + progress * 1.1);
  context.strokeStyle = "rgba(200, 140, 80, " + String(alpha * 0.35) + ")";
  context.lineWidth = 3 * alpha + 1;
  context.beginPath();
  context.arc(explosionVisual.point.x, explosionVisual.point.y, outerRingRadius, 0, Math.PI * 2);
  context.stroke();
}

function drawDamagePopups(context: CanvasRenderingContext2D, damagePopups: DamagePopup[]): void {
  let index = 0;
  while (index < damagePopups.length) {
    const popup = damagePopups[index];
    const progress = 1 - popup.timer / popup.duration;
    const y = popup.position.y - progress * 38;
    const alpha = popup.timer / popup.duration;
    context.globalAlpha = alpha;
    context.font = '700 12px "Press Start 2P"';
    context.textAlign = "center";
    context.fillStyle = "#5f210f";
    context.fillText("-" + String(popup.value), popup.position.x + 2, y + 2);
    context.fillStyle = "#fff6d4";
    context.fillText("-" + String(popup.value), popup.position.x, y);
    context.globalAlpha = 1;
    index += 1;
  }
}

function drawAimGuide(context: CanvasRenderingContext2D, player: Player, wind: { x: number; y: number }, power: number, charging: boolean, terrain: TerrainState): void {
  const launchRadians = getLaunchRadians(player.mobile);
  const muzzle = getMuzzlePosition(player.mobile, launchRadians);
  const guidePower = charging ? Math.max(0.14, power) : 0.56;
  let velocityX = Math.cos(launchRadians) * (420 + guidePower * 380);
  let velocityY = -Math.sin(launchRadians) * (420 + guidePower * 380);
  let x = muzzle.x;
  let y = muzzle.y;
  let step = 0;

  context.strokeStyle = "rgba(255, 255, 255, 0.48)";
  context.lineWidth = 2;
  context.beginPath();

  while (step < 28) {
    velocityX += wind.x * 580 * 0.08;
    velocityY += (530 + wind.y * 120) * 0.08;
    x += velocityX * 0.08;
    y += velocityY * 0.08;

    if (step === 0) context.moveTo(x, y);
    else context.lineTo(x, y);

    if (x < 0 || x >= terrain.width || y >= terrain.height) break;
    if (y >= terrain.heights[Math.floor(x)]) break;
    step += 1;
  }
  context.stroke();

  context.fillStyle = "rgba(255, 244, 201, 0.68)";
  context.beginPath();
  context.arc(muzzle.x, muzzle.y, 4, 0, Math.PI * 2);
  context.fill();
}

// ---- Particle draw functions ----

function drawDebris(context: CanvasRenderingContext2D): void {
  const debris = getDebrisData();
  for (let i = 0; i < debris.length; i++) {
    const p = debris[i];
    const alpha = p.life / p.maxLife;
    context.globalAlpha = alpha;
    context.fillStyle = p.color;
    context.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  context.globalAlpha = 1;
}

function drawWindLeaves(context: CanvasRenderingContext2D, _visualTime: number): void {
  const leaves = getLeafData();
  for (let i = 0; i < leaves.length; i++) {
    const l = leaves[i];
    context.save();
    context.translate(l.x, l.y);
    context.rotate(l.rotation);
    context.globalAlpha = l.alpha;
    context.fillStyle = "#7bb757";
    context.beginPath();
    context.ellipse(0, 0, l.size, l.size * 0.5, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#5a9a3a";
    context.beginPath();
    context.ellipse(1, -1, l.size * 0.3, l.size * 0.2, 0.3, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.globalAlpha = 1;
}

function drawChargeSparks(context: CanvasRenderingContext2D): void {
  const sparks = getSparkData();
  for (let i = 0; i < sparks.length; i++) {
    const s = sparks[i];
    const alpha = s.life / s.maxLife;
    context.globalAlpha = alpha;
    context.fillStyle = "#ffeaa3";
    context.shadowBlur = 6;
    context.shadowColor = "rgba(255, 234, 163, 0.6)";
    context.beginPath();
    context.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    context.fill();
  }
  context.shadowBlur = 0;
  context.globalAlpha = 1;
}

function drawDustPuffs(context: CanvasRenderingContext2D): void {
  const dust = getDustData();
  for (let i = 0; i < dust.length; i++) {
    const d = dust[i];
    const alpha = d.life / d.maxLife;
    context.globalAlpha = alpha * 0.4;
    context.fillStyle = "#c4a88a";
    context.beginPath();
    context.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawShellCasings(context: CanvasRenderingContext2D): void {
  const casings = getCasingData();
  for (let i = 0; i < casings.length; i++) {
    const c = casings[i];
    const alpha = c.life / c.maxLife;
    context.save();
    context.translate(c.x, c.y);
    context.rotate(c.rotation);
    context.globalAlpha = alpha;
    context.fillStyle = "#e8c87a";
    context.strokeStyle = "#8a6e3a";
    context.lineWidth = 1;
    context.fillRect(-3, -5, 6, 10);
    context.strokeRect(-3, -5, 6, 10);
    context.restore();
  }
  context.globalAlpha = 1;
}

function drawSmokePuffs(context: CanvasRenderingContext2D): void {
  const smoke = getSmokeData();
  for (let i = 0; i < smoke.length; i++) {
    const s = smoke[i];
    const alpha = s.alpha * (s.life / s.maxLife);
    context.globalAlpha = alpha;
    context.fillStyle = "rgba(140, 140, 150, " + String(alpha) + ")";
    context.beginPath();
    context.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawBounceSparks(context: CanvasRenderingContext2D): void {
  const sparks = getBounceData();
  for (let i = 0; i < sparks.length; i++) {
    const s = sparks[i];
    const alpha = s.life / s.maxLife;
    context.globalAlpha = alpha;
    context.fillStyle = "#fffaea";
    context.shadowBlur = 6;
    context.shadowColor = "rgba(255, 250, 234, 0.6)";
    context.beginPath();
    context.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    context.fill();
  }
  context.shadowBlur = 0;
  context.globalAlpha = 1;
}

function drawHitFlash(context: CanvasRenderingContext2D, flash: HitFlash | null): void {
  if (flash === null || flash.alpha < 0.01) return;
  context.fillStyle = "rgba(255, 255, 255, " + String(flash.alpha) + ")";
  context.fillRect(0, 0, worldWidth, worldHeight);
}

// ---- Particle data accessors (bridged from refs) ----

let debrisData: DebrisParticle[] = [];
let leafData: WindLeaf[] = [];
let sparkData: ChargeSpark[] = [];
let dustData: DustPuff[] = [];
let casingData: ShellCasing[] = [];
let smokeData: SmokePuff[] = [];
let bounceData: BounceSpark[] = [];
let fireShakeData = 0;

export function setDebrisData(d: DebrisParticle[]): void { debrisData = d; }
export function setLeafData(d: WindLeaf[]): void { leafData = d; }
export function setSparkData(d: ChargeSpark[]): void { sparkData = d; }
export function setDustData(d: DustPuff[]): void { dustData = d; }
export function setCasingData(d: ShellCasing[]): void { casingData = d; }
export function setSmokeData(d: SmokePuff[]): void { smokeData = d; }
export function setBounceData(d: BounceSpark[]): void { bounceData = d; }
function getDebrisData(): DebrisParticle[] { return debrisData; }
function getLeafData(): WindLeaf[] { return leafData; }
function getSparkData(): ChargeSpark[] { return sparkData; }
function getDustData(): DustPuff[] { return dustData; }
function getCasingData(): ShellCasing[] { return casingData; }
function getSmokeData(): SmokePuff[] { return smokeData; }
function getBounceData(): BounceSpark[] { return bounceData; }
function getFireShake(): number { return fireShakeData; }

let lastWeaponGlobal: WeaponType = "primary";
export function setLastWeapon(w: WeaponType): void { lastWeaponGlobal = w; }
function getLastWeapon(): WeaponType { return lastWeaponGlobal; }

// ---- Visual helpers (unchanged) ----

function drawSun(context: CanvasRenderingContext2D, theme: TerrainTheme): void {
  if (theme === "midnight") {
    const moonGradient = context.createRadialGradient(170, 120, 0, 170, 120, 72);
    moonGradient.addColorStop(0, "rgba(246, 248, 255, 0.92)");
    moonGradient.addColorStop(0.65, "rgba(194, 214, 255, 0.5)");
    moonGradient.addColorStop(1, "rgba(194, 214, 255, 0)");
    context.fillStyle = moonGradient;
    context.beginPath();
    context.arc(170, 120, 72, 0, Math.PI * 2);
    context.fill();
    return;
  }

  const gradient = context.createRadialGradient(170, 120, 0, 170, 120, 92);
  gradient.addColorStop(0, theme === "sunset" ? "rgba(255, 224, 167, 0.98)" : "rgba(255, 245, 180, 0.98)");
  gradient.addColorStop(0.6, theme === "sunset" ? "rgba(255, 150, 94, 0.85)" : "rgba(255, 211, 111, 0.85)");
  gradient.addColorStop(1, theme === "sunset" ? "rgba(255, 150, 94, 0)" : "rgba(255, 211, 111, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(170, 120, 92, 0, Math.PI * 2);
  context.fill();
}

function drawCloud(context: CanvasRenderingContext2D, x: number, y: number, scale: number, opacity: number): void {
  context.fillStyle = "rgba(255, 255, 255, " + String(opacity) + ")";
  drawCloudBubble(context, x, y, 46 * scale, 26 * scale);
  drawCloudBubble(context, x + 50 * scale, y + 2 * scale, 58 * scale, 30 * scale);
  drawCloudBubble(context, x + 98 * scale, y - 8 * scale, 44 * scale, 24 * scale);
  drawCloudBubble(context, x + 68 * scale, y - 18 * scale, 38 * scale, 22 * scale);
}

function drawCloudBubble(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  context.beginPath();
  context.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
  context.fill();
}

function drawBackMountains(context: CanvasRenderingContext2D, theme: TerrainTheme): void {
  context.fillStyle = theme === "sunset" ? "rgba(152, 103, 114, 0.72)" : theme === "midnight" ? "rgba(54, 78, 118, 0.78)" : "rgba(68, 133, 173, 0.78)";
  context.beginPath();
  context.moveTo(0, 465);
  context.lineTo(140, 355);
  context.lineTo(250, 435);
  context.lineTo(385, 310);
  context.lineTo(535, 428);
  context.lineTo(690, 332);
  context.lineTo(885, 452);
  context.lineTo(1010, 346);
  context.lineTo(1160, 432);
  context.lineTo(1280, 370);
  context.lineTo(1280, 720);
  context.lineTo(0, 720);
  context.closePath();
  context.fill();
}

function drawFrontMountains(context: CanvasRenderingContext2D, theme: TerrainTheme): void {
  context.fillStyle = theme === "sunset" ? "rgba(127, 109, 79, 0.58)" : theme === "midnight" ? "rgba(64, 99, 102, 0.56)" : "rgba(83, 146, 117, 0.56)";
  context.beginPath();
  context.moveTo(0, 520);
  context.lineTo(95, 438);
  context.lineTo(220, 504);
  context.lineTo(365, 418);
  context.lineTo(548, 526);
  context.lineTo(735, 432);
  context.lineTo(930, 520);
  context.lineTo(1055, 458);
  context.lineTo(1280, 536);
  context.lineTo(1280, 720);
  context.lineTo(0, 720);
  context.closePath();
  context.fill();
}

function drawParachute(context: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  context.strokeStyle = "rgba(59, 39, 22, 0.68)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x - 9, y + 8);
  context.lineTo(x - 7, y + 24);
  context.moveTo(x + 9, y + 8);
  context.lineTo(x + 7, y + 24);
  context.stroke();

  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x - 18, y + 8);
  context.quadraticCurveTo(x, y - 14, x + 18, y + 8);
  context.lineTo(x + 15, y + 10);
  context.quadraticCurveTo(x, y - 6, x - 15, y + 10);
  context.closePath();
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.36)";
  context.stroke();
}

function getBonusParachuteColor(type: BonusBox["type"]): string {
  if (type === "weapon") return "#77c6ff";
  if (type === "repair") return "#98d96b";
  return "#ffb35d";
}

function drawTurnGlow(context: CanvasRenderingContext2D, x: number, y: number, accent: string): void {
  const gradient = context.createRadialGradient(x, y - 12, 0, x, y - 12, 42);
  gradient.addColorStop(0, toAlphaColor(accent, 0.42));
  gradient.addColorStop(1, toAlphaColor(accent, 0));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y - 12, 42, 0, Math.PI * 2);
  context.fill();
}

function drawAccentAura(context: CanvasRenderingContext2D, player: Player, accent: string): void {
  const gradient = context.createRadialGradient(
    player.mobile.position.x,
    player.mobile.position.y - 18,
    0,
    player.mobile.position.x,
    player.mobile.position.y - 18,
    24
  );
  gradient.addColorStop(0, toAlphaColor(accent, 0.22));
  gradient.addColorStop(1, toAlphaColor(accent, 0));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(player.mobile.position.x, player.mobile.position.y - 18, 24, 0, Math.PI * 2);
  context.fill();
}

function drawArmorMobile(context: CanvasRenderingContext2D, player: Player, accent: string): void {
  const x = player.mobile.position.x;
  const y = player.mobile.position.y;
  const bodyTop = y - 23;
  const turretAngle = getTurretAngle(player);

  drawTrackShadow(context, x, y, 42);
  drawTracks(context, x, y, 38, "#40565c", "#1f3037");
  context.fillStyle = "#f5ca4f";
  context.strokeStyle = "#3d2914";
  context.lineWidth = 2;
  roundRect(context, x - 18, bodyTop, 36, 18, 8);
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(255,255,255,0.2)";
  roundRect(context, x - 15, bodyTop + 2, 18, 5, 3);
  context.fill();
  context.fillStyle = accent;
  roundRect(context, x - 12, bodyTop - 9, 24, 13, 6);
  context.fill();
  context.stroke();
  context.fillStyle = "#183447";
  context.beginPath();
  context.arc(x - 5, bodyTop - 3, 2.3, 0, Math.PI * 2);
  context.arc(x + 5, bodyTop - 3, 2.3, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#214154";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(x, bodyTop - 2);
  context.lineTo(x + Math.cos(turretAngle) * 28, bodyTop - 2 - Math.sin(turretAngle) * 28);
  context.stroke();
  context.strokeStyle = "#fff4c4";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x + 2, bodyTop - 4);
  context.lineTo(x + Math.cos(turretAngle) * 24, bodyTop - 4 - Math.sin(turretAngle) * 24);
  context.stroke();
}

function drawKnightMobile(context: CanvasRenderingContext2D, player: Player, accent: string): void {
  const x = player.mobile.position.x;
  const y = player.mobile.position.y;
  const bodyTop = y - 22;
  const turretAngle = getTurretAngle(player);

  drawTrackShadow(context, x, y, 38);
  drawTracks(context, x, y, 30, "#50607a", "#243040");
  context.fillStyle = "#f1f0eb";
  context.strokeStyle = "#425061";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x - 18, y - 8);
  context.quadraticCurveTo(x - 6, bodyTop - 8, x + 12, bodyTop - 2);
  context.quadraticCurveTo(x + 18, bodyTop + 6, x + 12, y - 4);
  context.lineTo(x - 12, y - 2);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(255,255,255,0.18)";
  context.beginPath();
  context.ellipse(x - 5, bodyTop - 2, 9, 4, -0.2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = accent;
  context.beginPath();
  context.arc(x - 2, bodyTop + 3, 8, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(x - 4, bodyTop + 1, 2.2, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#566577";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(x + 3, bodyTop + 1);
  context.lineTo(x + Math.cos(turretAngle) * 28, bodyTop + 1 - Math.sin(turretAngle) * 28);
  context.stroke();
  context.strokeStyle = "#ffffff";
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(x + 3, bodyTop + 1);
  context.lineTo(x + Math.cos(turretAngle) * 24, bodyTop + 1 - Math.sin(turretAngle) * 24);
  context.stroke();
}

function drawTrackShadow(context: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  context.fillStyle = "rgba(28, 47, 54, 0.28)";
  context.beginPath();
  context.ellipse(x, y + 5, width, 8, 0, 0, Math.PI * 2);
  context.fill();
}

function drawTracks(context: CanvasRenderingContext2D, x: number, y: number, width: number, fill: string, stroke: string): void {
  context.fillStyle = fill;
  context.strokeStyle = stroke;
  context.lineWidth = 2;
  roundRect(context, x - width * 0.5, y - 7, width, 12, 6);
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(255,255,255,0.12)";
  context.beginPath();
  context.arc(x - width * 0.28, y - 1, 3, 0, Math.PI * 2);
  context.arc(x, y - 1, 3, 0, Math.PI * 2);
  context.arc(x + width * 0.28, y - 1, 3, 0, Math.PI * 2);
  context.fill();
  drawTrackTread(context, x, y, width);
}

function drawPennant(context: CanvasRenderingContext2D, player: Player, accent: string): void {
  const x = player.mobile.position.x;
  const y = player.mobile.position.y - player.mobile.height - 22;
  context.strokeStyle = "#3d2914";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x - 20, y + 20);
  context.lineTo(x - 20, y);
  context.stroke();
  context.fillStyle = accent;
  context.beginPath();
  context.moveTo(x - 20, y + 2);
  context.lineTo(x - 2, y + 8);
  context.lineTo(x - 20, y + 14);
  context.closePath();
  context.fill();
}

function getAccentColor(accent: PlayerAccent): string {
  if (accent === "coral") {
    return "#ff8f72";
  }

  if (accent === "mint") {
    return "#71dfb0";
  }

  if (accent === "gold") {
    return "#ffd36d";
  }

  return "#62c3ff";
}

function toAlphaColor(hex: string, alpha: number): string {
  const parsed = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (parsed === null) {
    return "rgba(255, 255, 255, " + String(alpha) + ")";
  }

  return "rgba(" +
    String(Number.parseInt(parsed[1], 16)) +
    ", " +
    String(Number.parseInt(parsed[2], 16)) +
    ", " +
    String(Number.parseInt(parsed[3], 16)) +
    ", " +
    String(alpha) +
    ")";
}

function getSkyPalette(theme: TerrainTheme): {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  cloudAlpha: number;
} {
  if (theme === "sunset") {
    return {
      skyTop: "#ffd1a6",
      skyMid: "#f39779",
      skyBottom: "#6b70b8",
      cloudAlpha: 0.64
    };
  }

  if (theme === "midnight") {
    return {
      skyTop: "#19284e",
      skyMid: "#294a79",
      skyBottom: "#13253f",
      cloudAlpha: 0.32
    };
  }

  return {
    skyTop: "#b4e1ff",
    skyMid: "#79c0f4",
    skyBottom: "#4f93ca",
    cloudAlpha: 0.84
  };
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x - radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x - radius, y);
  context.closePath();
}

function drawTrackTread(context: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  context.strokeStyle = "rgba(255,255,255,0.09)";
  context.lineWidth = 1;
  let index = 0;
  const start = x - width * 0.42;
  while (index < 6) {
    const offset = start + index * (width * 0.16);
    context.beginPath();
    context.moveTo(offset, y - 5);
    context.lineTo(offset + 3, y + 3);
    context.stroke();
    index += 1;
  }
}
