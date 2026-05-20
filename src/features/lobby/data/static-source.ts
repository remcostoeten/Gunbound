import { LOBBY_BUDDIES } from "../config/buddies";
import type { LobbyDataSource, LobbyPlayerProfile } from "./types";
import type { LobbyChatMsg } from "../types";

const PLAYER: LobbyPlayerProfile = {
  name: "DanBoard",
  nameColor: "#ff5ce0",
  gp: 1788,
  cash: 16100,
  gold: 2655432,
  mascot: "🧙‍♂️",
};

let seq = 0;
const MESSAGES: LobbyChatMsg[] = [
  { id: ++seq, author: "SYSTEM", text: "Welcome to Channel 3 — Normal Zone.", tone: "system" },
];

export const staticLobbyDataSource: LobbyDataSource = {
  getBuddies: () => LOBBY_BUDDIES,
  getInitialMessages: () => MESSAGES,
  getPlayer: () => PLAYER,
};
