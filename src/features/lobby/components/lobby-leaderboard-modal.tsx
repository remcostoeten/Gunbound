"use client";

import { useMemo } from "react";
import { useTable } from "spacetimedb/react";
import { tables } from "@/features/game/spacetime";
import type { Player } from "@/features/game/spacetime/module_bindings/types";

const TOP_N = 50;

type Props = {
  selfIdentityHex?: string;
  onClose: () => void;
};

function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}`;
}

function winRate(p: Player): number {
  const total = p.totalWins + p.totalLosses;
  return total > 0 ? Math.round((p.totalWins / total) * 100) : 0;
}

export function LobbyLeaderboardModal({ selfIdentityHex, onClose }: Props) {
  const [players] = useTable(tables.player);

  const ranked = useMemo<Player[]>(() => {
    return [...players]
      .filter(p => p.name.trim().length > 0)
      .sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        if (b.xp > a.xp) return 1;
        if (b.xp < a.xp) return -1;
        return 0;
      })
      .slice(0, TOP_N);
  }, [players]);

  return (
    <div className="gb-modal-back" onClick={onClose}>
      <div className="gb-modal gb-lb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gb-modal-head">
          <span className="gb-modal-name">Rankings</span>
          <button className="gb-modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="gb-lb-body">
          {ranked.length === 0 ? (
            <div className="gb-empty gb-empty-buddy">
              <span className="gb-empty-title">No ranked players yet</span>
              <span className="gb-empty-sub">Play some rounds to appear here.</span>
            </div>
          ) : (
            <table className="gb-lb-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Lv</th>
                  <th>W</th>
                  <th>L</th>
                  <th>WR%</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((p, i) => {
                  const isSelf = selfIdentityHex && p.identity.toHexString() === selfIdentityHex;
                  return (
                    <tr key={p.identity.toHexString()} className={isSelf ? "gb-lb-self" : ""}>
                      <td className="gb-lb-rank">{medal(i + 1)}</td>
                      <td className="gb-lb-name">
                        {p.country && <span className="gb-lb-flag">{p.country}</span>}
                        {p.name}
                        {isSelf && <span className="gb-lb-you"> (you)</span>}
                      </td>
                      <td>{p.level}</td>
                      <td>{p.totalWins}</td>
                      <td>{p.totalLosses}</td>
                      <td>{winRate(p)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="gb-modal-foot">
          <button className="gb-modal-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
