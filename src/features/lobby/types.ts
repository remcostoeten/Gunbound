import type { MapType, TurnDurationMode } from "@/features/game/types/shared";

export type LobbyRoomSettings = {
  mapType: MapType;
  targetScore: number;
  roundLimit: number;
  turnDurationMode: TurnDurationMode;
};

export type LobbyRoom = {
  id: bigint;
  code: string;
  status: "Playing" | "Waiting";
  hostName: string;
  memberCount: number;
  capacity: number;
  settings?: LobbyRoomSettings;
  highlight?: boolean;
  mine?: boolean;
  yourTurn?: boolean;
};

export type LobbyBuddy = {
  flag: string;
  flagColors: [string, string];
  name: string;
  tag?: string;
  nameColor: string;
};

export type LobbyTopIcon = {
  label: string;
  glyph: string;
  bg: string;
  implemented: boolean;
};

export type LobbyActionTone = "purple" | "blue";

export type LobbyChatMsg = {
  id: number | string;
  author: string;
  text: string;
  tone: "self" | "system" | "other";
  createdAtMicros?: bigint;
  friendRequest?: {
    id: bigint;
    requesterName: string;
  };
};
