import type { LobbyDataSource, LobbyPlayerProfile } from "./types";

const EMPTY_PLAYER: LobbyPlayerProfile = {
  name: "Guest",
  nameColor: "#06335f",
  gp: null,
  cash: null,
  gold: null,
  mascot: null,
};

export const emptyLobbyDataSource: LobbyDataSource = {
  getBuddies: () => [],
  getInitialMessages: () => [],
  getPlayer: () => EMPTY_PLAYER,
};
