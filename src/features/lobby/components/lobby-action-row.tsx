"use client";

import { LobbyActionButton } from "./lobby-action-button";

type Props = {
  onWaiting: () => void;
  inQueue?: boolean;
  onQuickjoin: () => void;
  onCreate: () => void;
  onFriend: () => void;
  onSearch: () => void;
  canToggleEmptyData?: boolean;
  emptyDataEnabled?: boolean;
  onToggleEmptyData?: () => void;
};

export function LobbyActionRow({
  onWaiting,
  inQueue = false,
  onQuickjoin,
  onCreate,
  onFriend,
  onSearch,
  canToggleEmptyData = false,
  emptyDataEnabled = false,
  onToggleEmptyData,
}: Props) {
  return (
    <div className="gb-actionrow">
      <LobbyActionButton label={inQueue ? "Cancel" : "Waiting"} glyph={inQueue ? "⏳" : "🧙"} tone="purple" onClick={onWaiting} active={inQueue} />
      <LobbyActionButton label="Quickjoin" glyph="⚡" tone="purple" onClick={onQuickjoin} />
      <LobbyActionButton label="Create"    glyph="🔧" tone="purple" badge="P3" onClick={onCreate} />
      {canToggleEmptyData && (
        <LobbyActionButton
          label={emptyDataEnabled ? "Empty data" : "Fixture data"}
          glyph="🧪"
          tone="blue"
          onClick={onToggleEmptyData ?? (() => {})}
        />
      )}
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
