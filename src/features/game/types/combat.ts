import type { Player } from "@/features/game/types/entities";
import type { BattleItemType, MobileType, PlayerId, ShotTechnique, Vec2, WeaponType } from "@/features/game/types/shared";


// How a shot behaves in flight, beyond the shared ballistic arc. This is what
// gives each mobile a distinct identity instead of a recolored cannonball:
// - standard:  single projectile, explodes on first contact.
// - airSplit:  splits into `splitCount` projectiles at the top of its arc, each
//              fanned out by `splitSpread` so they rain down in 2-3 directions.
// - drill:     tunnels through terrain for a stretch, then erupts (Nak).
// - roll:      bounces/rolls along the ground before detonating (J.Frog jelly).
// - skyStrike: on impact, calls down a vertical barrage at the landing point
//              (A.Sate satellite lasers).
// - debuff:    on hit, leaves the target vulnerable (Snow/Ice defense-down).
export type ProjectileBehaviorKind =
  | "standard"
  | "airSplit"
  | "drill"
  | "roll"
  | "skyStrike"
  | "debuff";

export type ProjectileBehavior = {
  kind: ProjectileBehaviorKind;
  // airSplit
  splitCount?: number;
  splitSpread?: number;
  splitDamageMul?: number;
  // drill
  drillTicks?: number;
  // roll
  fuseSeconds?: number;
  // skyStrike
  skyStrikeCount?: number;
  skyStrikeSpread?: number;
  // debuff
  vulnerableTurns?: number;
};

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
  forceBoosted: boolean;
  tornadoTriggered: boolean;
  technique: ShotTechnique | null;
  launchDirection: -1 | 1;
  rearArc: boolean;
  behavior: ProjectileBehavior;
  // Counts down once the shot becomes a rolling fused jelly; null while it is a
  // normal in-flight projectile.
  fuse: number | null;
  // airSplit fires exactly once per shot; this guards against re-splitting the
  // children every tick.
  hasSplit: boolean;
};

export type ExplosionState = {
  point: Vec2;
  damage: number;
  radius: number;
  owner: PlayerId;
  mobileType: MobileType;
  weapon: WeaponType;
  item: BattleItemType | null;
  // Number of turns the struck target should remain defense-down (Snow/Ice).
  vulnerableTurns?: number;
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
