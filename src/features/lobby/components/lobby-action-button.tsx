"use client";

import type { LobbyActionTone } from "../types";

type Props = {
  label: string;
  glyph: string;
  tone: LobbyActionTone;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
};

export function LobbyActionButton({ label, glyph, tone, badge, active, onClick }: Props) {
  const ariaLabel = badge ? `${label} (${badge})` : label;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`gb-act gb-act-${tone}${active ? " gb-act-on" : ""}`}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      <span className="gb-act-glyph" aria-hidden="true">{glyph}</span>
      <span className="gb-act-label">{label}</span>
      {badge && <span className="gb-act-badge" aria-hidden="true">{badge}</span>}
    </button>
  );
}
