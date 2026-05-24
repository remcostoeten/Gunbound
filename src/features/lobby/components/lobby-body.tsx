"use client";

import { LobbyRoomCard } from "./lobby-room-card";
import { LobbySidePanel } from "./lobby-side-panel";
import type { LobbyRoom } from "../types";

type Props = {
  rooms: LobbyRoom[];
  emptyStateAnimated: boolean;
  onRoomClick: (r: LobbyRoom) => void;
  onBuddyClick: (name: string) => void;
  onFriendRequestResponse: (requestId: bigint, accept: boolean) => void;
  onOpenInbox: () => void;
};

export function LobbyBody({
  rooms,
  emptyStateAnimated,
  onRoomClick,
  onBuddyClick,
  onFriendRequestResponse,
  onOpenInbox,
}: Props) {
  return (
    <div className="gb-body">
      <section
        className="gb-roomwrap"
        aria-label="Room list"
        style={{ ["--gb-stagger" as string]: "120ms" }}
      >
        {rooms.length === 0 ? (
          <div
            className={`gb-empty gb-empty-rooms ${emptyStateAnimated ? "is-animated" : ""}`}
            role="status"
          >
            <span className="gb-empty-glyph" aria-hidden="true">🪐</span>
            <span className="gb-empty-title">No rooms in this channel</span>
            <span className="gb-empty-sub">Press <b>Create</b> to open the first room.</span>
          </div>
        ) : (
          <div className="gb-roomgrid" role="list" aria-label="Available rooms">
            {rooms.map((r, i) => (
              <div
                key={r.id.toString()}
                role="listitem"
                className="gb-stagger-item"
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <LobbyRoomCard room={r} onClick={() => onRoomClick(r)} />
              </div>
            ))}
          </div>
        )}
        <div className="gb-arrows" role="group" aria-label="Scroll rooms">
          <button type="button" className="gb-arrow" aria-label="Scroll up">▲</button>
          <button type="button" className="gb-arrow" aria-label="Scroll down">▼</button>
        </div>
      </section>
      <LobbySidePanel
        onBuddyClick={onBuddyClick}
        onFriendRequestResponse={onFriendRequestResponse}
        onOpenInbox={onOpenInbox}
      />
    </div>
  );
}
