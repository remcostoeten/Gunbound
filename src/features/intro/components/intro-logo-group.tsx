"use client";

import { INTRO_LETTERS } from "../config/letters";
import { IntroLetter } from "./intro-letter";
import type { IntroDustVariant } from "../types";

type Props = {
  pulled: boolean;
  fit: { scale: number; offsetX: number; offsetY: number };
  started: boolean;
  landed: Record<string, boolean>;
  dustVariants: IntroDustVariant[];
};

export function IntroLogoGroup({ pulled, fit, started, landed, dustVariants }: Props) {
  return (
    <div className={`logo-pull-container ${pulled ? "logo-pulled" : ""}`}>
      <div
        className="logo-group"
        style={{
          transform: `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scale})`,
          transformOrigin: "50% 50%",
        }}
      >
        {INTRO_LETTERS.map((l, i) => (
          <IntroLetter
            key={l.alt}
            letter={l}
            landed={!!landed[l.alt]}
            started={started}
            dust={dustVariants[i]}
          />
        ))}
      </div>
    </div>
  );
}
