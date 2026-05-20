"use client";

import { LobbyActionButton } from "./lobby-action-button";

type Props = {
  onWaiting: () => void;
  onQuickjoin: () => void;
  onCreate: () => void;
  onFriend: () => void;
  onSearch: () => void;
};

export function LobbyActionRow({ onWaiting, onQuickjoin, onCreate, onFriend, onSearch }: Props) {
  return (
    <div className="gb-actionrow">
      <LobbyActionButton label="Waiting"   glyph="🧙" tone="purple" onClick={onWaiting} />
      <LobbyActionButton label="Quickjoin" glyph="⚡" tone="purple" onClick={onQuickjoin} />
      <LobbyActionButton label="Create"    glyph="🔧" tone="purple" badge="P3" onClick={onCreate} />
      <div className="gb-mode">
        <div className="gb-mode-chip">
          <span>MODE</span>
          <small>Mode</small>
        </div>
        <div className="gb-mode-label">SOLO</div>
      </div>
      <div className="gb-spacer" />
      <LobbyActionButton label="Friend"      glyph="👁" tone="blue" onClick={onFriend} />
      <LobbyActionButton label="Room number" glyph="🔍" tone="blue" onClick={onSearch} />
    </div>
  );
}
