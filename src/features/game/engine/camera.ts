import { worldHeight, worldWidth } from "@/features/game/constants/world";
import type { ExplosionVisual } from "@/features/game/types/effects";
import type { CameraFrame, CameraMode, CameraRig, CameraStepInput, CameraViewport } from "@/features/game/types/presentation";
import type { Player, TerrainState } from "@/features/game/types/entities";
import type { Vec2 } from "@/features/game/types/shared";

const overviewViewport: CameraViewport = {
  width: worldWidth,
  height: worldHeight
};

const playerViewport: CameraViewport = {
  width: 960,
  height: 540
};

const projectileViewport: CameraViewport = {
  width: 1120,
  height: 630
};

const impactViewport: CameraViewport = {
  width: 900,
  height: 506.25
};

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
  const viewport = getViewportForMode(mode);
  const target = clampCenter(resolveTarget(mode, input), viewport);
  const smoothing = getSmoothing(mode, input);
  const center = {
    x: lerp(rig.center.x, target.x, Math.min(1, input.dt * smoothing)),
    y: lerp(rig.center.y, target.y, Math.min(1, input.dt * smoothing))
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

function getViewportForMode(mode: CameraMode): CameraViewport {
  if (mode === "player") {
    return playerViewport;
  }

  if (mode === "projectile") {
    return projectileViewport;
  }

  if (mode === "impact") {
    return impactViewport;
  }

  return overviewViewport;
}

function resolveTarget(mode: CameraMode, input: CameraStepInput): Vec2 {
  if (mode === "projectile" && input.projectile !== null) {
    return {
      x: input.projectile.position.x + input.projectile.velocity.x * 0.18,
      y: input.projectile.position.y + input.projectile.velocity.y * 0.12 - 50
    };
  }

  if (mode === "impact" && input.explosionVisual !== null) {
    return {
      x: input.explosionVisual.point.x,
      y: input.explosionVisual.point.y - 42
    };
  }

  if (mode === "player") {
    return getPlayerFocus(input.players[input.turn - 1]);
  }

  return getOverviewFocus(input.players);
}

function getPlayerFocus(player: Player): Vec2 {
  return {
    x: player.mobile.position.x + player.mobile.facing * 110,
    y: player.mobile.position.y - 110
  };
}

function getOverviewFocus(players: [Player, Player]): Vec2 {
  const left = Math.min(players[0].mobile.position.x, players[1].mobile.position.x);
  const right = Math.max(players[0].mobile.position.x, players[1].mobile.position.x);
  const averageY = (players[0].mobile.position.y + players[1].mobile.position.y) * 0.5;

  return {
    x: (left + right) * 0.5,
    y: averageY - 60
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

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
