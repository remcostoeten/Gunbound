"use client";

import type { ToolbarHint } from "../config/toolbar-hints";
import { LobbyTooltip } from "./lobby-tooltip";
import type { LobbyActionTone } from "../types";

type Props = {
  label: string;
  glyph: string;
  tone: LobbyActionTone;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
  layout?: "default" | "toolbar";
  hint?: ToolbarHint;
};

export function LobbyActionButton({
  label,
  glyph,
  tone,
  badge,
  active,
  onClick,
  layout = "default",
  hint,
}: Props) {
  const ariaLabel = badge ? `${label} (${badge})` : label;

  if (layout === "toolbar") {
    const button = (
      <button
        type="button"
        onClick={onClick}
        className={`gb-toolbar-item${active ? " gb-toolbar-item--active" : ""}`}
        aria-label={ariaLabel}
        aria-pressed={active}
      >
        <span className={`gb-toolbar-tile gb-toolbar-tile-${tone}`}>
          <span className="gb-toolbar-glyph" aria-hidden="true">{glyph}</span>
          {badge && <span className="gb-toolbar-badge" aria-hidden="true">{badge}</span>}
        </span>
        <span className="gb-toolbar-label">{label}</span>
      </button>
    );

    if (!hint) return button;
    return <LobbyTooltip hint={hint}>{button}</LobbyTooltip>;
  }

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
