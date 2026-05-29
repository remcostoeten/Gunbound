"use client";

import { useEffect, useRef } from "react";
import { getBonusIconPath } from "@/features/game/constants/weapon-icons";
import { isTrueAngle } from "@/features/game/engine/aiming";
import { createCameraRig, getCameraFrame, stepCameraRig } from "@/features/game/engine/camera";
import { createVisualEffectsState, stepVisualEffectsState } from "@/features/game/engine/effects";
import { createMapDecor } from "@/features/game/engine/map-decor";
import { createProjectileRenderStyle, getProjectileImpactStyle, getProjectileTrailStyle } from "@/features/game/engine/projectile-presentation";
import { getShotTechniqueLabel } from "@/features/game/engine/shot-techniques";
import { clamp } from "@/features/game/engine/terrain";
import { getSkyPalette, getTerrainPalette } from "@/features/game/engine/terrain-theme";
import { applyWeatherToFlightState } from "@/features/game/engine/weather";
import { getMobileSpriteFrame, getMobileSpriteSource, shouldFlipMobileSprite } from "@/features/game/engine/mobile-sprites";
import { getLaunchRadians, getMuzzlePosition, windForceCoefficient } from "@/features/game/engine/physics";
import { getMobileRiderMount, getMobileRiderSpriteSource } from "@/features/game/engine/rider-sprites";
import { createWeaponProfile } from "@/features/game/engine/weapons";
import { useGameLoop } from "@/features/game/hooks/use-game-loop";
import { useInput } from "@/features/game/hooks/use-input";
import { useGameStore } from "@/features/game/store/game-store";
import { worldHeight, worldWidth } from "@/features/game/constants/world";
import type { ProjectileState } from "@/features/game/types/combat";
import type { BonusBox, Player, TerrainState } from "@/features/game/types/entities";
import type {
  BounceSpark,
  ChargeSpark,
  DamagePopup,
  DebrisParticle,
  DustPuff,
  ExplosionSpriteEffect,
  ExplosionSpriteSheet,
  ExplosionVisual,
  GrassTuft,
  HitFlash,
  ShellCasing,
  SmokePuff,
  VisualEffectsState,
  WindLeaf
} from "@/features/game/types/effects";
import type { CameraFrame, MapDecorPlan, MapDecorPrimitive } from "@/features/game/types/presentation";
import type { BonusType, MobileType, PlayerAccent, PlayerId, TerrainTheme, Vec2, WeatherState, WeaponType } from "@/features/game/types/shared";
import type { InputState } from "@/features/game/types/state";

type SpriteCache = {
  armor: HTMLImageElement | null;
  knight: HTMLImageElement | null;
  dragon: HTMLImageElement | null;
  snow: HTMLImageElement | null;
  trico: HTMLImageElement | null;
  aduko: HTMLImageElement | null;
  mage: HTMLImageElement | null;
  nak: HTMLImageElement | null;
  turtle: HTMLImageElement | null;
  frog: HTMLImageElement | null;
  sate: HTMLImageElement | null;
  dragonRider: HTMLImageElement | null;
};

type ExplosionSpriteSpec = {
  path: string;
  frames: number;
  width: number;
  height: number;
};

type ExplosionSpriteCache = Record<ExplosionSpriteSheet, HTMLImageElement | null>;

type BonusIconCache = Record<BonusType, HTMLImageElement | null>;

type MapDecorCache = {
  key: string;
  plan: MapDecorPlan | null;
};

const explosionSpriteSpecs: Record<ExplosionSpriteSheet, ExplosionSpriteSpec> = {
  "aduka-thor": {
    path: "/explodes/aduka1-thor.png",
    frames: 14,
    width: 1368,
    height: 96
  },
  "armor-primary": {
    path: "/explodes/armor1.png",
    frames: 19,
    width: 2376,
    height: 128
  },
  "armor-secondary": {
    path: "/explodes/armor2.png",
    frames: 15,
    width: 1921,
    height: 124
  },
  "dragon-fire": {
    path: "/explodes/generated/dragon-fire.svg",
    frames: 16,
    width: 2048,
    height: 128
  },
  "frog-bubble": {
    path: "/explodes/generated/frog-bubble.svg",
    frames: 16,
    width: 2048,
    height: 128
  },
  gum: {
    path: "/explodes/gum1.png",
    frames: 14,
    width: 1546,
    height: 110
  },
  "jd-secondary": {
    path: "/explodes/jd2.png",
    frames: 16,
    width: 1995,
    height: 128
  },
  "jd-lightning": {
    path: "/explodes/lightning12-jd1.png",
    frames: 10,
    width: 1253,
    height: 122
  },
  "knight-blade": {
    path: "/explodes/generated/knight-blade.svg",
    frames: 16,
    width: 2048,
    height: 128
  },
  "mage-rune": {
    path: "/explodes/generated/mage-rune.svg",
    frames: 16,
    width: 2048,
    height: 128
  },
  nak: {
    path: "/explodes/nak.png",
    frames: 9,
    width: 1094,
    height: 128
  },
  "sate-sonar": {
    path: "/explodes/generated/sate-sonar.svg",
    frames: 16,
    width: 2048,
    height: 128
  },
  "snow-frost": {
    path: "/explodes/generated/snow-frost.svg",
    frames: 16,
    width: 2048,
    height: 128
  },
  "trico-horn": {
    path: "/explodes/generated/trico-horn.svg",
    frames: 16,
    width: 2048,
    height: 128
  },
  "turtle-shell": {
    path: "/explodes/generated/turtle-shell.svg",
    frames: 16,
    width: 2048,
    height: 128
  }
};

export function GameCanvas(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousFrameTimeRef = useRef(0);
  const visualTimeRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const cameraRigRef = useRef(createCameraRig());
  const visualEffectsRef = useRef<VisualEffectsState>(createVisualEffectsState());
  const mapDecorRef = useRef<MapDecorCache>({
    key: "",
    plan: null
  });
  const spriteCacheRef = useRef<SpriteCache>({
    armor: null,
    knight: null,
    dragon: null,
    snow: null,
    trico: null,
    aduko: null,
    mage: null,
    nak: null,
    turtle: null,
    frog: null,
    sate: null,
    dragonRider: null
  });
  const explosionSpriteCacheRef = useRef<ExplosionSpriteCache>(createExplosionSpriteCache());
  const bonusIconCacheRef = useRef<BonusIconCache>(createBonusIconCache());
  const liveShotRef = useRef<GhostShot & { owner: PlayerId } | null>(null);
  const lastShotRef = useRef<[GhostShot | null, GhostShot | null]>([null, null]);
  const ghostRoundRef = useRef<number>(0);

  useInput();
  useGameLoop(drawFrame);
  useEffect(setupCanvas, []);
  useEffect(syncReducedMotionPreference, []);

  return <canvas ref={canvasRef} className="game-canvas" role="img" aria-label="Gunbound game canvas" />;

  function setupCanvas(): void {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    canvas.width = worldWidth;
    canvas.height = worldHeight;
    loadMobileSprites(spriteCacheRef.current);
    loadExplosionSprites(explosionSpriteCacheRef.current);
    loadBonusIcons(bonusIconCacheRef.current);
  }

  function drawFrame(): void {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const context = canvas.getContext("2d");
    if (context === null) return;

    context.imageSmoothingEnabled = false;
    const delta = advanceVisualClock();

    const state = useGameStore.getState();
    captureGhostShot(state, liveShotRef, lastShotRef, ghostRoundRef);
    visualEffectsRef.current = stepVisualEffectsState(visualEffectsRef.current, {
      projectile: state.projectile,
      players: state.players,
      turn: state.turn,
      explosionVisual: state.explosionVisual,
      explosionVisuals: state.explosionVisuals,
      wind: state.wind,
      scene: state.scene,
      charging: state.charging,
      phase: state.phase,
      damagePopups: state.damagePopups,
      terrain: state.terrain,
      dt: delta,
      visualTime: visualTimeRef.current,
      reducedMotion: reducedMotionRef.current
    });
    const visualEffects = visualEffectsRef.current;
    const mapDecor = getMapDecorPlan(mapDecorRef.current, state.terrain);
    cameraRigRef.current = stepCameraRig(cameraRigRef.current, {
      scene: state.scene,
      phase: state.phase,
      turn: state.turn,
      players: state.players,
      projectile: state.projectile,
      explosionVisual: state.explosionVisual,
      dt: delta
    });
    const cameraFrame = getCameraFrame(cameraRigRef.current, visualTimeRef.current, reducedMotionRef.current ? null : state.explosionVisual, reducedMotionRef.current ? 0 : visualEffects.fireShake);

    context.save();
    applyCameraFrame(context, cameraFrame);

    drawBackground(context, state.terrain?.theme || "meadow", visualTimeRef.current, mapDecor);
    drawWeatherOverlay(context, state.weather, visualTimeRef.current);

    if (state.terrain !== null) {
      drawTerrain(context, state.terrain);
      if (mapDecor !== null) {
        drawMapDecorPrimitives(context, mapDecor.materialAccents, visualTimeRef.current);
        drawMapDecorPrimitives(context, mapDecor.foregroundProps, visualTimeRef.current);
      }
      drawGrass(context, state.terrain, visualTimeRef.current, state.wind, visualEffects.grass);
    }

    drawBonusBoxes(context, state.bonusBoxes, bonusIconCacheRef.current);

    if (state.scene === "playing" && state.projectile === null && state.terrain !== null) {
      const ghost = lastShotRef.current[state.turn - 1];
      if (ghost !== null) {
        drawGhostShot(context, ghost);
      }
      drawAimGuide(context, state.players[state.turn - 1], state.wind, state.weather, state.power, state.charging, state.terrain);
    }

    drawProjectileTrail(context, visualEffects.trail, visualEffects.lastMobileType, visualEffects.lastWeapon);
    drawWindLeaves(context, visualEffects.leaves);
    drawPlayers(context, state.players, state.turn, state.input, visualTimeRef.current, spriteCacheRef.current);

    if (state.projectile !== null) {
      drawProjectile(context, state.projectile);
    }

    drawChargeSparks(context, visualEffects.sparks);
    drawDustPuffs(context, visualEffects.dust);
    drawDebris(context, visualEffects.debris);
    drawShellCasings(context, visualEffects.shellCasings);
    drawSmokePuffs(context, visualEffects.smokePuffs);
    drawBounceSparks(context, visualEffects.bounceSparks);
    drawMuzzleFlash(context, visualEffects.muzzleFlash);
    drawExplosionVisuals(context, state.explosionVisuals.length > 0 ? state.explosionVisuals : state.explosionVisual === null ? [] : [state.explosionVisual]);
    drawExplosionSprites(context, visualEffects.explosionSprites, explosionSpriteCacheRef.current);
    drawDamagePopups(context, state.damagePopups);
    drawHitFlash(context, visualEffects.hitFlash);
    context.restore();
  }

  function advanceVisualClock(): number {
    const now = performance.now();
    if (previousFrameTimeRef.current === 0) {
      previousFrameTimeRef.current = now;
      return 0;
    }
    const delta = Math.min(0.05, (now - previousFrameTimeRef.current) / 1000);
    previousFrameTimeRef.current = now;
    visualTimeRef.current += delta;
    return delta;
  }

  function syncReducedMotionPreference(): () => void {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = (): void => {
      reducedMotionRef.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }
}

function getMapDecorPlan(cache: MapDecorCache, terrain: TerrainState | null): MapDecorPlan | null {
  if (terrain === null) {
    cache.key = "";
    cache.plan = null;
    return null;
  }

  const key = terrain.mapType + ":" + terrain.theme + ":" + String(terrain.seed) + ":" + String(terrain.heights.length);
  if (cache.key === key && cache.plan !== null) {
    return cache.plan;
  }

  cache.key = key;
  cache.plan = createMapDecor({
    map: terrain.mapType,
    theme: terrain.theme,
    seed: terrain.seed,
    width: terrain.width,
    height: terrain.height,
    terrainHeights: terrain.heights
  });

  return cache.plan;
}

// ---- Drawing helpers ----

function drawBackground(context: CanvasRenderingContext2D, theme: TerrainTheme, visualTime: number, mapDecor: MapDecorPlan | null): void {
  const palette = getSkyPalette(theme);
  const gradient = context.createLinearGradient(0, 0, 0, worldHeight);
  gradient.addColorStop(0, palette.skyTop);
  gradient.addColorStop(0.45, palette.skyMid);
  gradient.addColorStop(1, palette.skyBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, worldWidth, worldHeight);

  drawSkyGlow(context, theme);
  if (theme === "midnight") {
    drawStars(context, palette.starColor, visualTime);
  }
  drawSun(context, theme);
  // Distant cloud layer: smaller, fainter and slower for parallax depth.
  drawCloud(context, palette, 260 + Math.sin(visualTime * 0.07 + 0.4) * 20, 64, 0.62, palette.cloudAlpha * 0.4);
  drawCloud(context, palette, 620 + Math.sin(visualTime * 0.06 + 2.7) * 24, 52, 0.7, palette.cloudAlpha * 0.36);
  drawCloud(context, palette, 996 + Math.sin(visualTime * 0.08 + 1.1) * 18, 72, 0.56, palette.cloudAlpha * 0.42);
  // Near cloud layer.
  drawCloud(context, palette, 138 + Math.sin(visualTime * 0.16) * 12, 140, 1.22, palette.cloudAlpha);
  drawCloud(context, palette, 402 + Math.sin(visualTime * 0.14 + 1.3) * 10, 116, 0.96, palette.cloudAlpha * 0.84);
  drawCloud(context, palette, 870 + Math.sin(visualTime * 0.11 + 2.2) * 14, 108, 1.08, palette.cloudAlpha * 0.9);
  drawCloud(context, palette, 1116 + Math.sin(visualTime * 0.19 + 0.7) * 8, 174, 0.86, palette.cloudAlpha * 0.72);
  drawBackMountains(context, theme);
  drawMidMountains(context, theme);
  drawHorizonMist(context, palette);
  if (mapDecor !== null) {
    drawMapDecorPrimitives(context, mapDecor.backgroundLandmarks, visualTime);
  }
  drawFrontMountains(context, theme);
}

function drawTerrain(context: CanvasRenderingContext2D, terrain: TerrainState): void {
  if (terrain.canvas !== null) {
    context.drawImage(terrain.canvas, 0, 0);
  }

  const skyPalette = getSkyPalette(terrain.theme);
  context.strokeStyle = "rgba(67, 39, 23, 0.28)";
  context.lineWidth = 6;
  context.beginPath();
  let x = 0;
  while (x < terrain.heights.length) {
    const y = terrain.heights[x] + 3;
    if (x === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
    x += 8;
  }
  context.stroke();

  context.strokeStyle = skyPalette.terrainStroke;
  context.lineWidth = 3;
  context.beginPath();
  x = 0;
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

function drawMapDecorPrimitives(context: CanvasRenderingContext2D, primitives: MapDecorPrimitive[], visualTime: number): void {
  let index = 0;

  while (index < primitives.length) {
    drawMapDecorPrimitive(context, primitives[index], visualTime);
    index += 1;
  }
}

function drawMapDecorPrimitive(context: CanvasRenderingContext2D, primitive: MapDecorPrimitive, visualTime: number): void {
  const offset = getMapDecorOffset(primitive, visualTime);
  context.save();
  context.globalAlpha = primitive.alpha;

  if (primitive.primitive === "ellipse") {
    context.translate(primitive.center.x + offset.x, primitive.center.y + offset.y);
    context.rotate(primitive.rotation);
    context.fillStyle = primitive.fill;
    context.beginPath();
    context.ellipse(0, 0, primitive.radiusX, primitive.radiusY, 0, 0, Math.PI * 2);
    context.fill();
    strokeMapDecorPrimitive(context, primitive.stroke);
    context.restore();
    return;
  }

  if (primitive.primitive === "rect") {
    const centerX = primitive.origin.x + primitive.width * 0.5 + offset.x;
    const centerY = primitive.origin.y + primitive.height * 0.5 + offset.y;
    context.translate(centerX, centerY);
    context.rotate(primitive.rotation);
    context.fillStyle = primitive.fill;
    roundRect(context, -primitive.width * 0.5, -primitive.height * 0.5, primitive.width, primitive.height, primitive.radius);
    context.fill();
    strokeMapDecorPrimitive(context, primitive.stroke);
    context.restore();
    return;
  }

  if (primitive.primitive === "polygon") {
    context.fillStyle = primitive.fill;
    context.beginPath();
    drawMapDecorPath(context, primitive.points, offset);
    context.closePath();
    context.fill();
    strokeMapDecorPrimitive(context, primitive.stroke);
    context.restore();
    return;
  }

  context.strokeStyle = primitive.fill;
  context.lineWidth = primitive.width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  drawMapDecorPath(context, primitive.points, offset);
  context.stroke();
  if (primitive.stroke !== null) {
    context.strokeStyle = primitive.stroke;
    context.lineWidth = Math.max(1, primitive.width * 0.35);
    context.stroke();
  }
  context.restore();
}

function drawMapDecorPath(context: CanvasRenderingContext2D, points: Vec2[], offset: Vec2): void {
  let index = 0;

  while (index < points.length) {
    const point = points[index];
    if (index === 0) {
      context.moveTo(point.x + offset.x, point.y + offset.y);
    } else {
      context.lineTo(point.x + offset.x, point.y + offset.y);
    }
    index += 1;
  }
}

function strokeMapDecorPrimitive(context: CanvasRenderingContext2D, stroke: string | null): void {
  if (stroke === null) {
    return;
  }

  context.strokeStyle = stroke;
  context.lineWidth = 2;
  context.stroke();
}

function getMapDecorOffset(primitive: MapDecorPrimitive, visualTime: number): Vec2 {
  const drift = (1 - primitive.parallax) * 8;

  return {
    x: Math.sin(visualTime * 0.18 + primitive.parallax * 9) * drift,
    y: Math.cos(visualTime * 0.14 + primitive.parallax * 5) * drift * 0.28
  };
}

function drawGrass(context: CanvasRenderingContext2D, terrain: TerrainState, visualTime: number, wind: { x: number; y: number }, grass: GrassTuft[]): void {
  const palette = getTerrainPalette(terrain.theme);
  for (let i = 0; i < grass.length; i++) {
    const g = grass[i];
    const sway = Math.sin(visualTime * 2.4 + g.sway) * 3 + wind.x * 4;
    context.strokeStyle = "rgba(" + String(palette.grassShadow[0]) + ", " + String(palette.grassShadow[1]) + ", " + String(palette.grassShadow[2]) + ", 0.55)";
    context.lineWidth = 2.2;
    context.beginPath();
    context.moveTo(g.x, g.y);
    context.quadraticCurveTo(g.x + sway * 0.4, g.y - g.height * 0.55, g.x + sway * 0.92, g.y - g.height * 0.96);
    context.stroke();
    context.strokeStyle = "rgba(" + String(palette.grassAccent[0]) + ", " + String(palette.grassAccent[1]) + ", " + String(palette.grassAccent[2]) + ", 0.62)";
    context.lineWidth = 1.1;
    context.beginPath();
    context.moveTo(g.x, g.y - 1);
    context.quadraticCurveTo(g.x + sway * 0.5, g.y - g.height * 0.8, g.x + sway, g.y - g.height);
    context.stroke();
  }
}

// ---- Bonus boxes ----

function drawBonusBoxes(context: CanvasRenderingContext2D, bonusBoxes: BonusBox[], iconCache: BonusIconCache): void {
  let index = 0;
  while (index < bonusBoxes.length) {
    const box = bonusBoxes[index];
    if (!box.landed) {
      drawParachute(context, box.position.x, box.position.y - 34, getBonusParachuteColor(box.type));
    }
    drawBonusBox(context, box, iconCache);
    index += 1;
  }
}

function drawBonusBox(context: CanvasRenderingContext2D, box: BonusBox, iconCache: BonusIconCache): void {
  const icon = iconCache[box.type];
  if (icon !== null && icon.complete && icon.naturalWidth > 0) {
    context.drawImage(icon, box.position.x - 16, box.position.y - 34, 32, 32);
    return;
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
}

// ---- Players ----

function drawPlayers(context: CanvasRenderingContext2D, players: [Player, Player], turn: 1 | 2, input: InputState, visualTime: number, spriteCache: SpriteCache): void {
  let index = 0;
  while (index < players.length) {
    const player = players[index];
    const isTurn = player.id === turn;
    const moving = isTurn && (input.moveLeft || input.moveRight);
    drawMobile(context, player, isTurn, moving, visualTime, spriteCache);
    index += 1;
  }
}

function drawMobile(context: CanvasRenderingContext2D, player: Player, isTurn: boolean, moving: boolean, visualTime: number, spriteCache: SpriteCache): void {
  const accent = getAccentColor(player.accent);
  const bobSpeed = moving ? 7.4 : 3.2;
  const bobAmount = moving ? 2.2 : 1.1;
  const bob = Math.sin((player.mobile.position.x * 0.02 + visualTime * bobSpeed) * 0.9) * bobAmount;

  if (isTurn) {
    drawTurnGlow(context, player.mobile.position.x, player.mobile.position.y + bob, accent);
  }

  context.save();
  context.translate(0, bob);
  drawAccentAura(context, player, accent);
  drawMobileShadow(context, player);
  drawMobileSprite(context, player, spriteCache, visualTime, moving);
  drawHpTickMarks(context, player);
  if (isTurn) {
    drawAngleBadge(context, player, accent);
  }
  drawPennant(context, player, accent);
  context.restore();
}

function getTurretAngle(player: Player): number {
  const degrees = player.mobile.facing === 1 ? player.mobile.angle : 180 - player.mobile.angle;
  return (degrees * Math.PI) / 180;
}

function drawAngleBadge(context: CanvasRenderingContext2D, player: Player, accent: string): void {
  const launchRadians = getLaunchRadians(player.mobile);
  const muzzle = getMuzzlePosition(player.mobile, launchRadians);
  const directionX = Math.cos(launchRadians);
  const directionY = Math.sin(launchRadians);
  const trueAngleActive = isTrueAngle(player.mobile.type, player.mobile.angle);
  const isRearArc = player.mobile.angle > 90;
  const label = Math.round(player.mobile.angle) + " DEG";
  const modeLabel = trueAngleActive ? "TRUE" : isRearArc ? "REAR" : "FRONT";
  const width = 68;
  const height = 22;
  const anchorX = clamp(muzzle.x + directionX * 24, width * 0.5 + 10, worldWidth - width * 0.5 - 10);
  const anchorY = clamp(muzzle.y - directionY * 18 - 22, 28, worldHeight - 48);
  const cardX = anchorX - width * 0.5;
  const cardY = anchorY - height * 0.5;

  context.strokeStyle = colorWithAlpha(accent, 0.8);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(muzzle.x, muzzle.y);
  context.lineTo(anchorX, anchorY);
  context.stroke();

  context.fillStyle = "rgba(9, 20, 36, 0.88)";
  roundRect(context, cardX, cardY, width, height, 7);
  context.fill();
  context.strokeStyle = colorWithAlpha(accent, 0.78);
  context.lineWidth = 1.5;
  context.stroke();

  context.font = '700 8px "Press Start 2P"';
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = "#fff7de";
  context.fillText(label, cardX + 7, anchorY + 0.5);

  context.textAlign = "right";
  context.fillStyle = colorWithAlpha(accent, 0.95);
  context.fillText(modeLabel, cardX + width - 6, anchorY + 0.5);
}

function drawProjectile(context: CanvasRenderingContext2D, projectile: ProjectileState): void {
  const style = createProjectileRenderStyle(projectile);
  const body = style.body;

  context.save();
  context.translate(projectile.position.x, projectile.position.y);
  context.rotate(style.angle);
  context.shadowBlur = body.glowRadius;
  context.shadowColor = body.glow;
  context.fillStyle = body.fill;
  context.strokeStyle = body.stroke;
  context.lineWidth = body.strokeWidth;

  drawProjectileBody(context, body.shape, style.radius, body.aspectRatio);
  context.fill();
  context.stroke();

  context.shadowBlur = body.glowRadius * 0.45;
  context.fillStyle = body.core;
  context.beginPath();
  context.ellipse(style.radius * 0.18, -style.radius * 0.1, style.radius * 0.42, style.radius * 0.28, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  if (projectile.technique !== null) {
    drawProjectileTechniqueBadge(context, projectile);
  }
}

function drawProjectileTechniqueBadge(context: CanvasRenderingContext2D, projectile: ProjectileState): void {
  const fullLabel = getShotTechniqueLabel(projectile.technique);
  const label = fullLabel === "Butt Shot" ? "BUTT" : "BACK";
  const width = label === "BUTT" ? 40 : 42;
  const height = 16;
  const x = clamp(projectile.position.x - width * 0.5, 8, worldWidth - width - 8);
  const y = clamp(projectile.position.y - 28, 8, worldHeight - height - 8);

  context.save();
  context.fillStyle = "rgba(14, 24, 36, 0.92)";
  roundRect(context, x, y, width, height, 6);
  context.fill();
  context.strokeStyle = projectile.technique === "buttshot" ? "rgba(255, 211, 97, 0.9)" : "rgba(126, 204, 255, 0.92)";
  context.lineWidth = 1.25;
  context.stroke();
  context.font = '700 7px "Press Start 2P"';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff8dc";
  context.fillText(label, x + width * 0.5, y + height * 0.55);
  context.restore();
}

function drawProjectileBody(context: CanvasRenderingContext2D, shape: ReturnType<typeof createProjectileRenderStyle>["body"]["shape"], radius: number, aspectRatio: number): void {
  context.beginPath();

  if (shape === "bolt") {
    context.moveTo(radius * 1.45, 0);
    context.lineTo(-radius * 0.2, -radius * 0.7);
    context.lineTo(-radius * 0.55, -radius * 0.08);
    context.lineTo(-radius * 1.35, -radius * 0.42);
    context.lineTo(-radius * 0.25, radius * 0.7);
    context.lineTo(radius * 0.05, radius * 0.06);
    context.closePath();
    return;
  }

  if (shape === "drill") {
    context.moveTo(radius * 1.55, 0);
    context.lineTo(-radius * 0.25, -radius * 0.72);
    context.lineTo(-radius * 1.25, 0);
    context.lineTo(-radius * 0.25, radius * 0.72);
    context.closePath();
    return;
  }

  if (shape === "droplet") {
    context.moveTo(radius * 1.15, 0);
    context.quadraticCurveTo(radius * 0.1, -radius * 1.05, -radius * 0.88, -radius * 0.34);
    context.quadraticCurveTo(-radius * 1.22, radius * 0.72, radius * 0.28, radius * 0.92);
    context.quadraticCurveTo(radius * 0.98, radius * 0.56, radius * 1.15, 0);
    context.closePath();
    return;
  }

  if (shape === "seed") {
    context.ellipse(0, 0, radius * aspectRatio, radius * 0.72, -0.18, 0, Math.PI * 2);
    return;
  }

  if (shape === "shell") {
    context.roundRect(-radius * aspectRatio * 0.75, -radius * 0.72, radius * aspectRatio * 1.5, radius * 1.44, radius * 0.45);
    return;
  }

  context.ellipse(0, 0, radius * aspectRatio, radius, 0, 0, Math.PI * 2);
}

function getProjectileStyle(mobileType: MobileType, isSecondary: boolean): { outer: string; inner: string; glow: string; trail: string } {
  if (mobileType === "aduko") {
    return isSecondary
      ? { outer: "#d9d3ff", inner: "#ffffff", glow: "rgba(161, 145, 255, 0.9)", trail: "170, 155, 255" }
      : { outer: "#bfeeff", inner: "#ffffff", glow: "rgba(109, 215, 255, 0.85)", trail: "120, 220, 255" };
  }

  if (mobileType === "trico") {
    return isSecondary
      ? { outer: "#9cff7e", inner: "#f2ffe9", glow: "rgba(128, 255, 102, 0.88)", trail: "142, 255, 112" }
      : { outer: "#ffd56e", inner: "#fff7d4", glow: "rgba(255, 209, 86, 0.82)", trail: "255, 215, 105" };
  }

  if (mobileType === "mage") {
    return isSecondary
      ? { outer: "#c084fc", inner: "#f3e8ff", glow: "rgba(168, 85, 247, 0.9)", trail: "192, 132, 252" }
      : { outer: "#a78bfa", inner: "#ede9fe", glow: "rgba(139, 92, 246, 0.85)", trail: "167, 139, 250" };
  }

  if (mobileType === "nak") {
    return isSecondary
      ? { outer: "#d97706", inner: "#fef3c7", glow: "rgba(217, 119, 6, 0.88)", trail: "217, 119, 6" }
      : { outer: "#f59e0b", inner: "#fffbeb", glow: "rgba(245, 158, 11, 0.82)", trail: "245, 158, 11" };
  }

  if (mobileType === "turtle") {
    return isSecondary
      ? { outer: "#166534", inner: "#dcfce7", glow: "rgba(22, 101, 52, 0.9)", trail: "34, 197, 94" }
      : { outer: "#16a34a", inner: "#f0fdf4", glow: "rgba(22, 163, 74, 0.85)", trail: "74, 222, 128" };
  }

  if (mobileType === "frog") {
    return isSecondary
      ? { outer: "#65a30d", inner: "#f7fee7", glow: "rgba(101, 163, 13, 0.9)", trail: "132, 204, 22" }
      : { outer: "#84cc16", inner: "#f7fee7", glow: "rgba(132, 204, 22, 0.85)", trail: "163, 230, 53" };
  }

  if (mobileType === "sate") {
    return isSecondary
      ? { outer: "#1d4ed8", inner: "#dbeafe", glow: "rgba(29, 78, 216, 0.9)", trail: "59, 130, 246" }
      : { outer: "#3b82f6", inner: "#eff6ff", glow: "rgba(59, 130, 246, 0.85)", trail: "147, 197, 253" };
  }

  if (mobileType === "armor") {
    return isSecondary
      ? { outer: "#e2e8f0", inner: "#f8fafc", glow: "rgba(148, 163, 184, 0.88)", trail: "203, 213, 225" }
      : { outer: "#f1f5f9", inner: "#ffffff", glow: "rgba(226, 232, 240, 0.8)", trail: "241, 245, 249" };
  }

  if (mobileType === "snow") {
    return isSecondary
      ? { outer: "#bae6fd", inner: "#f0f9ff", glow: "rgba(186, 230, 253, 0.9)", trail: "186, 230, 253" }
      : { outer: "#e0f2fe", inner: "#ffffff", glow: "rgba(224, 242, 254, 0.85)", trail: "224, 242, 254" };
  }

  return isSecondary
    ? { outer: "#ffe7a5", inner: "#fff5d4", glow: "rgba(255, 211, 97, 0.85)", trail: "255, 211, 97" }
    : { outer: "#ffffff", inner: "#ffffff", glow: "rgba(255, 255, 255, 0.75)", trail: "255, 250, 220" };
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
  if (spriteCache.dragon === null) spriteCache.dragon = createMobileSpriteImage("dragon");
  if (spriteCache.snow === null) spriteCache.snow = createMobileSpriteImage("snow");
  if (spriteCache.trico === null) spriteCache.trico = createMobileSpriteImage("trico");
  if (spriteCache.aduko === null) spriteCache.aduko = createMobileSpriteImage("aduko");
  if (spriteCache.mage === null) spriteCache.mage = createMobileSpriteImage("mage");
  if (spriteCache.nak === null) spriteCache.nak = createMobileSpriteImage("nak");
  if (spriteCache.turtle === null) spriteCache.turtle = createMobileSpriteImage("turtle");
  if (spriteCache.frog === null) spriteCache.frog = createMobileSpriteImage("frog");
  if (spriteCache.sate === null) spriteCache.sate = createMobileSpriteImage("sate");
  if (spriteCache.dragonRider === null) spriteCache.dragonRider = createRiderSpriteImage("dragon");
}

function createExplosionSpriteCache(): ExplosionSpriteCache {
  return {
    "aduka-thor": null,
    "armor-primary": null,
    "armor-secondary": null,
    "dragon-fire": null,
    "frog-bubble": null,
    gum: null,
    "jd-secondary": null,
    "jd-lightning": null,
    "knight-blade": null,
    "mage-rune": null,
    nak: null,
    "sate-sonar": null,
    "snow-frost": null,
    "trico-horn": null,
    "turtle-shell": null
  };
}

function createBonusIconCache(): BonusIconCache {
  return {
    weapon: null,
    repair: null,
    double: null
  };
}

function loadExplosionSprites(spriteCache: ExplosionSpriteCache): void {
  if (typeof Image === "undefined") return;
  const sheets = Object.keys(explosionSpriteSpecs) as ExplosionSpriteSheet[];
  let index = 0;
  while (index < sheets.length) {
    const sheet = sheets[index];
    if (spriteCache[sheet] === null) {
      const image = new Image();
      image.src = explosionSpriteSpecs[sheet].path;
      spriteCache[sheet] = image;
    }
    index += 1;
  }
}

function loadBonusIcons(iconCache: BonusIconCache): void {
  if (typeof Image === "undefined") return;
  const bonusTypes: BonusType[] = ["weapon", "repair", "double"];
  let index = 0;
  while (index < bonusTypes.length) {
    const bonusType = bonusTypes[index];
    if (iconCache[bonusType] === null) {
      const image = new Image();
      image.src = getBonusIconPath(bonusType);
      iconCache[bonusType] = image;
    }
    index += 1;
  }
}

function createMobileSpriteImage(type: MobileType): HTMLImageElement {
  const image = new Image();
  image.src = getMobileSpriteSource(type).path;
  return image;
}

function createRiderSpriteImage(type: MobileType): HTMLImageElement | null {
  const riderSource = getMobileRiderSpriteSource(type);
  if (riderSource === null) {
    return null;
  }

  const image = new Image();
  const sourceImage = new Image();
  sourceImage.onload = function handleRiderSpriteLoad(): void {
    const canvas = document.createElement("canvas");
    canvas.width = sourceImage.naturalWidth;
    canvas.height = sourceImage.naturalHeight;
    const context = canvas.getContext("2d");
    if (context === null) {
      image.src = sourceImage.src;
      return;
    }

    context.drawImage(sourceImage, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let index = 0;
    while (index < data.length) {
      if (isRiderBackdropPixel(data[index], data[index + 1], data[index + 2])) {
        data[index + 3] = 0;
      }
      index += 4;
    }
    context.putImageData(imageData, 0, 0);
    image.src = canvas.toDataURL("image/png");
  };
  sourceImage.src = riderSource.path;
  return image;
}

function isRiderBackdropPixel(red: number, green: number, blue: number): boolean {
  const redToGreen = Math.abs(red - green);
  const greenToBlue = Math.abs(green - blue);
  const average = (red + green + blue) / 3;
  return redToGreen <= 7 && greenToBlue <= 7 && average >= 236;
}

function drawMobileShadow(context: CanvasRenderingContext2D, player: Player): void {
  context.fillStyle = "rgba(28, 47, 54, 0.24)";
  context.beginPath();
  context.ellipse(player.mobile.position.x, player.mobile.position.y + 6, player.mobile.width * 0.78, 8, 0, 0, Math.PI * 2);
  context.fill();
}

function drawMobileSprite(context: CanvasRenderingContext2D, player: Player, spriteCache: SpriteCache, visualTime: number, moving: boolean): void {
  const sprite = getCachedSprite(spriteCache, player.mobile.type);
  if (sprite === null || !sprite.complete || sprite.naturalWidth === 0) {
    drawFallbackMobile(context, player);
    return;
  }

  const spriteSource = getMobileSpriteSource(player.mobile.type);
  const frame = getMobileAnimationFrame(player.mobile.type, visualTime + player.id * 0.17, moving, spriteSource.frameCount);
  const destinationWidth = spriteSource.width * spriteSource.battleScale;
  const destinationHeight = spriteSource.height * spriteSource.battleScale;
  const destinationX =
    player.mobile.position.x -
    destinationWidth * 0.5 +
    spriteSource.battleTranslateX;
  const destinationY =
    player.mobile.position.y -
    destinationHeight +
    4 +
    spriteSource.battleTranslateY;

  context.save();
  if (shouldFlipMobileSprite(player.mobile.type, player.mobile.facing)) {
    context.translate(player.mobile.position.x, 0);
    context.scale(-1, 1);
    context.translate(-player.mobile.position.x, 0);
  }
  drawMountedRider(context, player, spriteCache);
  context.drawImage(
    sprite, frame * spriteSource.width, 0, spriteSource.width, spriteSource.height,
    destinationX, destinationY, destinationWidth, destinationHeight
  );
  context.restore();
}

function getMobileAnimationFrame(type: MobileType, time: number, moving: boolean, frameCount: number): number {
  if (usesCurrentMotionSheet(type)) {
    return moving ? getMobileSpriteFrame(time, 10, frameCount) : 0;
  }

  return getMobileSpriteFrame(time, moving ? 7.5 : 4.5, frameCount);
}

function usesCurrentMotionSheet(type: MobileType): boolean {
  return (
    type === "dragon" ||
    type === "snow" ||
    type === "trico" ||
    type === "aduko" ||
    type === "mage" ||
    type === "nak" ||
    type === "turtle" ||
    type === "frog" ||
    type === "sate"
  );
}

function drawMountedRider(context: CanvasRenderingContext2D, player: Player, spriteCache: SpriteCache): void {
  const riderSprite = getCachedRiderSprite(spriteCache, player.mobile.type);
  const riderSource = getMobileRiderSpriteSource(player.mobile.type);
  if (riderSprite === null || riderSource === null) {
    return;
  }

  if (!riderSprite.complete || riderSprite.naturalWidth === 0) {
    return;
  }

  const mount = getMobileRiderMount(player.mobile.type);
  const frame = 0;
  const destinationWidth = riderSource.width * riderSource.battleScale * mount.scale;
  const destinationHeight = riderSource.height * riderSource.battleScale * mount.scale;
  const destinationX =
    player.mobile.position.x -
    destinationWidth * 0.5 +
    riderSource.battleTranslateX +
    mount.x;
  const destinationY =
    player.mobile.position.y -
    destinationHeight +
    riderSource.battleTranslateY +
    mount.y;

  context.drawImage(
    riderSprite,
    frame * riderSource.width,
    0,
    riderSource.width,
    riderSource.height,
    destinationX,
    destinationY,
    destinationWidth,
    destinationHeight
  );
}

function getCachedSprite(spriteCache: SpriteCache, type: MobileType): HTMLImageElement | null {
  if (type === "armor") {
    return spriteCache.armor;
  }

  if (type === "knight") {
    return spriteCache.knight;
  }

  if (type === "dragon") {
    return spriteCache.dragon;
  }

  if (type === "trico") {
    return spriteCache.trico;
  }

  if (type === "aduko") {
    return spriteCache.aduko;
  }

  if (type === "mage") {
    return spriteCache.mage;
  }

  if (type === "nak") {
    return spriteCache.nak;
  }

  if (type === "turtle") {
    return spriteCache.turtle;
  }

  if (type === "frog") {
    return spriteCache.frog;
  }

  if (type === "sate") {
    return spriteCache.sate;
  }

  return spriteCache.snow;
}

function getCachedRiderSprite(spriteCache: SpriteCache, type: MobileType): HTMLImageElement | null {
  if (type === "dragon") {
    return spriteCache.dragonRider;
  }

  return null;
}

function drawFallbackMobile(context: CanvasRenderingContext2D, player: Player): void {
  if (
    player.mobile.type === "armor" ||
    player.mobile.type === "snow" ||
    player.mobile.type === "turtle" ||
    player.mobile.type === "sate"
  ) {
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

function applyCameraFrame(context: CanvasRenderingContext2D, cameraFrame: CameraFrame): void {
  context.scale(cameraFrame.scale, cameraFrame.scale);
  context.translate(-cameraFrame.offset.x, -cameraFrame.offset.y);
}

function drawProjectileTrail(context: CanvasRenderingContext2D, trail: Vec2[], mobileType: MobileType, weaponType: WeaponType): void {
  if (trail.length < 2) return;
  const style = getProjectileTrailStyle(mobileType, weaponType);
  let index = 0;
  while (index < trail.length) {
    const point = trail[index];
    const alpha = (index + 1) / trail.length;
    const radius = 1 + alpha * style.width;
    context.shadowBlur = index % 3 === 0 ? 7 * alpha : 0;
    if (context.shadowBlur > 0) {
      context.shadowColor = style.glow;
    }
    context.fillStyle = colorWithAlpha(index % 2 === 0 ? style.color : style.accent, alpha * style.alpha);
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
  const impact = getProjectileImpactStyle(explosionVisual.mobileType, explosionVisual.radius >= 54 ? "secondary" : "primary");

  const flashRadius = explosionVisual.radius * impact.radiusScale * (0.2 + progress * 0.5);
  const flashGradient = context.createRadialGradient(explosionVisual.point.x, explosionVisual.point.y, 0, explosionVisual.point.x, explosionVisual.point.y, flashRadius);
  flashGradient.addColorStop(0, "rgba(255, 255, 255, " + String(alpha * 0.95) + ")");
  flashGradient.addColorStop(0.3, colorWithAlpha(impact.flash, alpha * 0.85));
  flashGradient.addColorStop(0.7, colorWithAlpha(impact.ring, alpha * 0.5));
  flashGradient.addColorStop(1, colorWithAlpha(impact.ring, 0));
  context.fillStyle = flashGradient;
  context.beginPath();
  context.arc(explosionVisual.point.x, explosionVisual.point.y, flashRadius, 0, Math.PI * 2);
  context.fill();

  const smokeRadius = explosionVisual.radius * impact.radiusScale * (0.6 + progress * 0.8);
  const smokeGradient = context.createRadialGradient(explosionVisual.point.x, explosionVisual.point.y, 0, explosionVisual.point.x, explosionVisual.point.y, smokeRadius);
  smokeGradient.addColorStop(0, colorWithAlpha(impact.flash, alpha * 0.38));
  smokeGradient.addColorStop(0.45, colorWithAlpha(impact.smoke, alpha * 0.48));
  smokeGradient.addColorStop(0.82, colorWithAlpha(impact.craterTint, alpha * 0.3));
  smokeGradient.addColorStop(1, colorWithAlpha(impact.craterTint, 0));
  context.fillStyle = smokeGradient;
  context.beginPath();
  context.arc(explosionVisual.point.x, explosionVisual.point.y, smokeRadius, 0, Math.PI * 2);
  context.fill();

  const ringRadius = explosionVisual.radius * impact.radiusScale * (0.4 + progress * 1.0);
  context.strokeStyle = colorWithAlpha(impact.flash, alpha * 0.8);
  context.lineWidth = 6 * alpha + 1;
  context.beginPath();
  context.arc(explosionVisual.point.x, explosionVisual.point.y, ringRadius, 0, Math.PI * 2);
  context.stroke();

  const outerRingRadius = explosionVisual.radius * impact.radiusScale * (0.5 + progress * 1.1);
  context.strokeStyle = colorWithAlpha(impact.ring, alpha * 0.35);
  context.lineWidth = 3 * alpha + 1;
  context.beginPath();
  context.arc(explosionVisual.point.x, explosionVisual.point.y, outerRingRadius, 0, Math.PI * 2);
  context.stroke();
}

function drawExplosionVisuals(context: CanvasRenderingContext2D, explosionVisuals: ExplosionVisual[]): void {
  let index = 0;

  while (index < explosionVisuals.length) {
    drawExplosionVisual(context, explosionVisuals[index]);
    index += 1;
  }
}

function colorWithAlpha(color: string, alpha: number): string {
  if (color.startsWith("#") && color.length === 7) {
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);
    return "rgba(" + String(red) + ", " + String(green) + ", " + String(blue) + ", " + String(alpha) + ")";
  }

  if (color === "#d9d3ff") return "rgba(217, 211, 255, " + String(alpha) + ")";
  if (color === "#bfeeff") return "rgba(191, 238, 255, " + String(alpha) + ")";
  if (color === "#9cff7e") return "rgba(156, 255, 126, " + String(alpha) + ")";
  if (color === "#ffd56e") return "rgba(255, 213, 110, " + String(alpha) + ")";
  if (color === "#ffe7a5") return "rgba(255, 231, 165, " + String(alpha) + ")";
  if (color === "#fff5d4") return "rgba(255, 245, 212, " + String(alpha) + ")";
  return "rgba(255, 255, 255, " + String(alpha) + ")";
}

function drawExplosionSprites(context: CanvasRenderingContext2D, sprites: ExplosionSpriteEffect[], spriteCache: ExplosionSpriteCache): void {
  let index = 0;
  while (index < sprites.length) {
    drawExplosionSpriteSheetFrame(context, sprites[index], spriteCache);
    drawProceduralExplosion(context, sprites[index]);
    index += 1;
  }
}

function drawExplosionSpriteSheetFrame(context: CanvasRenderingContext2D, sprite: ExplosionSpriteEffect, spriteCache: ExplosionSpriteCache): void {
  const image = spriteCache[sprite.sheet];
  if (image === null || !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
    return;
  }

  const spec = explosionSpriteSpecs[sprite.sheet];
  const frameWidth = spec.width / spec.frames;
  const frameHeight = spec.height;
  const frame = Math.min(spec.frames - 1, Math.floor((sprite.timer / sprite.duration) * spec.frames));
  const size = Math.max(72, sprite.radius * 2.4 * sprite.scale);
  const alpha = Math.max(0, 1 - Math.max(0, sprite.timer / sprite.duration - 0.7) / 0.3);

  context.save();
  context.globalAlpha = alpha * 0.88;
  context.globalCompositeOperation = "lighter";
  context.drawImage(
    image,
    frame * frameWidth,
    0,
    frameWidth,
    frameHeight,
    sprite.point.x - size / 2,
    sprite.point.y - size / 2,
    size,
    size
  );
  context.restore();
}

function explosionNoise(seed: number, index: number): number {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function drawProceduralExplosion(context: CanvasRenderingContext2D, sprite: ExplosionSpriteEffect): void {
  const progress = clamp(sprite.timer / sprite.duration, 0, 1);
  const fade = progress < 0.65 ? 1 : Math.max(0, 1 - (progress - 0.65) / 0.35);
  if (fade <= 0) {
    return;
  }

  const x = sprite.point.x;
  const y = sprite.point.y;
  const style = sprite.style;
  const reach = sprite.radius * 1.45;
  const seed = Math.abs(x * 0.37 + y * 0.71 + sprite.radius);

  context.save();
  context.globalCompositeOperation = "lighter";

  const coreFade = Math.max(0, 1 - progress / 0.55);
  if (coreFade > 0) {
    const coreRadius = reach * (0.18 + progress * 0.5);
    const coreGradient = context.createRadialGradient(x, y, 0, x, y, coreRadius);
    coreGradient.addColorStop(0, colorWithAlpha("#ffffff", coreFade));
    coreGradient.addColorStop(0.4, colorWithAlpha(style.core, coreFade * 0.9));
    coreGradient.addColorStop(1, colorWithAlpha(style.ring, 0));
    context.fillStyle = coreGradient;
    context.beginPath();
    context.arc(x, y, coreRadius, 0, Math.PI * 2);
    context.fill();
  }

  const ringRadius = reach * (0.3 + progress * 1.0);
  context.strokeStyle = colorWithAlpha(style.ring, fade * 0.8 * (1 - progress * 0.4));
  context.lineWidth = Math.max(1, (sprite.hasDamage ? 5 : 3) * (1 - progress) + 1);
  context.beginPath();
  context.arc(x, y, ringRadius, 0, Math.PI * 2);
  context.stroke();

  drawExplosionMotif(context, sprite, progress, fade, reach, seed);
  context.restore();

  if (progress > 0.25) {
    const smokeFade = Math.min(1, (progress - 0.25) / 0.35) * (1 - progress) * 1.4;
    if (smokeFade > 0) {
      const smokeY = y - progress * 8;
      const smokeRadius = reach * (0.5 + progress * 0.7);
      const smokeGradient = context.createRadialGradient(x, smokeY, 0, x, smokeY, smokeRadius);
      smokeGradient.addColorStop(0, colorWithAlpha(style.smoke, smokeFade * 0.4));
      smokeGradient.addColorStop(0.7, colorWithAlpha(style.smoke, smokeFade * 0.22));
      smokeGradient.addColorStop(1, colorWithAlpha(style.smoke, 0));
      context.fillStyle = smokeGradient;
      context.beginPath();
      context.arc(x, smokeY, smokeRadius, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawExplosionSpokes(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  count: number,
  innerRadius: number,
  outerRadius: number,
  halfWidth: number,
  color: string,
  rotation: number
): void {
  context.fillStyle = color;
  let index = 0;
  while (index < count) {
    const angle = rotation + (index / count) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const perpX = -sin * halfWidth;
    const perpY = cos * halfWidth;
    context.beginPath();
    context.moveTo(x + cos * innerRadius + perpX, y + sin * innerRadius + perpY);
    context.lineTo(x + cos * outerRadius, y + sin * outerRadius);
    context.lineTo(x + cos * innerRadius - perpX, y + sin * innerRadius - perpY);
    context.closePath();
    context.fill();
    index += 1;
  }
}

function drawExplosionParticles(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number,
  count: number,
  reach: number,
  progress: number,
  fade: number,
  color: string,
  baseSize: number,
  rise: number
): void {
  let index = 0;
  while (index < count) {
    const angle = explosionNoise(seed, index) * Math.PI * 2;
    const distance = reach * (0.2 + progress) * (0.5 + explosionNoise(seed, index + 50) * 0.7);
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance - rise * progress * reach * 0.4;
    const size = baseSize * (1 - progress * 0.6) * (0.6 + explosionNoise(seed, index + 99) * 0.8);
    if (size > 0.4) {
      context.fillStyle = colorWithAlpha(color, fade);
      context.beginPath();
      context.arc(px, py, size, 0, Math.PI * 2);
      context.fill();
    }
    index += 1;
  }
}

function drawExplosionBolt(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number,
  angle: number,
  length: number,
  sway: number,
  color: string,
  width: number
): void {
  const segments = 5;
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(x, y);
  let step = 1;
  while (step <= segments) {
    const t = step / segments;
    const radial = length * t;
    const offset = (explosionNoise(seed, step) - 0.5) * sway * (1 - t);
    const px = x + Math.cos(angle) * radial + Math.cos(angle + Math.PI / 2) * offset;
    const py = y + Math.sin(angle) * radial + Math.sin(angle + Math.PI / 2) * offset;
    context.lineTo(px, py);
    step += 1;
  }
  context.stroke();
}

function drawExplosionMotif(
  context: CanvasRenderingContext2D,
  sprite: ExplosionSpriteEffect,
  progress: number,
  fade: number,
  reach: number,
  seed: number
): void {
  const x = sprite.point.x;
  const y = sprite.point.y;
  const style = sprite.style;

  if (style.motif === "fire") {
    drawExplosionSpokes(context, x, y, 7, reach * 0.1, reach * (0.5 + progress * 0.6), reach * 0.12 * (1 - progress), colorWithAlpha(style.ring, fade * 0.7), -Math.PI / 2 + (explosionNoise(seed, 1) - 0.5) * 0.6);
    drawExplosionParticles(context, x, y, seed, 12, reach, progress, fade * 0.9, style.spark, reach * 0.075, 1.2);
    return;
  }

  if (style.motif === "frost") {
    drawExplosionSpokes(context, x, y, 8, reach * 0.16, reach * (0.55 + progress * 0.8), reach * 0.07 * (1 - progress), colorWithAlpha(style.core, fade * 0.85), progress * 0.4);
    drawExplosionSpokes(context, x, y, 8, reach * 0.12, reach * (0.4 + progress * 0.55), reach * 0.05 * (1 - progress), colorWithAlpha(style.ring, fade * 0.7), Math.PI / 8 + progress * 0.4);
    drawExplosionParticles(context, x, y, seed, 8, reach, progress, fade * 0.8, style.spark, reach * 0.05, 0.2);
    return;
  }

  if (style.motif === "shell") {
    drawExplosionParticles(context, x, y, seed, 11, reach, progress, fade, style.debris, reach * 0.11, 0.4);
    drawExplosionSpokes(context, x, y, 5, reach * 0.12, reach * (0.4 + progress * 0.5), reach * 0.06 * (1 - progress), colorWithAlpha(style.ring, fade * 0.6), seed);
    return;
  }

  if (style.motif === "horn") {
    drawExplosionSpokes(context, x, y, 11, reach * 0.22, reach * (0.6 + progress * 0.7), reach * 0.1 * (1 - progress), colorWithAlpha(style.ring, fade * 0.85), progress * 0.5);
    drawExplosionSpokes(context, x, y, 11, reach * 0.16, reach * (0.45 + progress * 0.55), reach * 0.06 * (1 - progress), colorWithAlpha(style.spark, fade * 0.7), Math.PI / 11 + progress * 0.5);
    return;
  }

  if (style.motif === "spark") {
    const bolts = 6;
    let index = 0;
    while (index < bolts) {
      const angle = (index / bolts) * Math.PI * 2 + explosionNoise(seed, index) * 0.5;
      drawExplosionBolt(context, x, y, seed + index, angle, reach * (0.7 + progress * 0.8), reach * 0.4, colorWithAlpha(index % 2 === 0 ? style.core : style.spark, fade * 0.9), Math.max(1, 2.5 * (1 - progress)));
      index += 1;
    }
    return;
  }

  if (style.motif === "rune") {
    context.strokeStyle = colorWithAlpha(style.spark, fade * 0.7);
    context.lineWidth = Math.max(1, 2 * (1 - progress));
    context.beginPath();
    context.arc(x, y, reach * (0.4 + progress * 0.4), 0, Math.PI * 2);
    context.stroke();
    drawExplosionSpokes(context, x, y, 6, reach * 0.3, reach * (0.5 + progress * 0.45), reach * 0.04, colorWithAlpha(style.core, fade * 0.8), -progress * 0.8);
    drawExplosionParticles(context, x, y, seed, 7, reach, progress, fade * 0.7, style.spark, reach * 0.05, 0.6);
    return;
  }

  if (style.motif === "dust") {
    drawExplosionParticles(context, x, y, seed, 14, reach, progress, fade, style.debris, reach * 0.1, 0.25);
    drawExplosionParticles(context, x, y, seed + 7, 10, reach, progress, fade * 0.6, style.smoke, reach * 0.13, 0.15);
    return;
  }

  if (style.motif === "bubble") {
    context.lineWidth = Math.max(1, 2 * (1 - progress));
    let index = 0;
    while (index < 9) {
      const angle = explosionNoise(seed, index) * Math.PI * 2;
      const distance = reach * (0.2 + progress) * (0.4 + explosionNoise(seed, index + 30) * 0.8);
      const bubbleRadius = reach * 0.12 * (0.5 + explosionNoise(seed, index + 60) * 0.9) * (1 - progress * 0.4);
      if (bubbleRadius > 0.6) {
        context.strokeStyle = colorWithAlpha(index % 2 === 0 ? style.ring : style.spark, fade * 0.75);
        context.beginPath();
        context.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance - progress * reach * 0.2, bubbleRadius, 0, Math.PI * 2);
        context.stroke();
      }
      index += 1;
    }
    return;
  }

  if (style.motif === "sonar") {
    let index = 0;
    while (index < 3) {
      const ringProgress = clamp(progress * 1.4 - index * 0.22, 0, 1);
      if (ringProgress > 0 && ringProgress < 1) {
        context.strokeStyle = colorWithAlpha(index % 2 === 0 ? style.ring : style.core, fade * (1 - ringProgress) * 0.9);
        context.lineWidth = Math.max(1, 3 * (1 - ringProgress));
        context.beginPath();
        context.arc(x, y, reach * (0.2 + ringProgress * 1.1), 0, Math.PI * 2);
        context.stroke();
      }
      index += 1;
    }
    return;
  }

  // blade
  context.lineWidth = Math.max(1, 3 * (1 - progress));
  let index = 0;
  while (index < 3) {
    const base = seed + index * 1.7 - progress * 0.6;
    const arcRadius = reach * (0.4 + progress * 0.7);
    context.strokeStyle = colorWithAlpha(index % 2 === 0 ? style.core : style.spark, fade * 0.8);
    context.beginPath();
    context.arc(x, y, arcRadius, base, base + Math.PI * 0.5);
    context.stroke();
    index += 1;
  }
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

type GhostShot = {
  points: Vec2[];
  mobileType: MobileType;
  weapon: WeaponType;
};

// Records the live shot's flight path each frame and freezes it on impact, per
// player, so the active player can see the faint ghost arc and landing mark of
// their own previous shot — the classic Gunbound "adjust off the last one" loop
// without ever showing a live solution line.
function captureGhostShot(
  state: ReturnType<typeof useGameStore.getState>,
  liveShot: React.MutableRefObject<(GhostShot & { owner: PlayerId }) | null>,
  lastShot: React.MutableRefObject<[GhostShot | null, GhostShot | null]>,
  ghostRound: React.MutableRefObject<number>
): void {
  if (state.round !== ghostRound.current) {
    ghostRound.current = state.round;
    lastShot.current = [null, null];
    liveShot.current = null;
  }

  const projectile = state.projectile;
  if (projectile !== null) {
    if (liveShot.current === null || liveShot.current.owner !== projectile.owner) {
      liveShot.current = { owner: projectile.owner, points: [], mobileType: projectile.mobileType, weapon: projectile.weapon };
    }
    const points = liveShot.current.points;
    const previous = points[points.length - 1];
    if (previous === undefined || Math.hypot(projectile.position.x - previous.x, projectile.position.y - previous.y) > 5) {
      points.push({ x: projectile.position.x, y: projectile.position.y });
      if (points.length > 240) {
        points.shift();
      }
    }
    return;
  }

  if (liveShot.current !== null) {
    if (liveShot.current.points.length > 1) {
      lastShot.current[liveShot.current.owner - 1] = {
        points: liveShot.current.points,
        mobileType: liveShot.current.mobileType,
        weapon: liveShot.current.weapon
      };
    }
    liveShot.current = null;
  }
}

function drawGhostShot(context: CanvasRenderingContext2D, ghost: GhostShot): void {
  const points = ghost.points;
  if (points.length < 2) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash([3, 7]);
  context.lineWidth = 1.5;
  context.strokeStyle = "rgba(255, 255, 255, 0.18)";
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  let index = 1;
  while (index < points.length) {
    context.lineTo(points[index].x, points[index].y);
    index += 1;
  }
  context.stroke();
  context.setLineDash([]);

  const impact = points[points.length - 1];
  context.strokeStyle = "rgba(255, 220, 130, 0.42)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(impact.x, impact.y, 6, 0, Math.PI * 2);
  context.moveTo(impact.x - 9, impact.y);
  context.lineTo(impact.x + 9, impact.y);
  context.moveTo(impact.x, impact.y - 9);
  context.lineTo(impact.x, impact.y + 9);
  context.stroke();
  context.restore();
}

function drawAimGuide(
  context: CanvasRenderingContext2D,
  player: Player,
  wind: { x: number; y: number },
  weather: WeatherState,
  power: number,
  charging: boolean,
  terrain: TerrainState
): void {
  const launchRadians = getLaunchRadians(player.mobile);
  const muzzle = getMuzzlePosition(player.mobile, launchRadians);
  const guidePower = charging ? Math.max(0.14, power) : 0.56;
  const profile = createWeaponProfile(player.mobile.type, player.mobile.weapon, guidePower);
  let damage = profile.damage;
  let blastRadius = profile.blastRadius;
  let velocity = {
    x: Math.cos(launchRadians) * profile.speed,
    y: -Math.sin(launchRadians) * profile.speed
  };
  let x = muzzle.x;
  let y = muzzle.y;
  let forceBoosted = false;
  let tornadoTriggered = false;
  let step = 0;

  context.strokeStyle = "rgba(255, 255, 255, 0.48)";
  context.lineWidth = 2;
  context.beginPath();

  while (step < 28) {
    const previous = { x, y };
    velocity = {
      x: velocity.x + wind.x * windForceCoefficient * profile.windScale * 0.08,
      y: velocity.y + (530 * profile.gravityScale + wind.y * 120) * 0.08
    };
    let position = {
      x: x + velocity.x * 0.08,
      y: y + velocity.y * 0.08
    };
    const weatherFlight = applyWeatherToFlightState(
      {
        position,
        previousPosition: previous,
        velocity,
        damage,
        blastRadius,
        forceBoosted,
        tornadoTriggered
      },
      weather
    );
    velocity = weatherFlight.velocity;
    position = weatherFlight.position;
    damage = weatherFlight.damage;
    blastRadius = weatherFlight.blastRadius;
    forceBoosted = weatherFlight.forceBoosted;
    tornadoTriggered = weatherFlight.tornadoTriggered;
    x = position.x;
    y = position.y;

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

function drawWeatherOverlay(context: CanvasRenderingContext2D, weather: WeatherState, visualTime: number): void {
  if (weather.kind === "force") {
    const glow = context.createLinearGradient(weather.beamX - 18, 0, weather.beamX + 18, 0);
    glow.addColorStop(0, "rgba(255, 214, 94, 0)");
    glow.addColorStop(0.5, "rgba(255, 214, 94, 0.34)");
    glow.addColorStop(1, "rgba(255, 214, 94, 0)");
    context.fillStyle = glow;
    context.fillRect(weather.beamX - 18, 0, 36, worldHeight);
    return;
  }

  if (weather.kind === "tornado") {
    context.save();
    context.translate(weather.vortex.x, weather.vortex.y);
    context.strokeStyle = "rgba(196, 238, 255, 0.55)";
    context.lineWidth = 2;
    let ring = 0;
    while (ring < 4) {
      const radius = weather.radius - ring * 10;
      context.beginPath();
      context.arc(0, Math.sin(visualTime * 2.2 + ring) * 6, radius, visualTime * weather.swirl * 0.6 + ring * 0.5, visualTime * weather.swirl * 0.6 + Math.PI * 1.15 + ring * 0.5);
      context.stroke();
      ring += 1;
    }
    context.restore();
    return;
  }

  if (weather.kind === "moon") {
    context.fillStyle = "rgba(210, 236, 255, 0.08)";
    context.fillRect(0, 0, worldWidth, worldHeight);
    return;
  }

  if (weather.kind === "eclipse") {
    context.fillStyle = "rgba(35, 24, 58, 0.12)";
    context.fillRect(0, 0, worldWidth, worldHeight);
  }
}

// ---- Particle draw functions ----

function drawDebris(context: CanvasRenderingContext2D, debris: DebrisParticle[]): void {
  for (let i = 0; i < debris.length; i++) {
    const p = debris[i];
    const alpha = p.life / p.maxLife;
    context.globalAlpha = alpha;
    context.fillStyle = p.color;
    context.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  context.globalAlpha = 1;
}

function drawWindLeaves(context: CanvasRenderingContext2D, leaves: WindLeaf[]): void {
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

function drawChargeSparks(context: CanvasRenderingContext2D, sparks: ChargeSpark[]): void {
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

function drawDustPuffs(context: CanvasRenderingContext2D, dust: DustPuff[]): void {
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

function drawShellCasings(context: CanvasRenderingContext2D, casings: ShellCasing[]): void {
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

function drawSmokePuffs(context: CanvasRenderingContext2D, smoke: SmokePuff[]): void {
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

function drawBounceSparks(context: CanvasRenderingContext2D, sparks: BounceSpark[]): void {
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

function drawSun(context: CanvasRenderingContext2D, theme: TerrainTheme): void {
  const palette = getSkyPalette(theme);
  if (theme === "midnight") {
    const moonGradient = context.createRadialGradient(170, 120, 0, 170, 120, 72);
    moonGradient.addColorStop(0, palette.sunInner);
    moonGradient.addColorStop(0.65, palette.sunOuter);
    moonGradient.addColorStop(1, "rgba(194, 214, 255, 0)");
    context.fillStyle = moonGradient;
    context.beginPath();
    context.arc(170, 120, 72, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(208, 222, 255, 0.48)";
    context.beginPath();
    context.arc(146, 102, 8, 0, Math.PI * 2);
    context.arc(182, 138, 11, 0, Math.PI * 2);
    context.arc(193, 100, 5, 0, Math.PI * 2);
    context.fill();
    return;
  }

  const gradient = context.createRadialGradient(170, 120, 0, 170, 120, 92);
  gradient.addColorStop(0, palette.sunInner);
  gradient.addColorStop(0.6, palette.sunOuter);
  gradient.addColorStop(1, palette.sunFade);
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(170, 120, 92, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(170, 120);
  context.strokeStyle = theme === "sunset" ? "rgba(255, 193, 130, 0.18)" : "rgba(255, 240, 174, 0.16)";
  context.lineWidth = theme === "sunset" ? 18 : 14;
  for (let i = 0; i < 8; i += 1) {
    context.rotate(Math.PI / 4);
    context.beginPath();
    context.moveTo(34, 0);
    context.lineTo(108, 0);
    context.stroke();
  }
  context.restore();
}

function drawCloud(
  context: CanvasRenderingContext2D,
  palette: ReturnType<typeof getSkyPalette>,
  x: number,
  y: number,
  scale: number,
  opacity: number
): void {
  context.fillStyle = palette.cloudShade;
  drawCloudBubble(context, x + 8 * scale, y + 12 * scale, 50 * scale, 18 * scale);
  drawCloudBubble(context, x + 70 * scale, y + 15 * scale, 66 * scale, 20 * scale);
  context.fillStyle = withOpacity(palette.cloudColor, opacity);
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
  const palette = getSkyPalette(theme);
  const crests =
    theme === "midnight"
      ? [444, 374, 408, 328, 412, 320, 430, 340, 418, 356]
      : theme === "sunset"
        ? [474, 386, 440, 320, 436, 336, 454, 350, 428, 390]
        : [460, 355, 435, 310, 428, 332, 452, 346, 432, 370];
  fillHillBand(context, crests, palette.backMountains, 0.06);
}

function drawMidMountains(context: CanvasRenderingContext2D, theme: TerrainTheme): void {
  const palette = getSkyPalette(theme);
  const crests =
    theme === "midnight"
      ? [504, 434, 472, 400, 490, 410, 500, 432, 520]
      : theme === "sunset"
        ? [518, 454, 510, 430, 520, 444, 530, 458, 534]
        : [498, 432, 486, 402, 500, 418, 504, 438, 516];
  fillHillBand(context, crests, palette.midMountains, 0.09);
}

function drawFrontMountains(context: CanvasRenderingContext2D, theme: TerrainTheme): void {
  const palette = getSkyPalette(theme);
  fillHillBand(context, [520, 438, 504, 418, 526, 432, 520, 458, 536], palette.frontMountains, 0.12);
}

// Draws one parallax hill band from evenly spaced crest heights, rounding the
// silhouette into soft Gunbound-style rolls and adding a faint sun-side crest
// highlight so the layers read as receding atmospheric depth.
function fillHillBand(
  context: CanvasRenderingContext2D,
  crestHeights: number[],
  fillColor: string,
  highlightStrength: number
): void {
  const crests = crestHeights.map((y, index) => ({
    x: (worldWidth * index) / (crestHeights.length - 1),
    y
  }));

  context.beginPath();
  traceSmoothRidge(context, crests);
  context.lineTo(worldWidth, worldHeight);
  context.lineTo(0, worldHeight);
  context.closePath();
  context.fillStyle = fillColor;
  context.fill();

  context.save();
  context.beginPath();
  traceSmoothRidge(context, crests);
  context.lineWidth = 2.5;
  context.strokeStyle = "rgba(255, 255, 255, " + String(highlightStrength) + ")";
  context.stroke();
  context.restore();
}

function traceSmoothRidge(context: CanvasRenderingContext2D, crests: Vec2[]): void {
  context.moveTo(crests[0].x, crests[0].y);
  let index = 0;
  while (index < crests.length - 1) {
    const current = crests[index];
    const next = crests[index + 1];
    context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    index += 1;
  }
  const last = crests[crests.length - 1];
  context.lineTo(last.x, last.y);
}

function drawSkyGlow(context: CanvasRenderingContext2D, theme: TerrainTheme): void {
  const palette = getSkyPalette(theme);
  const glow = context.createLinearGradient(0, 0, 0, worldHeight);
  glow.addColorStop(0.2, "rgba(255, 255, 255, 0)");
  glow.addColorStop(0.66, palette.horizonGlowSoft);
  glow.addColorStop(1, palette.horizonGlow);
  context.fillStyle = glow;
  context.fillRect(0, 0, worldWidth, worldHeight);
  context.fillStyle = palette.haze;
  context.fillRect(0, worldHeight * 0.58, worldWidth, worldHeight * 0.24);
}

function drawHorizonMist(context: CanvasRenderingContext2D, palette: ReturnType<typeof getSkyPalette>): void {
  const mist = context.createLinearGradient(0, 420, 0, 620);
  mist.addColorStop(0, "rgba(255, 255, 255, 0)");
  mist.addColorStop(0.35, palette.haze);
  mist.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = mist;
  context.fillRect(0, 400, worldWidth, 220);
}

function drawStars(context: CanvasRenderingContext2D, color: string, visualTime: number): void {
  const stars = [
    { x: 82, y: 68, size: 1.6, speed: 0.9 },
    { x: 214, y: 142, size: 2.2, speed: 1.1 },
    { x: 366, y: 88, size: 1.4, speed: 1.4 },
    { x: 520, y: 164, size: 1.8, speed: 0.7 },
    { x: 708, y: 72, size: 2, speed: 1.2 },
    { x: 884, y: 138, size: 1.5, speed: 0.85 },
    { x: 1016, y: 80, size: 2.1, speed: 1.35 },
    { x: 1184, y: 132, size: 1.7, speed: 0.95 }
  ];

  for (let i = 0; i < stars.length; i += 1) {
    const star = stars[i];
    const alpha = 0.45 + (Math.sin(visualTime * star.speed + i * 1.7) + 1) * 0.22;
    context.fillStyle = withOpacity(color, alpha);
    context.fillRect(star.x, star.y, star.size, star.size);
  }
}

function withOpacity(color: string, opacity: number): string {
  if (!color.startsWith("rgba(")) {
    return color;
  }

  const channels = color.slice(5, -1).split(",").map((part) => part.trim());
  return "rgba(" + channels[0] + ", " + channels[1] + ", " + channels[2] + ", " + String(opacity) + ")";
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
