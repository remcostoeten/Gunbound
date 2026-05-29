"use client";

import { useEffect, useState } from "react";
import { getAudioVolume, setAudioVolume, subscribeAudioSettings, getUiClickEnabled, setUiClickEnabled } from "@/lib/audio-settings";
import { playUiSfx } from "@/lib/music-bus";
import {
  getBattleImmersive,
  getBrowserFullscreen,
  getLobbyEmptyStateAnimated,
  setBattleImmersive,
  setBrowserFullscreen,
  setLobbyEmptyStateAnimated,
  subscribeDisplaySettings,
} from "@/lib/display-settings";

type Props = {
  onClose: () => void;
};

function isDocumentFullscreen(): boolean {
  return typeof document !== "undefined" && document.fullscreenElement !== null;
}

export function LobbyOptionsModal({ onClose }: Props) {
  const [musicVolume, setMusicVolumeState] = useState(() => getAudioVolume("music"));
  const [sfxVolume, setSfxVolumeState] = useState(() => getAudioVolume("sfx"));
  const [uiClick, setUiClickState] = useState(() => getUiClickEnabled());
  const [immersive, setImmersiveState] = useState(() => getBattleImmersive());
  const [fullscreen, setFullscreenState] = useState(() => isDocumentFullscreen());
  const [emptyStateAnimated, setEmptyStateAnimatedState] = useState(() => getLobbyEmptyStateAnimated());

  useEffect(function playOpenCue(): void {
    playUiSfx("open");
  }, []);

  useEffect(() => {
    return subscribeAudioSettings(() => {
      setMusicVolumeState(getAudioVolume("music"));
      setSfxVolumeState(getAudioVolume("sfx"));
      setUiClickState(getUiClickEnabled());
    });
  }, []);

  useEffect(() => {
    return subscribeDisplaySettings(() => {
      setImmersiveState(getBattleImmersive());
      setEmptyStateAnimatedState(getLobbyEmptyStateAnimated());
    });
  }, []);

  useEffect(() => {
    function onFullscreenChange(): void {
      setFullscreenState(isDocumentFullscreen());
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="gb-modal-back" onClick={onClose}>
      <div className="gb-modal gb-options-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gb-modal-head">
          <span className="gb-modal-name">Options</span>
          <button className="gb-modal-x" onClick={onClose} aria-label="Close options">✕</button>
        </div>

        <div className="gb-modal-body gb-options-body">
          <section className="gb-options-section">
            <h3 className="gb-options-section-title">Audio</h3>
            <VolumeRow
              label="Music"
              value={musicVolume}
              onChange={(v) => setAudioVolume("music", v)}
            />
            <VolumeRow
              label="Sound FX"
              value={sfxVolume}
              onChange={(v) => setAudioVolume("sfx", v)}
            />
            <ToggleRow
              label="UI click sounds"
              description="Button click feedback sound"
              checked={uiClick}
              onChange={setUiClickEnabled}
            />
          </section>

          <section className="gb-options-section">
            <h3 className="gb-options-section-title">Display</h3>
            <ToggleRow
              label="Immersive battle"
              description="Fullscreen, focused battle view"
              checked={immersive}
              onChange={setBattleImmersive}
            />
            <ToggleRow
              label="Browser fullscreen"
              description="Fill the entire screen with the game"
              checked={fullscreen}
              onChange={(v) => setBrowserFullscreen(v)}
            />
            <ToggleRow
              label="Empty lobby motion"
              description="Animate the empty room background"
              checked={emptyStateAnimated}
              onChange={setLobbyEmptyStateAnimated}
            />
          </section>
        </div>

        <div className="gb-modal-foot">
          <button
            className="gb-modal-btn"
            onClick={() => {
              setAudioVolume("music", 1);
              setAudioVolume("sfx", 1);
              setUiClickEnabled(true);
              setBattleImmersive(true);
              setLobbyEmptyStateAnimated(true);
            }}
          >
            Reset
          </button>
          <button className="gb-modal-btn gb-modal-btn-ready on" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

type VolumeRowProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function VolumeRow({ label, value, onChange }: VolumeRowProps) {
  const pct = Math.round(value * 100);
  return (
    <div className="gb-options-row">
      <span className="gb-options-row-label">{label}</span>
      <div className="gb-options-slider">
        <div className="gb-options-slider-track">
          <span className="gb-options-slider-fill" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          aria-label={`${label} volume`}
          className="gb-options-slider-input"
        />
      </div>
      <span className="gb-options-row-value">{pct === 0 ? "MUTE" : `${pct}%`}</span>
    </div>
  );
}

type ToggleRowProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      className="gb-options-toggle"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="gb-options-toggle-text">
        <span className="gb-options-row-label">{label}</span>
        {description && <small className="gb-options-toggle-desc">{description}</small>}
      </span>
      <span className={`gb-options-pill ${checked ? "is-on" : ""}`}>
        {checked ? "ON" : "OFF"}
      </span>
    </button>
  );
}
