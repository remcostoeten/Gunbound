"use client";

import { LobbyPlayerCard } from "./lobby-player-card";
import { LobbyBuddyList } from "./lobby-buddy-list";

type Props = { onBuddyClick: (name: string) => void };

export function LobbySidePanel({ onBuddyClick }: Props) {
  return (
    <div className="gb-side">
      <LobbyPlayerCard />
      <LobbyBuddyList onBuddyClick={onBuddyClick} />
    </div>
  );
}
