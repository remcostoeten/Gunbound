export type LobbyRoom = {
  id: bigint;
  code: string;
  status: "Playing" | "Waiting";
  hostName: string;
  memberCount: number;
  capacity: number;
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
  id: number;
  author: string;
  text: string;
  tone: "self" | "system" | "other";
};
