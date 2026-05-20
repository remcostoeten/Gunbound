import type { MapType } from "@/features/game/types/shared";

export type LobbyRoomSettings = {
  mapType: MapType;
  targetScore: number;
  roundLimit: number;
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
};

export type LobbyActionTone = "purple" | "blue";

export type LobbyChatMsg = {
  id: number | string;
  author: string;
  text: string;
  tone: "self" | "system" | "other";
  friendRequest?: {
    id: bigint;
    requesterName: string;
  };
};
