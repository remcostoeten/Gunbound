"use client";

import type { LobbyRoom } from "../types";

type Props = {
  room: LobbyRoom;
  onClick: () => void;
};

export function LobbyRoomCard({ room, onClick }: Props) {
  const playersLabel = `${room.memberCount}/${room.capacity}`;
  const full = room.memberCount >= room.capacity;
  const playing = room.status === "Playing";
  const mineActive = Boolean(room.mine && playing);
  const disabled = (playing || full) && !mineActive;
  const yourTurn = Boolean(mineActive && room.yourTurn);
  const statusLabel = yourTurn ? "Your Turn" : mineActive ? "Resume" : room.status;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`gb-room gb-room-btn ${room.highlight ? "gb-room-hl" : ""} ${yourTurn ? "gb-room-your-turn" : mineActive ? "gb-room-resume" : ""} ${disabled ? "gb-room-locked" : ""}`}
      aria-label={`Room ${room.code} — host ${room.hostName}, ${playersLabel} players, ${statusLabel}`}
    >
      <div className="gb-room-head">
        <span className="gb-room-no">{room.code}</span>
        <span className="gb-room-name">{room.hostName}</span>
        <span className="gb-room-players">
          <span className="gb-room-mode" aria-hidden="true">👥</span>
          {playersLabel}
        </span>
      </div>
      <div className="gb-room-body">
        <span className="gb-status">{statusLabel}</span>
        <div className="gb-room-thumb" aria-hidden="true" />
        <div className="gb-room-cube" aria-hidden="true">{playing ? "⚔" : "🛡"}</div>
      </div>
    </button>
  );
}
