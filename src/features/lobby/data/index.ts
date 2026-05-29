import { staticLobbyDataSource } from "./static-source";
import type { LobbyDataSource } from "./types";

export type { LobbyDataSource, LobbyPlayerProfile } from "./types";

export function getLobbyDataSource(): LobbyDataSource {
  return staticLobbyDataSource;
}

export function useLobbyData(): LobbyDataSource {
  return getLobbyDataSource();
}
