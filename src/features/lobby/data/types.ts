import type { LobbyBuddy, LobbyChatMsg } from "../types";

export type LobbyPlayerProfile = {
  name: string;
  nameColor?: string;
  gp: number | null;
  cash: number | null;
  gold: number | null;
  mascot: string | null;
};

export interface LobbyDataSource {
  getBuddies(): LobbyBuddy[];
  getInitialMessages(): LobbyChatMsg[];
  getPlayer(): LobbyPlayerProfile;
}
