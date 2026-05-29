"use client";

import { useEffect, useState } from "react";
import { useLobbyRooms } from "../spacetime/use-lobby-rooms";
import { generateRoomCode } from "../spacetime/generate-code";
import { mapPresentationOptions } from "@/features/game/constants/map-presentation";
import { playUiSfx } from "@/lib/music-bus";
import type { MapType } from "@/features/game/types/shared";

type Props = {
  onClose: () => void;
  onCreated: (code: string) => void;
  minimized?: boolean;
  onMinimize?: () => void;
};

const CODE_PATTERN = /^[A-Z2-9]{4,8}$/;

export function LobbyCreateModal({ onClose, onCreated, minimized = false, onMinimize }: Props) {
  const { createRoom } = useLobbyRooms();
  const [code, setCode] = useState(() => generateRoomCode());
  const [mapType, setMapType] = useState<MapType>(mapPresentationOptions[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = code.trim().toUpperCase();
  const valid = CODE_PATTERN.test(normalized);
  const selectedMap = mapPresentationOptions.find((option) => option.value === mapType) ?? mapPresentationOptions[0];

  useEffect(function playOpenCue(): void {
    playUiSfx("open");
  }, []);

  useEffect(function playErrorCue(): void {
    if (error !== null) {
      playUiSfx("error");
    }
  }, [error]);

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createRoom({ code: normalized, mapType });
      onCreated(created);
      onClose();
    } catch (e) {
      setError(messageFromError(e));
      setBusy(false);
    }
  }

  if (minimized) return null;

  return (
    <div className="gb-modal-back" onClick={onClose}>
      <div className="gb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gb-modal-head">
          <span className="gb-modal-name">Create Room</span>
          <div className="gb-modal-head-actions">
            <button className="gb-modal-min" onClick={onMinimize} aria-label="Minimize">−</button>
            <button className="gb-modal-x" onClick={onClose}>✕</button>
          </div>
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

          <div className="gb-field">
            <span>Map</span>
            <div className="gb-map-preview">
              <img
                src={selectedMap.previewImage}
                alt={selectedMap.label}
                className="gb-map-preview-img"
              />
              <div className="gb-map-preview-info">
                <span className="gb-map-preview-label">{selectedMap.label}</span>
                <span className="gb-map-preview-desc">{selectedMap.description}</span>
              </div>
            </div>
            <div className="gb-map-thumbs">
              {mapPresentationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`gb-map-thumb ${option.value === mapType ? "gb-map-thumb-on" : ""}`}
                  onClick={() => setMapType(option.value)}
                  disabled={busy}
                  aria-pressed={option.value === mapType}
                  title={option.label}
                >
                  <img src={option.previewImage} alt={option.label} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

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
