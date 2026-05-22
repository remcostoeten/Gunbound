"use client";

import { LobbyPlayerCard } from "./lobby-player-card";
import { LobbyBuddyList } from "./lobby-buddy-list";

type Props = {
  onBuddyClick: (name: string) => void;
  onFriendRequestResponse: (requestId: bigint, accept: boolean) => void;
  onOpenInbox: () => void;
};

export function LobbySidePanel({ onBuddyClick, onFriendRequestResponse, onOpenInbox }: Props) {
  return (
    <div className="gb-side">
      <LobbyPlayerCard />
      <LobbyBuddyList
        onBuddyClick={onBuddyClick}
        onFriendRequestResponse={onFriendRequestResponse}
        onOpenInbox={onOpenInbox}
      />
    </div>
  );
}
