"use client";

import { useEffect, useRef, useState } from "react";
import { AUTH_THEME_LIST, AUTH_THEMES, BASE_AUTH_TOKENS, type AuthThemeId } from "../theme/auth-themes";

type Toggle = { key: string; label: string; on: boolean };

interface Props {
  theme: AuthThemeId;
  onThemeChange: (theme: AuthThemeId) => void;
}

export function AuthSettingsMenu({ theme, onThemeChange }: Props) {
  const [open, setOpen] = useState(false);
  const [toggles, setToggles] = useState<Toggle[]>([
    { key: "music", label: "MUSIC", on: true },
    { key: "sfx", label: "SOUND FX", on: true },
    { key: "fullscreen", label: "FULLSCREEN", on: false },
    { key: "lowfx", label: "LOW EFFECTS", on: false },
  ]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

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
        <div className="gba-settings-pop" role="menu">
          <div className="gba-settings-title">OPTIONS</div>
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
