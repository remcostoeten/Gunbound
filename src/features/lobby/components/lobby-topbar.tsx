"use client";

import { LOBBY_TOP_ICONS } from "../config/top-icons";

type Props = {
  onExit: () => void;
  onLogout?: () => void;
  onIconClick: (label: string) => void;
};

export function LobbyTopbar({ onExit, onLogout, onIconClick }: Props) {
  return (
    <div className="gb-topbar">
      <div className="gb-tabs-col">
        <div className="gb-tab-main">
          <span className="gb-tab-main-text">GAME LIST</span>
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

      {onLogout && (
        <button onClick={onLogout} className="gb-exit" title="Log out and clear session">
          <span className="gb-exit-tile">
            <span className="gb-exit-glyph">⇥</span>
          </span>
          <span className="gb-iconbtn-label">Logout</span>
        </button>
      )}

      <button onClick={onExit} className="gb-exit" title="Exit / Replay intro">
        <span className="gb-exit-tile">
          <span className="gb-exit-glyph">⏻</span>
        </span>
        <span className="gb-iconbtn-label">Exit</span>
      </button>
    </div>
  );
}
