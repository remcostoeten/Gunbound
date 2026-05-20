"use client";

import type { IntroDustVariant, IntroLetterDef } from "../types";

type Props = {
  letter: IntroLetterDef;
  landed: boolean;
  started: boolean;
  dust: IntroDustVariant;
};

export function IntroLetter({ letter: l, landed, started, dust }: Props) {
  const s = l.scale ?? 1;
  const pivotX = l.pivotX ?? 0.5;
  const pivotY = l.pivotY ?? 1.0;
  const dx = (s - 1) * l.w * (0.5 - pivotX);
  const dy = (s - 1) * l.w * (0.5 - pivotY);
  const impactMult = 1 + (s - 1) * 1.6;

  return (
    <div
      className={`letter-wrap ${landed ? "landed" : "falling"} ${started ? "active" : ""}`}
      style={{
        left: `calc(50% + ${l.x + dx}px)`,
        top: `calc(50% + ${l.y + dy}px)`,
        width: `${l.w * s}px`,
        animationDelay: `${l.delay}ms`,
        ["--impact-mult" as any]: impactMult,
        ["--pivot-x" as any]: `${pivotX * 100}%`,
        ["--pivot-y" as any]: `${pivotY * 100}%`,
      }}
    >
      <img src={l.src} alt={l.alt} className="letter-img" draggable={false} />
      <div className="letter-shadow" />
      <div
        className="letter-dust"
        style={{
          ["--dust-scale" as any]: dust.scale * s,
          ["--dust-opacity" as any]: dust.opacity,
          ["--dust-hue" as any]: `${dust.hue}deg`,
          ["--dust-rot" as any]: `${dust.rot}deg`,
        }}
      />
      <div className="letter-shine" />
    </div>
  );
}
