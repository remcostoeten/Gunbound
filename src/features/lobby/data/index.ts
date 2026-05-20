import { staticLobbyDataSource } from "./static-source";
import { emptyLobbyDataSource } from "./empty-source";
import type { LobbyDataSource } from "./types";
import { useEmptyDataMode } from "@/features/game/spacetime";

export type { LobbyDataSource, LobbyPlayerProfile } from "./types";

export function getLobbyDataSource(emptyDataEnabled: boolean): LobbyDataSource {
  return emptyDataEnabled ? emptyLobbyDataSource : staticLobbyDataSource;
}

export function useLobbyData(): LobbyDataSource {
  const { enabled } = useEmptyDataMode();
  return getLobbyDataSource(enabled);
}
