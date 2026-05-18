"use client";

import { useEffect, useRef } from "react";
import { getMobileSpriteFrame, getMobileSpriteSource } from "@/features/game/engine/mobile-sprites";
import { getLaunchRadians, getMuzzlePosition } from "@/features/game/engine/physics";
import { useGameLoop } from "@/features/game/hooks/use-game-loop";
import { useInput } from "@/features/game/hooks/use-input";
import { useGameStore } from "@/features/game/store/game-store";
import type { BonusBox, DamagePopup, ExplosionVisual, MobileType, Player, ProjectileState, TerrainState, Vec2 } from "@/features/game/types/game";
import { worldHeight, worldWidth } from "@/features/game/types/game";

type SpriteCache = {
  armor: HTMLImageElement | null;
  knight: HTMLImageElement | null;
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
  useInput();
  useGameLoop(drawFrame);
  useEffect(setupCanvas, []);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Gunbound game canvas" />;

  function setupCanvas(): void {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }

    canvas.width = worldWidth;
    canvas.height = worldHeight;
    loadMobileSprites(spriteCacheRef.current);
  }

  function drawFrame(): void {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }

    const context = canvas.getContext("2d");
    if (context === null) {
      return;
    }

    context.imageSmoothingEnabled = false;
    advanceVisualClock();
    const state = useGameStore.getState();
    syncProjectileEffects(state.projectile);

    context.save();
    applyCameraShake(context, state.explosionVisual);
    drawBackground(context, visualTimeRef.current);

    if (state.terrain !== null) {
      drawTerrain(context, state.terrain);
    }

    drawBonusBoxes(context, state.bonusBoxes);

    if (state.scene === "playing" && state.projectile === null && state.terrain !== null) {
      drawAimGuide(context, state.players[state.turn - 1], state.wind, state.power, state.charging, state.terrain);
    }

    drawProjectileTrail(context, trailRef.current);
    drawPlayers(context, state.players, state.turn, visualTimeRef.current, spriteCacheRef.current);

    if (state.projectile !== null) {
      drawProjectile(context, state.projectile);
    }

    drawMuzzleFlash(context, muzzleFlashRef.current);
    drawExplosionVisual(context, state.explosionVisual);
    drawDamagePopups(context, state.damagePopups);
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
  }

  function syncProjectileEffects(projectile: ProjectileState | null): void {
    if (projectile !== null) {
      if (previousProjectileRef.current === null) {
        muzzleFlashRef.current = {
          point: projectile.position,
          radius: 34,
          timer: 0.16,
          duration: 0.16
        };
        trailRef.current = [];
      }

      pushTrailPoint(projectile.position);
    } else {
      decayTrail();
    }

    previousProjectileRef.current = projectile;
  }

  function tickMuzzleFlash(delta: number): void {
    const muzzleFlash = muzzleFlashRef.current;
    if (muzzleFlash === null) {
      return;
    }

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

  function pushTrailPoint(point: Vec2): void {
    trailRef.current.push({
      x: point.x,
      y: point.y
    });

    if (trailRef.current.length > 18) {
      trailRef.current.shift();
    }
  }

  function decayTrail(): void {
    if (trailRef.current.length > 0) {
      trailRef.current.shift();
    }
  }
}

function drawBackground(context: CanvasRenderingContext2D, visualTime: number): void {
  const gradient = context.createLinearGradient(0, 0, 0, worldHeight);
  gradient.addColorStop(0, "#b4e1ff");
  gradient.addColorStop(0.45, "#79c0f4");
  gradient.addColorStop(1, "#4f93ca");
  context.fillStyle = gradient;
  context.fillRect(0, 0, worldWidth, worldHeight);

  drawSun(context);
  drawCloud(context, 175 + Math.sin(visualTime * 0.16) * 12, 135, 1.18, 0.84);
  drawCloud(context, 418 + Math.sin(visualTime * 0.14 + 1.3) * 10, 110, 0.9, 0.7);
  drawCloud(context, 985 + Math.sin(visualTime * 0.11 + 2.2) * 14, 100, 1.04, 0.76);
  drawCloud(context, 1120 + Math.sin(visualTime * 0.19 + 0.7) * 8, 172, 0.82, 0.62);
  drawBackMountains(context);
  drawFrontMountains(context);
}

function drawTerrain(context: CanvasRenderingContext2D, terrain: TerrainState): void {
  if (terrain.canvas !== null) {
    context.drawImage(terrain.canvas, 0, 0);
  }

  context.strokeStyle = "#d8f5a0";
  context.lineWidth = 3;
  context.beginPath();
  let x = 0;

  while (x < terrain.heights.length) {
    const y = terrain.heights[x];
    if (x === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
    x += 8;
  }

  context.stroke();
  context.strokeStyle = "rgba(57, 31, 18, 0.35)";
  context.lineWidth = 1;
  context.stroke();
}

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

function drawPlayers(
  context: CanvasRenderingContext2D,
  players: [Player, Player],
  turn: 1 | 2,
  visualTime: number,
  spriteCache: SpriteCache
): void {
  let index = 0;

  while (index < players.length) {
    const player = players[index];
    const isTurn = player.id === turn;
    drawMobile(context, player, isTurn, visualTime, spriteCache);
    index += 1;
  }
}

function drawMobile(
  context: CanvasRenderingContext2D,
  player: Player,
  isTurn: boolean,
  visualTime: number,
  spriteCache: SpriteCache
): void {
  const accent = player.id === 1 ? "#62c3ff" : "#ff9262";
  const bob = Math.sin((player.mobile.position.x * 0.02 + visualTime * 4.2) * 0.9) * 1.6;

  if (isTurn) {
    drawTurnGlow(context, player.mobile.position.x, player.mobile.position.y + bob);
  }

  context.save();
  context.translate(0, bob);
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
  context.fillStyle = projectile.weapon === "secondary" ? "#ffe7a5" : "#ffffff";
  context.shadowBlur = 14;
  context.shadowColor = projectile.weapon === "secondary" ? "rgba(255, 211, 97, 0.82)" : "rgba(255, 255, 255, 0.72)";
  context.beginPath();
  context.arc(projectile.position.x, projectile.position.y, projectile.radius, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
}

function getBonusShortLabel(type: BonusBox["type"]): string {
  if (type === "weapon") {
    return "W";
  }

  if (type === "repair") {
    return "HP";
  }

  return "2X";
}

function loadMobileSprites(spriteCache: SpriteCache): void {
  if (typeof Image === "undefined") {
    return;
  }

  if (spriteCache.armor === null) {
    spriteCache.armor = createMobileSpriteImage("armor");
  }

  if (spriteCache.knight === null) {
    spriteCache.knight = createMobileSpriteImage("knight");
  }
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
    sprite,
    frame * spriteSource.width,
    0,
    spriteSource.width,
    spriteSource.height,
    destinationX,
    destinationY,
    spriteSource.width,
    spriteSource.height
  );
  context.restore();
}

function getCachedSprite(spriteCache: SpriteCache, type: MobileType): HTMLImageElement | null {
  if (type === "armor") {
    return spriteCache.armor;
  }

  return spriteCache.knight;
}

function drawFallbackMobile(context: CanvasRenderingContext2D, player: Player): void {
  if (player.mobile.type === "armor") {
    drawArmorMobile(context, player, "#62c3ff");
    return;
  }

  drawKnightMobile(context, player, "#ff9262");
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
  if (explosionVisual === null) {
    return;
  }

  const intensity = explosionVisual.timer / explosionVisual.duration;
  const offsetX = (Math.random() - 0.5) * 12 * intensity;
  const offsetY = (Math.random() - 0.5) * 10 * intensity;
  context.translate(offsetX, offsetY);
}

function drawProjectileTrail(context: CanvasRenderingContext2D, trail: Vec2[]): void {
  if (trail.length < 2) {
    return;
  }

  let index = 0;
  while (index < trail.length) {
    const point = trail[index];
    const alpha = (index + 1) / trail.length;
    const radius = 1 + alpha * 3;
    context.fillStyle = "rgba(255, 250, 220, " + String(alpha * 0.38) + ")";
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
    index += 1;
  }
}

function drawMuzzleFlash(context: CanvasRenderingContext2D, muzzleFlash: ExplosionVisual | null): void {
  if (muzzleFlash === null) {
    return;
  }

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
  if (explosionVisual === null) {
    return;
  }

  const progress = 1 - explosionVisual.timer / explosionVisual.duration;
  const ringRadius = explosionVisual.radius * (0.45 + progress * 0.95);
  const smokeRadius = explosionVisual.radius * (0.55 + progress * 0.7);
  const alpha = 1 - progress;
  const gradient = context.createRadialGradient(explosionVisual.point.x, explosionVisual.point.y, 0, explosionVisual.point.x, explosionVisual.point.y, smokeRadius);
  gradient.addColorStop(0, "rgba(255, 242, 183, " + String(alpha) + ")");
  gradient.addColorStop(0.35, "rgba(255, 169, 74, " + String(alpha * 0.92) + ")");
  gradient.addColorStop(0.7, "rgba(143, 88, 52, " + String(alpha * 0.55) + ")");
  gradient.addColorStop(1, "rgba(143, 88, 52, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(explosionVisual.point.x, explosionVisual.point.y, smokeRadius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(255, 252, 229, " + String(alpha * 0.9) + ")";
  context.lineWidth = 5 * alpha + 1;
  context.beginPath();
  context.arc(explosionVisual.point.x, explosionVisual.point.y, ringRadius, 0, Math.PI * 2);
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

function drawAimGuide(
  context: CanvasRenderingContext2D,
  player: Player,
  wind: { x: number; y: number },
  power: number,
  charging: boolean,
  terrain: TerrainState
): void {
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

    if (step === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }

    if (x < 0 || x >= terrain.width || y >= terrain.height) {
      break;
    }

    if (y >= terrain.heights[Math.floor(x)]) {
      break;
    }

    step += 1;
  }

  context.stroke();
  context.fillStyle = "rgba(255, 244, 201, 0.68)";
  context.beginPath();
  context.arc(muzzle.x, muzzle.y, 4, 0, Math.PI * 2);
  context.fill();
}

function drawSun(context: CanvasRenderingContext2D): void {
  const gradient = context.createRadialGradient(170, 120, 0, 170, 120, 92);
  gradient.addColorStop(0, "rgba(255, 245, 180, 0.98)");
  gradient.addColorStop(0.6, "rgba(255, 211, 111, 0.85)");
  gradient.addColorStop(1, "rgba(255, 211, 111, 0)");
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

function drawBackMountains(context: CanvasRenderingContext2D): void {
  context.fillStyle = "rgba(68, 133, 173, 0.78)";
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

function drawFrontMountains(context: CanvasRenderingContext2D): void {
  context.fillStyle = "rgba(83, 146, 117, 0.56)";
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
  if (type === "weapon") {
    return "#77c6ff";
  }

  if (type === "repair") {
    return "#98d96b";
  }

  return "#ffb35d";
}

function drawTurnGlow(context: CanvasRenderingContext2D, x: number, y: number): void {
  const gradient = context.createRadialGradient(x, y - 12, 0, x, y - 12, 42);
  gradient.addColorStop(0, "rgba(255, 236, 153, 0.42)");
  gradient.addColorStop(1, "rgba(255, 236, 153, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y - 12, 42, 0, Math.PI * 2);
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

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
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
