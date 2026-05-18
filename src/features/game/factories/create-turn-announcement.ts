import type { TurnAnnouncement } from "@/features/game/types/effects";
import type { PlayerId } from "@/features/game/types/shared";

export function createTurnAnnouncement(playerId: PlayerId, playerName: string): TurnAnnouncement {
  return {
    playerId,
    text: playerName + " turn",
    timer: 1.65,
    duration: 1.65
  };
}
