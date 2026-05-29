"use client";

import { useEffect, useState } from "react";
import { setBrowserFullscreen } from "@/lib/display-settings";
import { LOBBY_TOP_ICONS } from "../config/top-icons";
import { TOOLBAR_HINTS, type ToolbarHint } from "../config/toolbar-hints";
import { LobbyActionButton } from "./lobby-action-button";
import { LobbyTooltip, LobbyTooltipProvider } from "./lobby-tooltip";

type Props = {
  onBack: () => void;
  onWaiting: () => void;
  inQueue?: boolean;
  onQuickjoin: () => void;
  onSoloPractice: () => void;
  onCreate: () => void;
  onFriend: () => void;
  inboxCount?: number;
  onSearch: () => void;
  onIconClick: (label: string) => void;
};

const TOP_ICON_HINTS: Record<string, ToolbarHint> = {
  "My Info": TOOLBAR_HINTS.myInfo,
  Rankings: TOOLBAR_HINTS.rankings,
};

function isDocumentFullscreen(): boolean {
  return typeof document !== "undefined" && document.fullscreenElement !== null;
}

export function LobbyActionRow({
  onBack,
  onWaiting,
  inQueue = false,
  onQuickjoin,
  onSoloPractice,
  onCreate,
  onFriend,
  inboxCount = 0,
  onSearch,
  onIconClick,
}: Props) {
  const [fullscreen, setFullscreenState] = useState(function initialFullscreen(): boolean {
    return isDocumentFullscreen();
  });

  useEffect(function bindFullscreenChangeListener(): () => void {
    function onFullscreenChange(): void {
      setFullscreenState(isDocumentFullscreen());
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  return (
    <LobbyTooltipProvider>
      <div className="gb-toolbar">
        <div className="gb-toolbar-group">
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
            label="Solo"
            glyph="🎯"
            tone="blue"
            onClick={onSoloPractice}
            hint={TOOLBAR_HINTS.soloPractice}
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
        </div>

        <div className="gb-toolbar-group gb-toolbar-group--center">
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

        <div className="gb-toolbar-group gb-toolbar-group--utility">
          <LobbyTooltip hint={TOOLBAR_HINTS.back}>
            <button type="button" onClick={onBack} className="gb-toolbar-item">
              <span className="gb-toolbar-tile gb-toolbar-tile-back">
                <span className="gb-toolbar-glyph">⇥</span>
              </span>
              <span className="gb-toolbar-label">Back</span>
            </button>
          </LobbyTooltip>
          <LobbyTooltip hint={fullscreen ? TOOLBAR_HINTS.exitFullscreen : TOOLBAR_HINTS.fullscreen}>
            <button
              type="button"
              className={`gb-toolbar-item${fullscreen ? " gb-toolbar-item--active" : ""}`}
              aria-pressed={fullscreen}
              onClick={function handleFullscreenToggle(): void {
                setBrowserFullscreen(!fullscreen);
              }}
            >
              <span className="gb-toolbar-tile gb-toolbar-tile-fullscreen">
                <span className="gb-toolbar-glyph">{fullscreen ? "⤢" : "⛶"}</span>
              </span>
              <span className="gb-toolbar-label">{fullscreen ? "Exit" : "Fullscreen"}</span>
            </button>
          </LobbyTooltip>
        </div>
      </div>
    </LobbyTooltipProvider>
  );
}
