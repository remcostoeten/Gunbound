import type { ProjectileState } from "@/features/game/types/combat";
import type { Player, TerrainState } from "@/features/game/types/entities";
import type { GamePhase, GameScene, MobileType, PlayerId, Vec2, WeaponType } from "@/features/game/types/shared";

export type ExplosionVisual = {
  point: Vec2;
  radius: number;
  mobileType: MobileType;
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

export type DebrisParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

export type WindLeaf = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  alpha: number;
};

export type ChargeSpark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

export type DustPuff = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

export type HitFlash = {
  alpha: number;
  timer: number;
};

export type ShellCasing = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
};

export type SmokePuff = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
};

export type BounceSpark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

export type GrassTuft = {
  x: number;
  y: number;
  height: number;
  sway: number;
};

export type ExplosionSpriteSheet =
  | "aduka-thor"
  | "armor-primary"
  | "armor-secondary"
  | "gum"
  | "jd-secondary"
  | "jd-lightning"
  | "nak";

export type ExplosionSpriteEffect = {
  point: Vec2;
  radius: number;
  timer: number;
  duration: number;
  sheet: ExplosionSpriteSheet;
  scale: number;
};

export type VisualEffectsState = {
  trail: Vec2[];
  previousProjectile: ProjectileState | null;
  muzzleFlash: ExplosionVisual | null;
  explosionSprites: ExplosionSpriteEffect[];
  debris: DebrisParticle[];
  leaves: WindLeaf[];
  sparks: ChargeSpark[];
  dust: DustPuff[];
  hitFlash: HitFlash | null;
  grass: GrassTuft[];
  previousExplosion: ExplosionVisual | null;
  previousPhase: GamePhase | "";
  leafSpawnTimer: number;
  windParticlesEnabled: boolean;
  shellCasings: ShellCasing[];
  smokePuffs: SmokePuff[];
  bounceSparks: BounceSpark[];
  fireShake: number;
  previousBounces: number;
  lastWeapon: WeaponType;
  lastMobileType: MobileType;
};

export type VisualEffectsInput = {
  projectile: ProjectileState | null;
  players: [Player, Player];
  turn: PlayerId;
  explosionVisual: ExplosionVisual | null;
  wind: Vec2;
  scene: GameScene;
  charging: boolean;
  phase: GamePhase;
  damagePopups: DamagePopup[];
  terrain: TerrainState | null;
  dt: number;
  visualTime: number;
};
