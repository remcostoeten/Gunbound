import type { BonusType, MapType, MobileType, PlayerAccent, PlayerId, PlayerTitle, ShotTechnique, TerrainTheme, Vec2, WeaponType } from "@/features/game/types/shared";

export type TerrainState = {
  width: number;
  height: number;
  seed: number;
  theme: TerrainTheme;
  mapType: MapType;
  heights: number[];
  mask: Uint8Array;
  canvas: HTMLCanvasElement | null;
};

export type Mobile = {
  id: string;
  type: MobileType;
  hp: number;
  maxHp: number;
  position: Vec2;
  weapon: WeaponType;
  width: number;
  height: number;
  angle: number;
  facing: 1 | -1;
  moveRange: number;
  shotDelay: number;
  specialCharges: number;
  lastShotAngle: number | null;
  lastShotTechnique: ShotTechnique | null;
  doubleDamageTurns: number;
  verticalVelocity: number;
};

export type Player = {
  id: PlayerId;
  name: string;
  title: PlayerTitle;
  accent: PlayerAccent;
  mobile: Mobile;
  score: number;
};

export type BonusBox = {
  id: string;
  type: BonusType;
  position: Vec2;
  radius: number;
  verticalVelocity: number;
  landed: boolean;
};
