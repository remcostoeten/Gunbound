import type { ProjectileState } from "@/features/game/types/combat";
import type { TurnDelayQueue } from "@/features/game/engine/delay";
import type { BonusBox, Player, TerrainState } from "@/features/game/types/entities";
import type { DamagePopup, ExplosionVisual, TurnAnnouncement } from "@/features/game/types/effects";
import type { MatchEvent } from "@/features/game/types/events";
import type { BattleItemType, GamePhase, GameScene, MapType, MobileType, PlayerAccent, PlayerId, PlayerTitle, ShotMode, TurnDurationMode, Vec2, WeatherState, WeaponType } from "@/features/game/types/shared";
import type { BattleItemInventory } from "@/features/game/engine/battle-items";

export type MatchConfig = {
  playerOneName: string;
  playerTwoName: string;
  playerOneMobile: MobileType;
  playerTwoMobile: MobileType;
  playerOneTitle: PlayerTitle;
  playerTwoTitle: PlayerTitle;
  playerOneAccent: PlayerAccent;
  playerTwoAccent: PlayerAccent;
  mapType: MapType;
  targetScore: number;
  roundLimit: number;
  turnDurationMode: TurnDurationMode;
  seedText: string;
  soloBot?: boolean;
};

export type InputState = {
  aimUp: boolean;
  aimDown: boolean;
  moveLeft: boolean;
  moveRight: boolean;
};

export type PendingButtShot = {
  turn: PlayerId;
  remaining: number;
  sourceFacing: 1 | -1;
  sourceAngle: number;
  weapon: WeaponType;
};

export type GameState = {
  scene: GameScene;
  phase: GamePhase;
  turn: PlayerId;
  shotMode: ShotMode;
  wind: Vec2;
  weather: WeatherState;
  players: [Player, Player];
  tick: number;
  seed: number;
  terrain: TerrainState | null;
  projectile: ProjectileState | null;
  winner: PlayerId | null;
  round: number;
  targetScore: number;
  suddenDeathTurn: number;
  suddenDeathActive: boolean;
  power: number;
  charging: boolean;
  chargeAscending: boolean;
  turnCount: number;
  turnElapsed: number;
  turnDelays: TurnDelayQueue;
  turnMoveRemaining: number;
  battleItemInventories: [BattleItemInventory, BattleItemInventory];
  selectedBattleItems: [BattleItemType | null, BattleItemType | null];
  phaseTimer: number;
  phaseDuration: number;
  bonusBoxes: BonusBox[];
  explosionVisual: ExplosionVisual | null;
  explosionVisuals: ExplosionVisual[];
  damagePopups: DamagePopup[];
  turnAnnouncement: TurnAnnouncement | null;
  history: MatchEvent[];
  message: string;
};
