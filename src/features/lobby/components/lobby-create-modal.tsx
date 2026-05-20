"use client";

import { useState } from "react";
import { useLobbyRooms } from "../spacetime/use-lobby-rooms";
import { generateRoomCode } from "../spacetime/generate-code";

type Props = {
  onClose: () => void;
  onCreated: (code: string) => void;
};

const CODE_PATTERN = /^[A-Z2-9]{4,8}$/;

export function LobbyCreateModal({ onClose, onCreated }: Props) {
  const { createRoom } = useLobbyRooms();
  const [code, setCode] = useState(() => generateRoomCode());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = code.trim().toUpperCase();
  const valid = CODE_PATTERN.test(normalized);

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createRoom({ code: normalized });
      onCreated(created);
      onClose();
    } catch (e) {
      setError(messageFromError(e));
      setBusy(false);
    }
  }

  return (
    <div className="gb-modal-back" onClick={onClose}>
      <div className="gb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gb-modal-head">
          <span className="gb-modal-name">Create Room</span>
          <button className="gb-modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="gb-modal-body">
          <label className="gb-field">
            <span>Room Code</span>
            <div className="gb-pill-row">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={8}
                spellCheck={false}
                autoCapitalize="characters"
                placeholder="ABCDE"
              />
              <button
                type="button"
                className="gb-pill"
                onClick={() => setCode(generateRoomCode())}
                disabled={busy}
              >Random</button>
            </div>
          </label>
          <p className="gb-field-hint">
            4–8 characters. Letters and digits 2–9. Share this code so a friend can join.
          </p>
          {error && <p className="gb-field-error">{error}</p>}
        </div>
        <div className="gb-modal-foot">
          <button
            className="gb-modal-btn gb-modal-btn-start"
            onClick={submit}
            disabled={!valid || busy}
          >
            {busy ? "Creating…" : "Create"}
          </button>
          <button className="gb-modal-btn" onClick={onClose} disabled={busy}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function messageFromError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
