import type { ExplosionVisual } from "@/features/game/types/effects";
import type { Player } from "@/features/game/types/entities";
import type { ProjectileState } from "@/features/game/types/combat";
import type { GamePhase, GameScene, PlayerId, Vec2 } from "@/features/game/types/shared";

export type CameraMode = "overview" | "player" | "projectile" | "impact";

export type CameraViewport = {
  width: number;
  height: number;
};

export type CameraRig = {
  center: Vec2;
  target: Vec2;
  viewport: CameraViewport;
  mode: CameraMode;
};

export type CameraFrame = {
  center: Vec2;
  offset: Vec2;
  viewport: CameraViewport;
  scale: number;
  mode: CameraMode;
};

export type CameraStepInput = {
  scene: GameScene;
  phase: GamePhase;
  turn: PlayerId;
  players: [Player, Player];
  projectile: ProjectileState | null;
  explosionVisual: ExplosionVisual | null;
  dt: number;
};
