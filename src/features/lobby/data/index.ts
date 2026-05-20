import { IS_EMPTY_DATA } from "@/lib/empty-state";
import { staticLobbyDataSource } from "./static-source";
import { emptyLobbyDataSource } from "./empty-source";
import type { LobbyDataSource } from "./types";

export type { LobbyDataSource, LobbyPlayerProfile } from "./types";

export const lobbyDataSource: LobbyDataSource = IS_EMPTY_DATA
  ? emptyLobbyDataSource
  : staticLobbyDataSource;

export function useLobbyData(): LobbyDataSource {
  return lobbyDataSource;
}
