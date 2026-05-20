const R = "/logo/R.png";
const e = "/logo/e.png";
const m = "/logo/m.png";
const B = "/logo/B.png";
const O = "/logo/O.png";
const U = "/logo/U.png";
const N = "/logo/N.png";
const D = "/logo/D.png";

export type RemBoundLetterDef = {
  src: string;
  alt: string;
  x: number;
  y: number;
  w: number;
  row: "top" | "bottom";
  delay: number;
  scale?: number;
  pivotX?: number;
  pivotY?: number;
};

/**
 * Single source of truth for the RemBound logo layout.
 * Both the intro animation and the static auth-screen logo render from this.
 */
export const REMBOUND_LETTERS: RemBoundLetterDef[] = [
  { src: R, alt: "R", x: -120, y: -30, w: 142, row: "top",    delay: 120, scale: 1.00, pivotX: 0.5, pivotY: 1.0 },
  { src: e, alt: "e", x: -22,  y:  -6, w: 108, row: "top",    delay: 220, scale: 1.00, pivotX: 0.5, pivotY: 1.0 },
  { src: m, alt: "m", x:  82,  y:  -6, w: 138, row: "top",    delay: 320, scale: 1.00, pivotX: 0.5, pivotY: 1.0 },
  { src: B, alt: "B", x: -232, y:  92, w: 128, row: "bottom", delay: 460, scale: 1.00, pivotX: 0.5, pivotY: 1.0 },
  { src: O, alt: "O", x: -118, y:  96, w: 130, row: "bottom", delay: 550, scale: 1.00, pivotX: 0.5, pivotY: 1.0 },
  { src: U, alt: "U", x:  -4,  y:  96, w: 128, row: "bottom", delay: 640, scale: 1.00, pivotX: 0.5, pivotY: 1.0 },
  { src: N, alt: "N", x: 112,  y:  96, w: 134, row: "bottom", delay: 730, scale: 1.08, pivotX: 0.5, pivotY: 1.0 },
  { src: D, alt: "D", x: 228,  y:  96, w: 128, row: "bottom", delay: 820, scale: 1.00, pivotX: 0.5, pivotY: 1.0 },
];

/** Design space the letter coordinates live in (centered on 0,0). */
export const REMBOUND_DESIGN = { width: 720, height: 320 } as const;
