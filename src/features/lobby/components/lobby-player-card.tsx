"use client";

import { useLobbyData } from "../data";

const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString());

export function LobbyPlayerCard() {
  const p = useLobbyData().getPlayer();
  const isEmpty = p.mascot == null;

  return (
    <div className="gb-player">
      <div className="gb-player-head">
        <span className="gb-pr">PR</span>
        <span className="gb-player-name" style={p.nameColor ? { color: p.nameColor } : undefined}>
          {p.name}
        </span>
      </div>
      {isEmpty ? (
        <div className="gb-player-art gb-player-art-empty">
          <div className="gb-player-art-glow" />
          <div className="gb-empty-tile">
            <span className="gb-empty-glyph">🎮</span>
            <span className="gb-empty-sub">No profile yet</span>
          </div>
        </div>
      ) : (
        <div className="gb-player-art">
          <div className="gb-player-art-glow" />
          <div className="gb-player-art-mascot">{p.mascot}</div>
        </div>
      )}
      <div className="gb-stats">
        <div className="gb-stat gb-stat-gp"><span>GP</span><b>{fmt(p.gp)}</b></div>
        <div className="gb-stat gb-stat-cash"><span></span><b>{fmt(p.cash)}<small>Cash</small></b></div>
        <div className="gb-stat gb-stat-gold"><span></span><b>{fmt(p.gold)}<small>Gold</small></b></div>
        <div className="gb-stat gb-stat-f10"><span>F10</span></div>
      </div>
    </div>
  );
}
