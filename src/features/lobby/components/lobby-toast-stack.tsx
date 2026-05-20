"use client";

import type { LobbyToast } from "../hooks/use-lobby-state";

export function LobbyToastStack({ toasts }: { toasts: LobbyToast[] }) {
  return (
    <div className="gb-toasts">
      {toasts.map((t) => (
        <div key={t.id} className="gb-toast">{t.text}</div>
      ))}
    </div>
  );
}
