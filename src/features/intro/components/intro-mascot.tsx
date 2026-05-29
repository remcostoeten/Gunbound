"use client";

import { INTRO_MASCOT_SRC } from "../config/mascot";

type Props = { mascotIn: boolean; pulling: boolean; scale?: number };

export function IntroMascot({ mascotIn, pulling, scale = 1 }: Props) {
  return (
    <div
      className="mascot-scale-wrapper"
      style={{
        position: "absolute",
        inset: 0,
        transform: `scale(${scale})`,
        transformOrigin: "50% 50%",
        pointerEvents: "none",
      }}
    >
      <div className={`mascot-wrap ${mascotIn ? "mascot-in" : ""} ${pulling ? "mascot-exit" : ""}`}>
        <div className="mascot-trail" />
        <div className="speed-lines" />
        <img src={INTRO_MASCOT_SRC} alt="Mascot" className="mascot" draggable={false} />
        <div className="wheel wheel-back" />
        <div className="wheel wheel-front" />
      </div>
    </div>
  );
}
