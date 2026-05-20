"use client";

import { useLobbyData } from "../data";

type Props = { onBuddyClick: (name: string) => void };

export function LobbyBuddyList({ onBuddyClick }: Props) {
  const buddies = useLobbyData().getBuddies();
  return (
    <div className="gb-buddy">
      <div className="gb-buddy-head">
        <span className="gb-buddy-tab gb-buddy-tab-on">All</span>
        <span className="gb-buddy-head-title">Buddy List</span>
      </div>
      {buddies.length === 0 ? (
        <div className="gb-empty gb-empty-buddy">
          <span className="gb-empty-glyph">👥</span>
          <span className="gb-empty-title">No buddies yet</span>
          <span className="gb-empty-sub">Add friends to see them online here.</span>
        </div>
      ) : (
        <ul className="gb-buddy-list">
          {buddies.map((b) => (
            <li key={b.name}>
              <button className="gb-buddy-row gb-buddy-btn" onClick={() => onBuddyClick(b.name)}>
                <span
                  className="gb-flag"
                  style={{
                    background: `linear-gradient(180deg, ${b.flagColors[0]} 50%, ${b.flagColors[1]} 50%)`,
                  }}
                >
                  {b.flag}
                </span>
                <span className="gb-buddy-name" style={{ color: b.nameColor }}>{b.name}</span>
                {b.tag && <span className="gb-buddy-tag">{b.tag}</span>}
                <span className="gb-buddy-dot" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
