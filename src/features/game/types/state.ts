import type { ProjectileState } from "@/features/game/types/combat";
import type { BonusBox, Player, TerrainState } from "@/features/game/types/entities";
import type { DamagePopup, ExplosionVisual, TurnAnnouncement } from "@/features/game/types/effects";
import type { MatchEvent } from "@/features/game/types/events";
import type { GamePhase, GameScene, MapType, MobileType, PlayerAccent, PlayerId, PlayerTitle, TurnDurationMode, Vec2 } from "@/features/game/types/shared";

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
};

export type InputState = {
  aimUp: boolean;
  aimDown: boolean;
};

export type GameState = {
  scene: GameScene;
  phase: GamePhase;
  turn: PlayerId;
  wind: Vec2;
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
