"use client";

import { Facehash } from "facehash";
import { useLobbyData } from "../data";
import { useCurrentPlayer } from "@/features/game/spacetime";

const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString());

export function LobbyPlayerCard() {
  const base = useLobbyData().getPlayer();
  const { player } = useCurrentPlayer();

  const name = player?.name?.trim() ? player.name : base.name;
  const gp = player ? Number(player.xp) : base.gp;
  const nameColor = player ? undefined : base.nameColor;
  const isEmpty = base.mascot == null && !player;

  const level = player ? player.level : null;
  const wins = player ? player.totalWins : null;
  const streak = player ? player.loginStreak : null;
  const longest = player ? player.longestStreak : null;

  return (
    <div className="gb-player">
      <div className="gb-player-head">
        <span className="gb-pr">PR</span>
        {level != null && <span className="gb-lv">Lv {level}</span>}
        <span className="gb-player-name" style={nameColor ? { color: nameColor } : undefined}>
          {name}
        </span>
      </div>
      {isEmpty ? (
        <div className="gb-player-art gb-player-art-empty">
          <div className="gb-player-art-glow" />
          <div className="gb-empty-tile">
            <Facehash name={name} size={70} variant="gradient" />
            <span className="gb-empty-sub">No profile yet</span>
          </div>
        </div>
      ) : (
        <div className="gb-player-art">
          <div className="gb-player-art-glow" />
          <div className="gb-player-art-mascot">
            <Facehash name={name} size={70} variant="gradient" />
          </div>
        </div>
      )}
      <div className="gb-stats">
        <div className="gb-stat gb-stat-gp"><span>GP</span><b>{fmt(gp)}</b></div>

        <div className="gb-stat gb-stat-f10"><span>F10</span></div>
      </div>
      {player && (
        <div className="gb-live-stats">
          <div className="gb-live-stat" title="Total wins">
            <span className="gb-live-stat-icon">🏆</span>
            <b>{fmt(wins)}</b>
            <small>Wins</small>
          </div>
          <div
            className="gb-live-stat"
            title={longest != null ? `Longest: ${longest} days` : undefined}
          >
            <span className="gb-live-stat-icon">🔥</span>
            <b>{fmt(streak)}</b>
            <small>Streak</small>
          </div>
        </div>
      )}
    </div>
  );
}
