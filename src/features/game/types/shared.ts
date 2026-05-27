export type PlayerId = 1 | 2;

export type Vec2 = { x: number; y: number };

export type WeatherKind = "wind" | "force" | "tornado" | "moon" | "eclipse";

export type WeatherState =
  | { kind: "wind" }
  | { kind: "force"; beamX: number; powerScale: number }
  | { kind: "tornado"; vortex: Vec2; radius: number; swirl: -1 | 1 }
  | { kind: "moon"; heal: number }
  | { kind: "eclipse" };

export type GamePhase = "move" | "aim" | "fire" | "resolve" | "end";

export type GameScene = "start" | "playing" | "end";

export type WeaponType = "primary" | "secondary" | "ss";

export type BattleItemType = "power" | "bunge";

export type MobileType =
  | "armor"
  | "knight"
  | "dragon"
  | "snow"
  | "trico"
  | "aduko"
  | "mage"
  | "nak"
  | "turtle"
  | "frog"
  | "sate";

export type BonusType = "weapon" | "repair" | "double";

export type TerrainTheme = "meadow" | "sunset" | "midnight";

export type MapType = "rolling" | "canyon" | "crater" | "ridge";

export type TurnDurationMode = "timed" | "infinite";

export type PlayerAccent = "sky" | "coral" | "mint" | "gold";

export type PlayerTitle = "Captain" | "Raider" | "Engineer" | "Oracle";
