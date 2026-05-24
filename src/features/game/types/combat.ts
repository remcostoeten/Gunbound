import type { Player } from "@/features/game/types/entities";
import type { BattleItemType, MobileType, PlayerId, Vec2, WeaponType } from "@/features/game/types/shared";


export type WeaponProfileDefinition = {
  name: string;
  baseSpeed: number;
  speedScale: number;
  baseDamage: number;
  damageScale: number;
  blastRadius: number;
  bouncesLeft: number;
  windScale: number;
  gravityScale: number;
  radius: number;
};

export type WeaponProfile = {
  name: string;
  speed: number;
  damage: number;
  blastRadius: number;
  bouncesLeft: number;
  windScale: number;
  gravityScale: number;
  radius: number;
};

export type ProjectileState = {
  active: boolean;
  position: Vec2;
  previousPosition: Vec2;
  velocity: Vec2;
  radius: number;
  owner: PlayerId;
  mobileType: MobileType;
  weapon: WeaponType;
  damage: number;
  blastRadius: number;
  bouncesLeft: number;
  tunnelingTicks: number;
  power: number;
  life: number;
  windScale: number;
  gravityScale: number;
  item: BattleItemType | null;
};

export type ExplosionState = {
  point: Vec2;
  damage: number;
  radius: number;
  owner: PlayerId;
  mobileType: MobileType;
  weapon: WeaponType;
  item: BattleItemType | null;
};

export type CombatHit = {
  playerId: PlayerId;
  playerName: string;
  damage: number;
  popupPosition: Vec2;
};

export type ExplosionDamageResult = {
  players: [Player, Player];
  hits: CombatHit[];
};

export type WeaponProfileMap = Record<MobileType, Record<Exclude<WeaponType, "ss">, WeaponProfileDefinition>>;
