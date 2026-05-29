"use client";

import { useEffect, useRef } from "react";
import { playUiSfx } from "@/lib/music-bus";
import type { LobbyToast } from "../hooks/use-lobby-state";

export function LobbyToastStack({ toasts }: { toasts: LobbyToast[] }) {
  const previousCountRef = useRef(0);

  useEffect(function playToastSound(): void {
    if (toasts.length > previousCountRef.current) {
      playUiSfx("notify");
    }
    previousCountRef.current = toasts.length;
  }, [toasts.length]);

  return (
    <div className="gb-toasts">
      {toasts.map((t) => (
        <div key={t.id} className="gb-toast">{t.text}</div>
      ))}
    </div>
  );
}
