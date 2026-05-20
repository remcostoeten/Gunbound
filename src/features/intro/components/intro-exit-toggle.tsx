"use client";

import type { IntroExitMode } from "../types";

type Props = {
  mode: IntroExitMode;
  onChange: (mode: IntroExitMode) => void;
};

export function IntroExitToggle({ mode, onChange }: Props) {
  return (
    <div className="absolute bottom-4 right-4 z-[60] flex items-center gap-2 rounded-md bg-black/50 px-3 py-2 text-xs text-white backdrop-blur">
      <span className="opacity-70">Exit:</span>
      <button
        onClick={() => onChange("pull")}
        className={`rounded px-2 py-1 ${mode === "pull" ? "bg-white/20 font-medium" : "hover:bg-white/10"}`}
      >
        Mascot pull
      </button>
      <button
        onClick={() => onChange("fade")}
        className={`rounded px-2 py-1 ${mode === "fade" ? "bg-white/20 font-medium" : "hover:bg-white/10"}`}
      >
        Fade
      </button>
    </div>
  );
}
