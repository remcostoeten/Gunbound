"use client";

import { useEffect } from "react";
import { playUiSfx } from "@/lib/music-bus";
import type { Player } from "@/features/game/spacetime/module_bindings/types";

type Props = {
  player: Player;
  onClose: () => void;
  title?: string;
};

function xpToNextLevel(level: number): number {
  return (level + 1) * 100;
}

function xpProgress(xp: bigint, level: number): number {
  const base = BigInt(level * 100);
  const cap = BigInt(xpToNextLevel(level));
  const progress = xp - base;
  return Math.min(100, Math.max(0, Number((progress * BigInt(100)) / (cap - base))));
}

export function LobbyMyInfoModal({ player, onClose, title = "My Info" }: Props) {
  useEffect(function playOpenCue(): void {
    playUiSfx("open");
  }, []);

  const winRate =
    player.totalWins + player.totalLosses > 0
      ? Math.round((player.totalWins / (player.totalWins + player.totalLosses)) * 100)
      : 0;

  const pct = xpProgress(player.xp, player.level);
  const joined = new Date(Number(player.createdAt.microsSinceUnixEpoch / BigInt(1000)));
  const joinedStr = joined.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="gb-modal-back" onClick={onClose}>
      <div className="gb-modal gb-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gb-modal-head">
          <span className="gb-modal-name">{title}</span>
          <button className="gb-modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="gb-modal-body">
          <div className="gb-profile-header">
            <div className="gb-profile-avatar">
              <span>{player.name.slice(0, 2).toUpperCase() || "??"}</span>
            </div>
            <div className="gb-profile-identity">
              <span className="gb-profile-name">{player.name || "Unnamed"}</span>
              {player.country && (
                <span className="gb-profile-country">{player.country}</span>
              )}
              <span className="gb-profile-joined">Joined {joinedStr}</span>
            </div>
            <div className="gb-profile-level-badge">
              <span>Lv</span>
              <b>{player.level}</b>
            </div>
          </div>

          <div className="gb-profile-xp">
            <div className="gb-profile-xp-label">
              <span>XP</span>
              <span>{player.xp.toString()}</span>
            </div>
            <div className="gb-profile-xp-bar">
              <div className="gb-profile-xp-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="gb-profile-xp-label gb-profile-xp-sublabel">
              <span>{pct}% to Lv {player.level + 1}</span>
            </div>
          </div>

          <div className="gb-profile-stats">
            <div className="gb-profile-stat">
              <span className="gb-profile-stat-val">{player.totalWins}</span>
              <span className="gb-profile-stat-key">Wins</span>
            </div>
            <div className="gb-profile-stat">
              <span className="gb-profile-stat-val">{player.totalLosses}</span>
              <span className="gb-profile-stat-key">Losses</span>
            </div>
            <div className="gb-profile-stat">
              <span className="gb-profile-stat-val">{winRate}%</span>
              <span className="gb-profile-stat-key">Win Rate</span>
            </div>
            <div className="gb-profile-stat">
              <span className="gb-profile-stat-val">{player.totalRoundsPlayed}</span>
              <span className="gb-profile-stat-key">Rounds</span>
            </div>
          </div>

          <div className="gb-profile-streak">
            <div className="gb-profile-streak-item">
              <span className="gb-profile-streak-icon">🔥</span>
              <div>
                <b>{player.loginStreak}</b>
                <span>day streak</span>
              </div>
            </div>
            <div className="gb-profile-streak-item">
              <span className="gb-profile-streak-icon">🏆</span>
              <div>
                <b>{player.longestStreak}</b>
                <span>longest streak</span>
              </div>
            </div>
          </div>
        </div>

        <div className="gb-modal-foot">
          <button className="gb-modal-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
