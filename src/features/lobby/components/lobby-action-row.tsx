"use client";

import { LOBBY_TOP_ICONS } from "../config/top-icons";
import { TOOLBAR_HINTS, type ToolbarHint } from "../config/toolbar-hints";
import { LobbyActionButton } from "./lobby-action-button";
import { LobbyTooltip, LobbyTooltipProvider } from "./lobby-tooltip";

type Props = {
  onBack: () => void;
  onWaiting: () => void;
  inQueue?: boolean;
  onQuickjoin: () => void;
  onCreate: () => void;
  onFriend: () => void;
  inboxCount?: number;
  onSearch: () => void;
  onIconClick: (label: string) => void;
  canToggleEmptyData?: boolean;
  emptyDataEnabled?: boolean;
  onToggleEmptyData?: () => void;
};

const TOP_ICON_HINTS: Record<string, ToolbarHint> = {
  "My Info": TOOLBAR_HINTS.myInfo,
  Rankings: TOOLBAR_HINTS.rankings,
};

export function LobbyActionRow({
  onBack,
  onWaiting,
  inQueue = false,
  onQuickjoin,
  onCreate,
  onFriend,
  inboxCount = 0,
  onSearch,
  onIconClick,
  canToggleEmptyData = false,
  emptyDataEnabled = false,
  onToggleEmptyData,
}: Props) {
  return (
    <LobbyTooltipProvider>
      <div className="gb-toolbar">
        <div className="gb-toolbar-group">
          <LobbyTooltip hint={TOOLBAR_HINTS.back}>
            <button type="button" onClick={onBack} className="gb-toolbar-item">
              <span className="gb-toolbar-tile gb-toolbar-tile-back">
                <span className="gb-toolbar-glyph">⇥</span>
              </span>
              <span className="gb-toolbar-label">Back</span>
            </button>
          </LobbyTooltip>
          <LobbyActionButton
            layout="toolbar"
            label={inQueue ? "Cancel" : "Waiting"}
            glyph={inQueue ? "⏳" : "🧙"}
            tone="purple"
            onClick={onWaiting}
            active={inQueue}
            hint={inQueue ? TOOLBAR_HINTS.cancelQueue : TOOLBAR_HINTS.waiting}
          />
          <LobbyActionButton
            layout="toolbar"
            label="Quickjoin"
            glyph="⚡"
            tone="purple"
            onClick={onQuickjoin}
            hint={TOOLBAR_HINTS.quickjoin}
          />
          <LobbyActionButton
            layout="toolbar"
            label="Create"
            glyph="🔧"
            tone="purple"
            badge="P3"
            onClick={onCreate}
            hint={TOOLBAR_HINTS.create}
          />
          {canToggleEmptyData && (
            <LobbyActionButton
              layout="toolbar"
              label={emptyDataEnabled ? "Empty data" : "Fixture data"}
              glyph="🧪"
              tone="blue"
              onClick={onToggleEmptyData ?? (() => {})}
              hint={emptyDataEnabled ? TOOLBAR_HINTS.emptyData : TOOLBAR_HINTS.fixtureData}
            />
          )}
        </div>

        <LobbyTooltip hint={TOOLBAR_HINTS.mode} side="bottom">
          <button type="button" className="gb-toolbar-mode">
            <div className="gb-mode-chip">
              <span>MODE</span>
              <small>Mode</small>
            </div>
            <div className="gb-mode-label">SOLO</div>
          </button>
        </LobbyTooltip>

        <div className="gb-toolbar-group gb-toolbar-group--end">
          {LOBBY_TOP_ICONS.map((icon) => {
            const hint = TOP_ICON_HINTS[icon.label];
            const button = (
              <button
                key={icon.label}
                type="button"
                className="gb-toolbar-item"
                onClick={() => onIconClick(icon.label)}
              >
                <span className="gb-toolbar-tile" style={{ background: icon.bg }}>
                  <span className="gb-toolbar-glyph">{icon.glyph}</span>
                </span>
                <span className="gb-toolbar-label">{icon.label}</span>
              </button>
            );
            return hint ? (
              <LobbyTooltip key={icon.label} hint={hint}>
                {button}
              </LobbyTooltip>
            ) : (
              button
            );
          })}
          <LobbyActionButton
            layout="toolbar"
            label="Inbox"
            glyph="📬"
            tone="blue"
            badge={inboxCount > 0 ? String(inboxCount) : undefined}
            active={inboxCount > 0}
            onClick={onFriend}
            hint={TOOLBAR_HINTS.friend}
          />
          <LobbyActionButton
            layout="toolbar"
            label="Room number"
            glyph="🔍"
            tone="blue"
            onClick={onSearch}
            hint={TOOLBAR_HINTS.roomSearch}
          />
        </div>
      </div>
    </LobbyTooltipProvider>
  );
}
