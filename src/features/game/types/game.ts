export const worldWidth = 1280;
export const worldHeight = 720;

export type Vec2 = { x: number; y: number };

export type GamePhase = "move" | "aim" | "fire" | "resolve" | "end";

export type GameScene = "start" | "playing" | "end";

export type WeaponType = "primary" | "secondary";

export type MobileType = "armor" | "knight";

export type BonusType = "weapon" | "repair" | "double";

export type TerrainState = {
  width: number;
  height: number;
  seed: number;
  heights: number[];
  mask: Uint8Array;
  canvas: HTMLCanvasElement | null;
};

export type ProjectileState = {
  active: boolean;
  position: Vec2;
  previousPosition: Vec2;
  velocity: Vec2;
  radius: number;
  owner: 1 | 2;
  weapon: WeaponType;
  damage: number;
  blastRadius: number;
  bouncesLeft: number;
  power: number;
  life: number;
  windScale: number;
  gravityScale: number;
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
  doubleDamageTurns: number;
  verticalVelocity: number;
};

export type Player = {
  id: 1 | 2;
  name: string;
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
  playerId: 1 | 2;
  text: string;
  timer: number;
  duration: number;
};

export type MatchEventKind =
  | "round-start"
  | "turn-start"
  | "move"
  | "shot"
  | "weapon-switch"
  | "hit"
  | "bonus"
  | "sudden-death"
  | "round-end";

export type MatchEvent = {
  id: string;
  round: number;
  turn: 1 | 2;
  kind: MatchEventKind;
  text: string;
};

export type MatchConfig = {
  playerOneName: string;
  playerTwoName: string;
  playerOneMobile: MobileType;
  playerTwoMobile: MobileType;
  seedText: string;
};

export type InputState = {
  aimUp: boolean;
  aimDown: boolean;
};

export type GameState = {
  scene: GameScene;
  phase: GamePhase;
  turn: 1 | 2;
  wind: Vec2;
  players: [Player, Player];
  tick: number;
  seed: number;
  terrain: TerrainState | null;
  projectile: ProjectileState | null;
  winner: 1 | 2 | null;
  round: number;
  targetScore: number;
  suddenDeathTurn: number;
  suddenDeathActive: boolean;
  power: number;
  charging: boolean;
  turnCount: number;
  phaseTimer: number;
  phaseDuration: number;
  bonusBoxes: BonusBox[];
  explosionVisual: ExplosionVisual | null;
  damagePopups: DamagePopup[];
  turnAnnouncement: TurnAnnouncement | null;
  history: MatchEvent[];
  message: string;
};

export type ExplosionState = {
  point: Vec2;
  damage: number;
  radius: number;
  owner: 1 | 2;
};
