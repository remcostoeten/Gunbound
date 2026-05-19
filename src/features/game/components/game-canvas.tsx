"use client";

import { useEffect, useRef } from "react";
import { createCameraRig, getCameraFrame, stepCameraRig } from "@/features/game/engine/camera";
import { createVisualEffectsState, stepVisualEffectsState } from "@/features/game/engine/effects";
import { getSkyPalette, getTerrainPalette } from "@/features/game/engine/terrain-theme";
import { getMobileSpriteFrame, getMobileSpriteSource, shouldFlipMobileSprite } from "@/features/game/engine/mobile-sprites";
import { getLaunchRadians, getMuzzlePosition } from "@/features/game/engine/physics";
import { getMobileRiderSpriteSource, getRiderSpriteFrame } from "@/features/game/engine/rider-sprites";
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
import type { CameraFrame } from "@/features/game/types/presentation";
import type { MobileType, PlayerAccent, TerrainTheme, Vec2, WeaponType } from "@/features/game/types/shared";

type SpriteCache = {
  armor: HTMLImageElement | null;
  knight: HTMLImageElement | null;
  dragon: HTMLImageElement | null;
  snow: HTMLImageElement | null;
  dragonRider: HTMLImageElement | null;
};

type ExplosionSpriteSpec = {
  path: string;
  frames: number;
  width: number;
  height: number;
};

type ExplosionSpriteCache = Record<ExplosionSpriteSheet, HTMLImageElement | null>;

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
  nak: {
    path: "/explodes/nak.png",
    frames: 9,
    width: 1094,
    height: 128
  }
};

export function GameCanvas(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousFrameTimeRef = useRef(0);
  const visualTimeRef = useRef(0);
  const cameraRigRef = useRef(createCameraRig());
  const visualEffectsRef = useRef<VisualEffectsState>(createVisualEffectsState());
  const spriteCacheRef = useRef<SpriteCache>({
    armor: null,
    knight: null,
    dragon: null,
    snow: null,
    dragonRider: null
  });
  const explosionSpriteCacheRef = useRef<ExplosionSpriteCache>(createExplosionSpriteCache());

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
    loadExplosionSprites(explosionSpriteCacheRef.current);
  }

  function drawFrame(): void {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const context = canvas.getContext("2d");
    if (context === null) return;

    context.imageSmoothingEnabled = false;
    const delta = advanceVisualClock();

    const state = useGameStore.getState();
    visualEffectsRef.current = stepVisualEffectsState(visualEffectsRef.current, {
      projectile: state.projectile,
      players: state.players,
      turn: state.turn,
      explosionVisual: state.explosionVisual,
      wind: state.wind,
      scene: state.scene,
      charging: state.charging,
      phase: state.phase,
      damagePopups: state.damagePopups,
      terrain: state.terrain,
      dt: delta,
      visualTime: visualTimeRef.current
    });
    const visualEffects = visualEffectsRef.current;
    cameraRigRef.current = stepCameraRig(cameraRigRef.current, {
      scene: state.scene,
      phase: state.phase,
      turn: state.turn,
      players: state.players,
      projectile: state.projectile,
      explosionVisual: state.explosionVisual,
      dt: delta
    });
    const cameraFrame = getCameraFrame(cameraRigRef.current, visualTimeRef.current, state.explosionVisual, visualEffects.fireShake);

    context.save();
    applyCameraFrame(context, cameraFrame);

    drawBackground(context, state.terrain?.theme || "meadow", visualTimeRef.current);

    if (state.terrain !== null) {
      drawTerrain(context, state.terrain);
      drawGrass(context, state.terrain, visualTimeRef.current, state.wind, visualEffects.grass);
    }

    drawBonusBoxes(context, state.bonusBoxes);

    if (state.scene === "playing" && state.projectile === null && state.terrain !== null) {
      drawAimGuide(context, state.players[state.turn - 1], state.wind, state.power, state.charging, state.terrain);
    }

    drawProjectileTrail(context, visualEffects.trail, visualEffects.lastWeapon);
    drawWindLeaves(context, visualEffects.leaves);
    drawPlayers(context, state.players, state.turn, visualTimeRef.current, spriteCacheRef.current);

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
    drawExplosionVisual(context, state.explosionVisual);
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

  const skyPalette = getSkyPalette(terrain.theme);
  context.strokeStyle = skyPalette.terrainStroke;
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

function drawGrass(context: CanvasRenderingContext2D, terrain: TerrainState, visualTime: number, wind: { x: number; y: number }, grass: GrassTuft[]): void {
  const palette = getTerrainPalette(terrain.theme);
  for (let i = 0; i < grass.length; i++) {
    const g = grass[i];
    const sway = Math.sin(visualTime * 2.4 + g.sway) * 3 + wind.x * 4;
    context.strokeStyle = "rgba(" + String(palette.grassMid[0]) + ", " + String(palette.grassMid[1]) + ", " + String(palette.grassMid[2]) + ", 0.7)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(g.x, g.y);
    context.quadraticCurveTo(g.x + sway * 0.5, g.y - g.height * 0.8, g.x + sway, g.y - g.height);
    context.stroke();
  }
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
  if (spriteCache.dragon === null) spriteCache.dragon = createMobileSpriteImage("dragon");
  if (spriteCache.snow === null) spriteCache.snow = createMobileSpriteImage("snow");
  if (spriteCache.dragonRider === null) spriteCache.dragonRider = createRiderSpriteImage("dragon");
}

function createExplosionSpriteCache(): ExplosionSpriteCache {
  return {
    "aduka-thor": null,
    "armor-primary": null,
    "armor-secondary": null,
    gum: null,
    "jd-secondary": null,
    "jd-lightning": null,
    nak: null
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

function drawMobileSprite(context: CanvasRenderingContext2D, player: Player, spriteCache: SpriteCache, visualTime: number): void {
  const sprite = getCachedSprite(spriteCache, player.mobile.type);
  if (sprite === null || !sprite.complete || sprite.naturalWidth === 0) {
    drawFallbackMobile(context, player);
    return;
  }

  const spriteSource = getMobileSpriteSource(player.mobile.type);
  const frame = getMobileSpriteFrame(visualTime + player.id * 0.17, 6.5);
  const destinationWidth = spriteSource.width * spriteSource.battleScale;
  const destinationHeight = spriteSource.height * spriteSource.battleScale;
  const destinationX =
    player.mobile.position.x -
    destinationWidth * 0.5 +
    spriteSource.battleTranslateX;
  const destinationY =
    player.mobile.position.y -
    destinationHeight +
    14 +
    spriteSource.battleTranslateY;

  context.save();
  if (shouldFlipMobileSprite(player.mobile.type, player.mobile.facing)) {
    context.translate(player.mobile.position.x, 0);
    context.scale(-1, 1);
    context.translate(-player.mobile.position.x, 0);
  }
  context.drawImage(
    sprite, frame * spriteSource.width, 0, spriteSource.width, spriteSource.height,
    destinationX, destinationY, destinationWidth, destinationHeight
  );
  drawMountedRider(context, player, spriteCache, visualTime);
  context.restore();
}

function drawMountedRider(context: CanvasRenderingContext2D, player: Player, spriteCache: SpriteCache, visualTime: number): void {
  const riderSprite = getCachedRiderSprite(spriteCache, player.mobile.type);
  const riderSource = getMobileRiderSpriteSource(player.mobile.type);
  if (riderSprite === null || riderSource === null) {
    return;
  }

  if (!riderSprite.complete || riderSprite.naturalWidth === 0) {
    return;
  }

  const frame = getRiderSpriteFrame(visualTime + player.id * 0.13, 4.5, riderSource.frameCount);
  const destinationWidth = riderSource.width * riderSource.battleScale;
  const destinationHeight = riderSource.height * riderSource.battleScale;
  const destinationX = player.mobile.position.x - destinationWidth * 0.5 + riderSource.battleTranslateX;
  const destinationY = player.mobile.position.y - destinationHeight + riderSource.battleTranslateY;

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

  return spriteCache.snow;
}

function getCachedRiderSprite(spriteCache: SpriteCache, type: MobileType): HTMLImageElement | null {
  if (type === "dragon") {
    return spriteCache.dragonRider;
  }

  return null;
}

function drawFallbackMobile(context: CanvasRenderingContext2D, player: Player): void {
  if (player.mobile.type === "armor" || player.mobile.type === "snow") {
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

function drawProjectileTrail(context: CanvasRenderingContext2D, trail: Vec2[], weaponType: WeaponType): void {
  if (trail.length < 2) return;
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

function drawExplosionSprites(context: CanvasRenderingContext2D, sprites: ExplosionSpriteEffect[], spriteCache: ExplosionSpriteCache): void {
  let index = 0;
  while (index < sprites.length) {
    drawExplosionSprite(context, sprites[index], spriteCache);
    index += 1;
  }
}

function drawExplosionSprite(context: CanvasRenderingContext2D, sprite: ExplosionSpriteEffect, spriteCache: ExplosionSpriteCache): void {
  const image = spriteCache[sprite.sheet];
  if (image === null || !image.complete || image.naturalWidth === 0) {
    return;
  }

  const spec = explosionSpriteSpecs[sprite.sheet];
  const frameWidth = spec.width / spec.frames;
  const progress = Math.max(0, Math.min(0.999, sprite.timer / sprite.duration));
  const frame = Math.min(spec.frames - 1, Math.floor(progress * spec.frames));
  const alpha = progress < 0.82 ? 1 : 1 - (progress - 0.82) / 0.18;
  const destinationWidth = frameWidth * sprite.scale;
  const destinationHeight = spec.height * sprite.scale;

  context.save();
  context.globalAlpha = Math.max(0, Math.min(1, alpha));
  context.globalCompositeOperation = "screen";
  context.drawImage(
    image,
    frame * frameWidth,
    0,
    frameWidth,
    spec.height,
    sprite.point.x - destinationWidth * 0.5,
    sprite.point.y - destinationHeight * 0.72,
    destinationWidth,
    destinationHeight
  );
  context.restore();
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
  context.fillStyle = getSkyPalette(theme).backMountains;
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
  context.fillStyle = getSkyPalette(theme).frontMountains;
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
