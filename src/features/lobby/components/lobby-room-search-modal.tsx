"use client";

import { useEffect, useState } from "react";
import { playUiSfx } from "@/lib/music-bus";

type Props = {
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
};

export function LobbyRoomSearchModal({ onClose, onJoin }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(function playOpenCue(): void {
    playUiSfx("open");
  }, []);

  useEffect(function playErrorCue(): void {
    if (error !== null) {
      playUiSfx("error");
    }
  }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await onJoin(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="gb-modal-back" onClick={onClose}>
      <div className="gb-modal gb-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gb-modal-head">
          <span className="gb-modal-name">Join by Room Code</span>
          <button className="gb-modal-x" onClick={onClose}>✕</button>
        </div>

        <form className="gb-modal-body" onSubmit={handleSubmit}>
          <label className="gb-field">
            <span>Room Code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. AB12"
              maxLength={8}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
            />
          </label>
          {error && <p className="gb-field-error">{error}</p>}
        </form>

        <div className="gb-modal-foot">
          <button
            className="gb-modal-btn gb-modal-btn-start"
            disabled={code.trim().length === 0 || busy}
            onClick={handleSubmit}
          >
            {busy ? "Joining…" : "Join"}
          </button>
          <button className="gb-modal-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
