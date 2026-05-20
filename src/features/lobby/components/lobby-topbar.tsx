"use client";

import { LOBBY_TOP_ICONS } from "../config/top-icons";

type Props = {
  onExit: () => void;
  onIconClick: (label: string) => void;
};

export function LobbyTopbar({ onExit, onIconClick }: Props) {
  return (
    <div className="gb-topbar">
      <div className="gb-tabs-col">
        <div className="gb-tab-main">
          <span className="gb-tab-main-text">GAME LIST</span>
        </div>
        <div className="gb-tab-sub">
          <span>Normal Zone</span>
          <span className="gb-tab-sub-count">2</span>
        </div>
      </div>

      <div className="gb-iconrow">
        {LOBBY_TOP_ICONS.map((b) => (
          <button key={b.label} className="gb-iconbtn" onClick={() => onIconClick(b.label)}>
            <span className="gb-iconbtn-tile" style={{ background: b.bg }}>
              <span className="gb-iconbtn-glyph">{b.glyph}</span>
            </span>
            <span className="gb-iconbtn-label">{b.label}</span>
          </button>
        ))}
      </div>

      <button onClick={onExit} className="gb-exit" title="Exit / Replay intro">
        <span className="gb-exit-tile">
          <span className="gb-exit-glyph">⏻</span>
        </span>
        <span className="gb-iconbtn-label">Exit</span>
      </button>
    </div>
  );
}
