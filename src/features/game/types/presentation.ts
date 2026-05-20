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

export type TurnGuideTone = "move" | "aim" | "fire" | "resolve" | "end";

export type TurnGuideCommandState = "active" | "ready" | "locked";

export type TurnGuidePhaseStepState = "complete" | "active" | "pending";

export type TurnGuideCommand = {
  keyLabel: string;
  actionLabel: string;
  detailLabel: string;
  state: TurnGuideCommandState;
};

export type TurnGuideWeaponSlot = {
  slotLabel: string;
  weaponLabel: string;
  detailLabel: string;
  selected: boolean;
  available: boolean;
};

export type TurnGuidePhaseStep = {
  label: string;
  state: TurnGuidePhaseStepState;
};

export type TurnGuide = {
  headline: string;
  detail: string;
  phaseLabel: string;
  tone: TurnGuideTone;
  timerLabel: string;
  powerPercent: number;
  commands: TurnGuideCommand[];
  weaponSlots: TurnGuideWeaponSlot[];
  phaseSteps: TurnGuidePhaseStep[];
};
