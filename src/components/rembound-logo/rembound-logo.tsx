"use client";

import { REMBOUND_LETTERS, REMBOUND_DESIGN } from "./rembound-letters";

type Props = {
  /** Visual scale relative to the design size (1 = ~720x320). */
  scale?: number;
  className?: string;
};

/**
 * Static, non-animated RemBound logo.
 * Renders the same letter layout the intro animation lands on.
 * Used by the auth screen and any other surface that needs the brand mark.
 */
export function RemBoundLogo({ scale = 0.5, className = "" }: Props) {
  return (
    <div
      className={`rb-logo ${className}`}
      style={{
        width: REMBOUND_DESIGN.width * scale,
        height: REMBOUND_DESIGN.height * scale,
      }}
    >
      <div className="rb-logo-stage" style={{ transform: `scale(${scale})` }}>
        {REMBOUND_LETTERS.map((l) => {
          const s = l.scale ?? 1;
          const pivotX = l.pivotX ?? 0.5;
          const pivotY = l.pivotY ?? 1.0;
          const dx = (s - 1) * l.w * (0.5 - pivotX);
          const dy = (s - 1) * l.w * (0.5 - pivotY);
          return (
            <div
              key={l.alt}
              className="rb-logo-letter"
              style={{
                left: `calc(50% + ${l.x + dx}px)`,
                top: `calc(50% + ${l.y + dy}px)`,
                width: `${l.w * s}px`,
              }}
            >
              <img src={l.src} alt={l.alt} draggable={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
