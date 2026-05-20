import { useMemo } from "react";
import { INTRO_LETTERS } from "../config/letters";
import type { IntroDustVariant } from "../types";

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function useDustVariants(seed: number): IntroDustVariant[] {
  return useMemo(() => {
    const rng = mulberry32(seed);
    return INTRO_LETTERS.map(() => ({
      scale: 0.7 + rng() * 1.0,
      opacity: 0.55 + rng() * 0.5,
      hue: Math.round((rng() - 0.5) * 40),
      rot: Math.round((rng() - 0.5) * 30),
    }));
  }, [seed]);
}
