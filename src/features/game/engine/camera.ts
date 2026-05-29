import { worldHeight, worldWidth } from "@/features/game/constants/world";
import type { ExplosionVisual } from "@/features/game/types/effects";
import type { CameraFrame, CameraMode, CameraRig, CameraStepInput, CameraViewport } from "@/features/game/types/presentation";
import type { Player, TerrainState } from "@/features/game/types/entities";
import type { PlayerId, Vec2 } from "@/features/game/types/shared";

const overviewViewport: CameraViewport = {
  width: worldWidth,
  height: worldHeight
};

const playerViewportMinWidth = 960;
const playerViewportPadding = 380;
const playerViewportAspect = 9 / 16;
// Keeps mobiles clear of the very edge of the frame when the camera leans
// toward the active player.
const bothMobilesMargin = 96;

const projectileViewport: CameraViewport = {
  width: 1120,
  height: 630
};

const impactViewport: CameraViewport = {
  width: 900,
  height: 506.25
};

const bottomChromeFocusLift = 74;

export function createCameraRig(): CameraRig {
  return {
    center: {
      x: worldWidth * 0.5,
      y: worldHeight * 0.5
    },
    target: {
      x: worldWidth * 0.5,
      y: worldHeight * 0.5
    },
    viewport: overviewViewport,
    mode: "overview"
  };
}

export function stepCameraRig(rig: CameraRig, input: CameraStepInput): CameraRig {
  const mode = resolveCameraMode(input);
  const viewport = getViewportForMode(mode, input);
  const target = clampCenter(resolveTarget(mode, input, viewport), viewport);
  const smoothing = getSmoothing(mode, input);
  const lerpFactor = getAdaptiveLerpFactor(rig.center, target, input.dt, smoothing);
  const center = {
    x: lerp(rig.center.x, target.x, lerpFactor),
    y: lerp(rig.center.y, target.y, lerpFactor)
  };

  return {
    center: clampCenter(center, viewport),
    target,
    viewport,
    mode
  };
}

export function getCameraFrame(rig: CameraRig, time: number, explosionVisual: ExplosionVisual | null, fireShake: number): CameraFrame {
  const shakeOffset = getShakeOffset(time, explosionVisual, fireShake);
  const shakenCenter = clampCenter(
    {
      x: rig.center.x + shakeOffset.x,
      y: rig.center.y + shakeOffset.y
    },
    rig.viewport
  );

  return {
    center: shakenCenter,
    offset: {
      x: shakenCenter.x - rig.viewport.width * 0.5,
      y: shakenCenter.y - rig.viewport.height * 0.5
    },
    viewport: rig.viewport,
    scale: worldWidth / rig.viewport.width,
    mode: rig.mode
  };
}

export function getTerrainCameraFocus(terrain: TerrainState): Vec2 {
  return {
    x: terrain.width * 0.5,
    y: terrain.height * 0.48
  };
}

function resolveCameraMode(input: CameraStepInput): CameraMode {
  if (input.scene !== "playing") {
    return "overview";
  }

  if (input.projectile !== null) {
    return "projectile";
  }

  if (input.explosionVisual !== null) {
    return "impact";
  }

  if (input.phase === "end") {
    return "overview";
  }

  return "player";
}

function getViewportForMode(mode: CameraMode, input: CameraStepInput): CameraViewport {
  if (mode === "player") {
    return getAdaptivePlayerViewport(input.players);
  }

  if (mode === "projectile") {
    return projectileViewport;
  }

  if (mode === "impact") {
    return impactViewport;
  }

  return overviewViewport;
}

function resolveTarget(mode: CameraMode, input: CameraStepInput, viewport: CameraViewport): Vec2 {
  if (mode === "projectile" && input.projectile !== null) {
    return applyBottomChromeBias(predictProjectilePosition(input.projectile), bottomChromeFocusLift * 0.55);
  }

  if (mode === "impact" && input.explosionVisual !== null) {
    return applyBottomChromeBias({
      x: input.explosionVisual.point.x,
      y: input.explosionVisual.point.y - 18
    }, bottomChromeFocusLift * 0.75);
  }

  if (mode === "player") {
    return applyBottomChromeBias(getAdaptivePlayerFocus(input.players, input.turn, viewport), bottomChromeFocusLift);
  }

  return applyBottomChromeBias(getOverviewFocus(input.players), bottomChromeFocusLift * 0.35);
}

function getAdaptivePlayerViewport(players: [Player, Player]): CameraViewport {
  const horizontalSpan = Math.abs(players[0].mobile.position.x - players[1].mobile.position.x);
  const desiredWidth = clamp(
    horizontalSpan + playerViewportPadding,
    playerViewportMinWidth,
    worldWidth
  );
  return {
    width: desiredWidth,
    height: desiredWidth * playerViewportAspect
  };
}

function getAdaptivePlayerFocus(
  players: [Player, Player],
  turn: PlayerId,
  viewport: CameraViewport
): Vec2 {
  const activeFocus = getPlayerFocus(players[turn - 1]);
  const midpoint = getOverviewFocus(players);
  const left = Math.min(players[0].mobile.position.x, players[1].mobile.position.x);
  const right = Math.max(players[0].mobile.position.x, players[1].mobile.position.x);
  const halfWidth = viewport.width * 0.5;

  // Lean toward the active player for readability, but clamp the center so both
  // mobiles stay inside the frame. If the pair is wider than the viewport can
  // hold with margin, fall back to centering on their midpoint.
  const minCenterX = right - halfWidth + bothMobilesMargin;
  const maxCenterX = left + halfWidth - bothMobilesMargin;
  const focusX = minCenterX <= maxCenterX ? clamp(activeFocus.x, minCenterX, maxCenterX) : midpoint.x;

  return {
    x: focusX,
    y: lerp(activeFocus.y, midpoint.y, 0.5)
  };
}

function getPlayerFocus(player: Player): Vec2 {
  return {
    x: player.mobile.position.x + player.mobile.facing * 110,
    y: player.mobile.position.y + 40
  };
}

function getOverviewFocus(players: [Player, Player]): Vec2 {
  const left = Math.min(players[0].mobile.position.x, players[1].mobile.position.x);
  const right = Math.max(players[0].mobile.position.x, players[1].mobile.position.x);
  const averageY = (players[0].mobile.position.y + players[1].mobile.position.y) * 0.5;

  return {
    x: (left + right) * 0.5,
    y: averageY + 50
  };
}

function applyBottomChromeBias(target: Vec2, amount: number): Vec2 {
  return {
    x: target.x,
    y: target.y + amount
  };
}

function clampCenter(center: Vec2, viewport: CameraViewport): Vec2 {
  const halfWidth = viewport.width * 0.5;
  const halfHeight = viewport.height * 0.5;

  return {
    x: clamp(center.x, halfWidth, worldWidth - halfWidth),
    y: clamp(center.y, halfHeight, worldHeight - halfHeight)
  };
}

function getSmoothing(mode: CameraMode, input: CameraStepInput): number {
  if (mode === "projectile") {
    return 8.5;
  }

  if (mode === "impact") {
    return 11;
  }

  if (mode === "player" && input.phase === "move") {
    return 6.5;
  }

  if (mode === "player") {
    return 5.5;
  }

  return 3.5;
}

function getShakeOffset(time: number, explosionVisual: ExplosionVisual | null, fireShake: number): Vec2 {
  const amplitude = getShakeAmplitude(explosionVisual, fireShake);

  if (amplitude <= 0) {
    return {
      x: 0,
      y: 0
    };
  }

  return {
    x: Math.sin(time * 74) * amplitude * 0.45 + Math.sin(time * 129 + 0.7) * amplitude * 0.2,
    y: Math.cos(time * 59 + 0.4) * amplitude * 0.32 + Math.sin(time * 101 + 1.1) * amplitude * 0.14
  };
}

function getShakeAmplitude(explosionVisual: ExplosionVisual | null, fireShake: number): number {
  let shakeIntensity = 0;

  if (explosionVisual !== null) {
    shakeIntensity = Math.max(shakeIntensity, (explosionVisual.timer / explosionVisual.duration) * 12);
  }

  if (fireShake > 0) {
    shakeIntensity = Math.max(shakeIntensity, fireShake * 3);
  }

  return shakeIntensity;
}

function predictProjectilePosition(projectile: { position: Vec2; velocity: Vec2; gravityScale: number }): Vec2 {
  const lookahead = 0.36;
  const gravity = 530 * projectile.gravityScale;
  return {
    x: projectile.position.x + projectile.velocity.x * lookahead,
    y: projectile.position.y + projectile.velocity.y * lookahead + 0.5 * gravity * lookahead * lookahead - 50
  };
}

function getAdaptiveLerpFactor(center: Vec2, target: Vec2, dt: number, smoothing: number): number {
  const base = Math.min(1, dt * smoothing);
  const distance = Math.hypot(target.x - center.x, target.y - center.y);
  if (distance > 380) {
    return 1;
  }

  if (distance > 220) {
    return Math.max(base, 0.32);
  }

  return base;
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
