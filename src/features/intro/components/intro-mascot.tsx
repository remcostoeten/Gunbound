"use client";

import { INTRO_MASCOT_SRC } from "../config/mascot";

type Props = { mascotIn: boolean; pulling: boolean };

export function IntroMascot({ mascotIn, pulling }: Props) {
  return (
    <div className={`mascot-wrap ${mascotIn ? "mascot-in" : ""} ${pulling ? "mascot-exit" : ""}`}>
      <div className="mascot-trail" />
      <div className="speed-lines" />
      <img src={INTRO_MASCOT_SRC} alt="Mascot" className="mascot" draggable={false} />
      <div className="wheel wheel-back" />
      <div className="wheel wheel-front" />
    </div>
  );
}
