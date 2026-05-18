"use client";

import { useGameState } from "@/features/game/hooks/use-game-state";

export function TurnBanner(): React.JSX.Element | null {
  const turnAnnouncement = useGameState(selectTurnAnnouncement);

  if (turnAnnouncement === null) {
    return null;
  }

  return (
    <div className="turn-banner-shell">
      <div className={getTurnBannerClassName(turnAnnouncement.playerId)}>
        <span className="turn-banner-kicker">Turn Start</span>
        <span className="turn-banner-value">{turnAnnouncement.text}</span>
      </div>
    </div>
  );
}

function getTurnBannerClassName(playerId: 1 | 2): string {
  if (playerId === 1) {
    return "turn-banner-card player-one";
  }

  return "turn-banner-card player-two";
}

function selectTurnAnnouncement(state: ReturnType<typeof import("@/features/game/store/game-store").useGameStore.getState>) {
  return state.turnAnnouncement;
}
