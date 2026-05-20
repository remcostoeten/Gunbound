export type IntroLetterDef = {
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

export type IntroExitMode = "pull" | "fade";

export type IntroDustVariant = {
  scale: number;
  opacity: number;
  hue: number;
  rot: number;
};
