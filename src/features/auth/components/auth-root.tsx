"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthWindow } from "./auth-window";
import { AuthLogo } from "./auth-logo";
import { AuthSettingsMenu } from "./auth-settings-menu";
import { playTrack, registerTrack } from "@/lib/music-bus";
const loginMp3 = "/audio/login.mp3";
const lobbyMp3 = "/audio/lobby.mp3";
import {
  DEFAULT_AUTH_THEME,
  resolveAuthThemeStyle,
  type AuthThemeId,
} from "../theme/auth-themes";

type Mode = "login" | "register";

interface Props {
  onAuthed: (username: string) => void;
  /** Initial theme. Users can switch via the settings menu. */
  theme?: AuthThemeId;
}

// Static decorative bits — memo-stable arrays so we don't re-randomize per render.
const SPARKLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 53) % 100}%`,
  top: `${(i * 37) % 90 + 4}%`,
  delay: `${(i * 0.37) % 6}s`,
  duration: `${4 + ((i * 13) % 5)}s`,
  size: 2 + ((i * 7) % 4),
}));

const PETALS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 5) % 95}%`,
  delay: `${(i * 1.7) % 8}s`,
  duration: `${10 + ((i * 3) % 6)}s`,
}));

export function AuthRoot({ onAuthed, theme: initialTheme = DEFAULT_AUTH_THEME }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [theme, setTheme] = useState<AuthThemeId>(initialTheme);

  // GunBound-style login BGM — register tracks lazily on the client (SSR-safe),
  // then crossfade smoothly into the lobby track on auth.
  useEffect(() => {
    registerTrack("login", loginMp3, 0.45);
    registerTrack("lobby", lobbyMp3, 0.45);
    const t = window.setTimeout(() => playTrack("login"), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="gb-root"
      data-gba-theme={theme}
      style={resolveAuthThemeStyle(theme)}
    >
      <div className="gb-sky" />
      <div className="gb-clouds" />
      <div className="gb-aurora" aria-hidden />
      <div className="gb-sparkles" aria-hidden>
        {SPARKLES.map((s) => (
          <span
            key={s.id}
            className="gb-sparkle"
            style={{
              left: s.left,
              top: s.top,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
      </div>
      <div className="gb-petals" aria-hidden>
        {PETALS.map((p) => (
          <span
            key={p.id}
            className="gb-petal"
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>
      <AuthSettingsMenu theme={theme} onThemeChange={setTheme} />
      <div className="gba-stage">
        <AuthLogo />
        <AuthWindow mode={mode} onSwitchMode={setMode} onAuthed={onAuthed} />
        <div className="gba-foot">
          <span>v1.337 &nbsp;·&nbsp; © RemBound Online</span>
          <Link className="gba-foot-link" href="/policy">
            POLICY
          </Link>
        </div>
      </div>
    </div>
  );
}
