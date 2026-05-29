"use client";

import { useEffect, useRef, useState } from "react";
import { AUTH_THEME_LIST, AUTH_THEMES, BASE_AUTH_TOKENS, type AuthThemeId } from "../theme/auth-themes";
import { getAudioVolume, setAudioVolume, subscribeAudioSettings } from "@/lib/audio-settings";
import {
  getBattleImmersive,
  getLobbyEmptyStateAnimated,
  setBattleImmersive,
  setBrowserFullscreen,
  setLobbyEmptyStateAnimated,
  subscribeDisplaySettings,
} from "@/lib/display-settings";

type Toggle = { key: string; label: string; on: boolean };

function isDocumentFullscreen(): boolean {
  return typeof document !== "undefined" && document.fullscreenElement !== null;
}

interface Props {
  theme: AuthThemeId;
  onThemeChange: (theme: AuthThemeId) => void;
}

export function AuthSettingsMenu({ theme, onThemeChange }: Props) {
  const [open, setOpen] = useState(false);
  const [musicVolume, setMusicVolume] = useState(() => getAudioVolume("music"));
  const [sfxVolume, setSfxVolume] = useState(() => getAudioVolume("sfx"));
  const [battleImmersive, setBattleImmersiveState] = useState(() => getBattleImmersive());
  const [fullscreen, setFullscreenState] = useState(() => isDocumentFullscreen());
  const [emptyStateAnimated, setEmptyStateAnimatedState] = useState(() => getLobbyEmptyStateAnimated());
  const [toggles, setToggles] = useState<Toggle[]>([
    { key: "lowfx", label: "LOW EFFECTS", on: false },
  ]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  useEffect(() => {
    return subscribeAudioSettings(function syncAudioSettings(): void {
      setMusicVolume(getAudioVolume("music"));
      setSfxVolume(getAudioVolume("sfx"));
    });
  }, []);

  useEffect(() => {
    return subscribeDisplaySettings(function syncDisplaySettings(): void {
      setBattleImmersiveState(getBattleImmersive());
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

  const flip = (k: string) =>
    setToggles((arr) => arr.map((t) => (t.key === k ? { ...t, on: !t.on } : t)));

  return (
    <div className="gba-settings" ref={ref}>
      <button
        type="button"
        className="gba-settings-btn"
        aria-label="Settings"
        onClick={() => setOpen((v) => !v)}
    >
        <span className="gba-gear" aria-hidden>⚙</span>
      </button>
      {open && (
        <div className="gba-settings-pop gba-settings-pop--open" role="menu">
          <div className="gba-settings-title">OPTIONS</div>
          <ul className="gba-settings-list gba-settings-list--sliders">
            <li>
              <AudioSliderRow
                label="MUSIC"
                value={musicVolume}
                onChange={function handleMusicChange(value: number): void {
                  setAudioVolume("music", value);
                }}
              />
            </li>
            <li>
              <AudioSliderRow
                label="SOUND FX"
                value={sfxVolume}
                onChange={function handleSfxChange(value: number): void {
                  setAudioVolume("sfx", value);
                }}
              />
            </li>
          </ul>
           <ul className="gba-settings-list">
             <li>
               <button
                 type="button"
                 className="gba-settings-row"
                 onClick={function handleImmersiveToggle(): void {
                   setBattleImmersive(!battleImmersive);
                 }}
                 role="menuitemcheckbox"
                 aria-checked={battleImmersive}
               >
                 <span>IMMERSIVE</span>
                 <span className={`gba-pill ${battleImmersive ? "is-on" : ""}`}>
                   {battleImmersive ? "ON" : "OFF"}
                 </span>
               </button>
             </li>
             <li>
               <button
                 type="button"
                 className="gba-settings-row"
                 onClick={function handleFullscreenToggle(): void {
                   setBrowserFullscreen(!fullscreen);
                 }}
                 role="menuitemcheckbox"
                 aria-checked={fullscreen}
               >
                 <span>FULLSCREEN</span>
                 <span className={`gba-pill ${fullscreen ? "is-on" : ""}`}>
                   {fullscreen ? "ON" : "OFF"}
                 </span>
               </button>
             </li>
             <li>
               <button
                 type="button"
                 className="gba-settings-row"
                 onClick={function handleEmptyMotionToggle(): void {
                   setLobbyEmptyStateAnimated(!emptyStateAnimated);
                 }}
                 role="menuitemcheckbox"
                 aria-checked={emptyStateAnimated}
               >
                 <span>EMPTY MOTION</span>
                 <span className={`gba-pill ${emptyStateAnimated ? "is-on" : ""}`}>
                   {emptyStateAnimated ? "ON" : "OFF"}
                 </span>
               </button>
             </li>
           </ul>
          <ul className="gba-settings-list">
            {toggles.map((t) => (
              <li key={t.key}>
                <button
                  type="button"
                  className="gba-settings-row"
                  onClick={() => flip(t.key)}
                  role="menuitemcheckbox"
                  aria-checked={t.on}
                >
                  <span>{t.label}</span>
                  <span className={`gba-pill ${t.on ? "is-on" : ""}`}>
                    {t.on ? "ON" : "OFF"}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="gba-settings-title gba-settings-title--sub">THEME</div>
          <ul className="gba-settings-themes">
            {AUTH_THEME_LIST.map((t) => {
              const selected = t.id === theme;
              const tokens = { ...BASE_AUTH_TOKENS, ...AUTH_THEMES[t.id].tokens };
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`gba-theme-row ${selected ? "is-selected" : ""}`}
                    onClick={() => onThemeChange(t.id)}
                    role="menuitemradio"
                    aria-checked={selected}
                  >
                    <span
                      className="gba-theme-swatch"
                      aria-hidden
                      style={{
                        background: tokens["--gba-btn-primary"],
                        borderColor: tokens["--gba-edge"],
                        boxShadow: `0 0 10px ${tokens["--gba-accent-glow"]}`,
                      }}
                    />
                    <span className="gba-theme-label">{t.label}</span>
                    {selected && <span className="gba-theme-check" aria-hidden>✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="gba-settings-foot">v1.337</div>
        </div>
      )}
    </div>
  );
}

interface AudioSliderRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function AudioSliderRow({ label, value, onChange }: AudioSliderRowProps): React.JSX.Element {
  const displayValue = Math.round(value * 100);

  return (
    <div className="gba-slider-row">
      <span className="gba-slider-label">{label}</span>
      <div
        className="gba-slider-shell"
        onPointerDown={(e) => handleSliderPointerDown(e, onChange)}
      >
        <div className="gba-slider-track">
          <span
            className="gba-slider-fill"
            style={{ width: `${displayValue}%` }}
            aria-hidden
          />
          <span
            className="gba-slider-thumb"
            style={{ left: `calc(${displayValue}% - 7px)` }}
            aria-hidden
          />
          <input
            className="gba-slider-input"
            type="range"
            min="0"
            max="100"
            step="1"
            value={displayValue}
            onChange={(e) => onChange(Number(e.target.value) / 100)}
            aria-label={`${label} volume`}
          />
        </div>
      </div>
      <span className="gba-slider-value">{displayValue === 0 ? "MUTE" : `${displayValue}%`}</span>
    </div>
  );
}

function handleSliderPointerDown(
  event: React.PointerEvent<HTMLDivElement>,
  onChange: (value: number) => void
): void {
  const rect = event.currentTarget.getBoundingClientRect();
  const raw = (event.clientX - rect.left) / rect.width;
  const value = clampSliderValue(raw);
  const edge = 0.06;

  if (value <= edge) {
    onChange(0);
    return;
  }

  if (value >= 1 - edge) {
    onChange(1);
    return;
  }

  onChange(value);
}

function clampSliderValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}
