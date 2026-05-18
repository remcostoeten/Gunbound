import type { PlayerId, Vec2 } from "@/features/game/types/shared";

export type ExplosionVisual = {
  point: Vec2;
  radius: number;
  timer: number;
  duration: number;
};

export type DamagePopup = {
  id: string;
  value: number;
  position: Vec2;
  timer: number;
  duration: number;
};

export type TurnAnnouncement = {
  playerId: PlayerId;
  text: string;
  timer: number;
  duration: number;
};
