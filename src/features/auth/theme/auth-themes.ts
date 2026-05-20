/**
 * Auth screen theme system — token map (single source of truth).
 *
 * Every theme is just a partial map of `AuthTokens`. The base theme defines
 * every token; named themes only need to override what they want to change.
 * Tokens are applied as CSS custom properties on the auth root element at
 * runtime, so there is NO CSS to touch when adding a new theme.
 *
 * ───────────────────────────────────────────────────────────────────
 * Adding a new color scheme:
 *
 *   AUTH_THEMES["my-theme"] = {
 *     label: "My Theme",
 *     tokens: {
 *       "--gba-accent": "#ff00aa",
 *       "--gba-window-bg": "linear-gradient(...)",
 *       // ...any subset of AuthTokens
 *     },
 *   };
 *
 * That's it — it shows up in the picker automatically.
 * ───────────────────────────────────────────────────────────────────
 */

/** Every CSS variable the auth screen understands. */
export type AuthTokenKey =
  // Surfaces
  | "--gba-window-bg"
  | "--gba-titlebar-bg"
  | "--gba-popover-bg"
  | "--gba-settings-bg"
  | "--gba-field-bg"
  | "--gba-field-bg-focus"
  // Borders / edges
  | "--gba-edge"
  | "--gba-edge-soft"
  | "--gba-edge-inner"
  | "--gba-divider"
  // Accent / brand
  | "--gba-accent"
  | "--gba-accent-bright"
  | "--gba-accent-deep"
  | "--gba-accent-shadow"
  | "--gba-accent-glow"
  | "--gba-accent-glow-soft"
  // Text
  | "--gba-text"
  | "--gba-text-bright"
  | "--gba-text-muted"
  | "--gba-text-label"
  | "--gba-text-link"
  | "--gba-text-link-hover"
  // Status
  | "--gba-danger"
  | "--gba-danger-bg"
  | "--gba-danger-text"
  | "--gba-success"
  | "--gba-success-glow"
  | "--gba-pill-on"
  | "--gba-pill-on-text"
  | "--gba-pill-on-edge"
  // Tabs
  | "--gba-tab-bg"
  | "--gba-tab-text"
  | "--gba-tab-text-hover"
  | "--gba-tab-active-bg"
  | "--gba-tab-active-text"
  // Buttons
  | "--gba-btn-primary"
  | "--gba-btn-ghost"
  | "--gba-btn-text"
  // Close box
  | "--gba-close-bg"
  | "--gba-close-edge"
  // Shadows
  | "--gba-shadow-deep"
  | "--gba-shadow-glow";

export type AuthTokens = Record<AuthTokenKey, string>;
export type AuthTokensPartial = Partial<AuthTokens>;

/** Default token values — every key must be defined here. */
export const BASE_AUTH_TOKENS: AuthTokens = {
  "--gba-window-bg": "linear-gradient(180deg, rgba(28,46,72,0.96) 0%, rgba(12,22,40,0.96) 100%)",
  "--gba-titlebar-bg": "linear-gradient(180deg, #1d3e6a 0%, #0a1a30 100%)",
  "--gba-popover-bg": "linear-gradient(180deg, rgba(20,32,52,0.97) 0%, rgba(8,16,30,0.97) 100%)",
  "--gba-settings-bg": "linear-gradient(180deg, #2a3f5f 0%, #0e1a2e 100%)",
  "--gba-field-bg": "rgba(8,16,30,0.85)",
  "--gba-field-bg-focus": "rgba(12,28,52,0.9)",

  "--gba-edge": "#03101e",
  "--gba-edge-soft": "#00121f",
  "--gba-edge-inner": "rgba(120,200,255,0.22)",
  "--gba-divider": "rgba(120,200,255,0.25)",

  "--gba-accent": "#46c8ff",
  "--gba-accent-bright": "#5cd8ff",
  "--gba-accent-deep": "#1f7ac4",
  "--gba-accent-shadow": "#0a2c5c",
  "--gba-accent-glow": "rgba(70,200,255,0.4)",
  "--gba-accent-glow-soft": "rgba(70,200,255,0.18)",

  "--gba-text": "#dceaff",
  "--gba-text-bright": "#b4e0ff",
  "--gba-text-muted": "#8fb6dc",
  "--gba-text-label": "#7fd9ff",
  "--gba-text-link": "#7fd9ff",
  "--gba-text-link-hover": "#b4e8ff",

  "--gba-danger": "#ff5a7a",
  "--gba-danger-bg": "rgba(120,20,40,0.4)",
  "--gba-danger-text": "#ffb4c6",
  "--gba-success": "#6effb4",
  "--gba-success-glow": "rgba(110,255,180,0.7)",
  "--gba-pill-on": "linear-gradient(180deg, #46e0a0, #0f7a4c)",
  "--gba-pill-on-text": "#002a18",
  "--gba-pill-on-edge": "#0a3a24",

  "--gba-tab-bg": "linear-gradient(180deg, #2a4870 0%, #0f1f38 100%)",
  "--gba-tab-text": "#8fb6dc",
  "--gba-tab-text-hover": "#cfe6ff",
  "--gba-tab-active-bg": "linear-gradient(180deg, #46c8ff 0%, #1166a6 100%)",
  "--gba-tab-active-text": "#06192c",

  "--gba-btn-primary": "linear-gradient(180deg, #5cd8ff 0%, #1f7ac4 55%, #0a2c5c 100%)",
  "--gba-btn-ghost": "linear-gradient(180deg, #5a7896 0%, #2e4666 55%, #0e1a2e 100%)",
  "--gba-btn-text": "#fff",

  "--gba-close-bg": "linear-gradient(180deg, #e85a5a, #7a1f1f)",
  "--gba-close-edge": "#1a0a0a",

  "--gba-shadow-deep": "0 18px 40px rgba(0,0,0,0.6)",
  "--gba-shadow-glow": "0 0 60px rgba(70,200,255,0.18)",
};

export interface AuthTheme {
  label: string;
  /** Partial token overrides on top of BASE_AUTH_TOKENS. */
  tokens: AuthTokensPartial;
}

/**
 * Theme registry. Add new themes here — they appear in the picker automatically.
 * Keys become theme ids.
 */
export const AUTH_THEMES = {
  "steel-cyan": {
    label: "Steel Cyan",
    tokens: {}, // base theme
  },

  "emerald-gold": {
    label: "Emerald Gold",
    tokens: {
      "--gba-window-bg": "linear-gradient(180deg, rgba(20,52,38,0.96) 0%, rgba(6,24,16,0.96) 100%)",
      "--gba-titlebar-bg": "linear-gradient(180deg, #1a5a3c 0%, #06241a 100%)",
      "--gba-popover-bg": "linear-gradient(180deg, rgba(18,40,28,0.97) 0%, rgba(4,18,12,0.97) 100%)",
      "--gba-settings-bg": "linear-gradient(180deg, #2d5a3d 0%, #0a1a12 100%)",
      "--gba-field-bg": "rgba(4,18,12,0.85)",
      "--gba-field-bg-focus": "rgba(10,30,20,0.9)",
      "--gba-edge": "#02140a",
      "--gba-edge-soft": "#03190f",
      "--gba-edge-inner": "rgba(220,180,80,0.22)",
      "--gba-divider": "rgba(220,180,80,0.25)",
      "--gba-accent": "#d4a72c",
      "--gba-accent-bright": "#f0d260",
      "--gba-accent-deep": "#8a6a18",
      "--gba-accent-shadow": "#2a1f08",
      "--gba-accent-glow": "rgba(220,180,80,0.45)",
      "--gba-accent-glow-soft": "rgba(220,180,80,0.2)",
      "--gba-text": "#ecf6dd",
      "--gba-text-bright": "#ffe9a8",
      "--gba-text-muted": "#9ab494",
      "--gba-text-label": "#f0d260",
      "--gba-text-link": "#f0d260",
      "--gba-text-link-hover": "#fff1bf",
      "--gba-tab-bg": "linear-gradient(180deg, #2a5a40 0%, #0e2418 100%)",
      "--gba-tab-text": "#9ab494",
      "--gba-tab-text-hover": "#ecf6dd",
      "--gba-tab-active-bg": "linear-gradient(180deg, #f0d260 0%, #8a6a18 100%)",
      "--gba-tab-active-text": "#1a1408",
      "--gba-btn-primary": "linear-gradient(180deg, #f0d260 0%, #8a6a18 55%, #2a1f08 100%)",
      "--gba-btn-ghost": "linear-gradient(180deg, #4a6a4f 0%, #234028 55%, #0a1a12 100%)",
      "--gba-shadow-glow": "0 0 60px rgba(220,180,80,0.22)",
    },
  },

  "sunset-magenta": {
    label: "Sunset Magenta",
    tokens: {
      "--gba-window-bg": "linear-gradient(180deg, rgba(72,20,52,0.96) 0%, rgba(28,8,24,0.96) 100%)",
      "--gba-titlebar-bg": "linear-gradient(180deg, #c44569 0%, #3a0e24 100%)",
      "--gba-popover-bg": "linear-gradient(180deg, rgba(54,16,42,0.97) 0%, rgba(20,6,18,0.97) 100%)",
      "--gba-settings-bg": "linear-gradient(180deg, #6c2a4e 0%, #1c0612 100%)",
      "--gba-field-bg": "rgba(20,6,18,0.85)",
      "--gba-field-bg-focus": "rgba(40,12,32,0.9)",
      "--gba-edge": "#1a0410",
      "--gba-edge-inner": "rgba(255,160,200,0.22)",
      "--gba-divider": "rgba(255,160,200,0.25)",
      "--gba-accent": "#ff6b35",
      "--gba-accent-bright": "#ff9a5a",
      "--gba-accent-deep": "#c43c4e",
      "--gba-accent-shadow": "#4a0a1a",
      "--gba-accent-glow": "rgba(255,107,53,0.45)",
      "--gba-accent-glow-soft": "rgba(255,107,53,0.2)",
      "--gba-text": "#ffe4ec",
      "--gba-text-bright": "#ffd0b8",
      "--gba-text-muted": "#c89aac",
      "--gba-text-label": "#ff9a5a",
      "--gba-text-link": "#ff9a5a",
      "--gba-text-link-hover": "#ffd0b8",
      "--gba-tab-bg": "linear-gradient(180deg, #6c2a4e 0%, #2a0a20 100%)",
      "--gba-tab-active-bg": "linear-gradient(180deg, #ff6b35 0%, #c43c4e 100%)",
      "--gba-tab-active-text": "#28060e",
      "--gba-btn-primary": "linear-gradient(180deg, #ff9a5a 0%, #ff6b35 50%, #c43c4e 100%)",
      "--gba-btn-ghost": "linear-gradient(180deg, #8a5070 0%, #4a2240 55%, #1c0612 100%)",
      "--gba-shadow-glow": "0 0 60px rgba(255,107,53,0.22)",
    },
  },

  "noir-amber": {
    label: "Noir Amber",
    tokens: {
      "--gba-window-bg": "linear-gradient(180deg, rgba(26,26,26,0.97) 0%, rgba(8,8,8,0.97) 100%)",
      "--gba-titlebar-bg": "linear-gradient(180deg, #2a2a2a 0%, #060606 100%)",
      "--gba-popover-bg": "linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(6,6,6,0.98) 100%)",
      "--gba-settings-bg": "linear-gradient(180deg, #2a2a2a 0%, #0a0a0a 100%)",
      "--gba-field-bg": "rgba(0,0,0,0.85)",
      "--gba-field-bg-focus": "rgba(20,16,8,0.9)",
      "--gba-edge": "#000",
      "--gba-edge-inner": "rgba(232,184,74,0.22)",
      "--gba-divider": "rgba(232,184,74,0.25)",
      "--gba-accent": "#e8b84a",
      "--gba-accent-bright": "#f5d27a",
      "--gba-accent-deep": "#8a6a18",
      "--gba-accent-shadow": "#1a1408",
      "--gba-accent-glow": "rgba(232,184,74,0.4)",
      "--gba-accent-glow-soft": "rgba(232,184,74,0.18)",
      "--gba-text": "#f0e6d0",
      "--gba-text-bright": "#ffe9a8",
      "--gba-text-muted": "#8a7e60",
      "--gba-text-label": "#e8b84a",
      "--gba-text-link": "#e8b84a",
      "--gba-text-link-hover": "#ffe9a8",
      "--gba-tab-bg": "linear-gradient(180deg, #2a2a2a 0%, #0a0a0a 100%)",
      "--gba-tab-active-bg": "linear-gradient(180deg, #e8b84a 0%, #8a6a18 100%)",
      "--gba-tab-active-text": "#1a1408",
      "--gba-btn-primary": "linear-gradient(180deg, #f5d27a 0%, #c9a84c 50%, #6a4f10 100%)",
      "--gba-btn-ghost": "linear-gradient(180deg, #3a3a3a 0%, #1a1a1a 55%, #060606 100%)",
      "--gba-shadow-glow": "0 0 60px rgba(232,184,74,0.2)",
    },
  },

  "ice-violet": {
    label: "Ice Violet",
    tokens: {
      "--gba-window-bg": "linear-gradient(180deg, rgba(40,32,72,0.96) 0%, rgba(16,12,32,0.96) 100%)",
      "--gba-titlebar-bg": "linear-gradient(180deg, #4a3a8a 0%, #14102a 100%)",
      "--gba-popover-bg": "linear-gradient(180deg, rgba(30,24,52,0.97) 0%, rgba(12,8,24,0.97) 100%)",
      "--gba-settings-bg": "linear-gradient(180deg, #4a3a8a 0%, #14102a 100%)",
      "--gba-field-bg": "rgba(12,8,24,0.85)",
      "--gba-field-bg-focus": "rgba(24,18,44,0.9)",
      "--gba-edge": "#0a0618",
      "--gba-edge-inner": "rgba(196,180,253,0.22)",
      "--gba-divider": "rgba(196,180,253,0.25)",
      "--gba-accent": "#a78bfa",
      "--gba-accent-bright": "#c4b5fd",
      "--gba-accent-deep": "#6d4ade",
      "--gba-accent-shadow": "#1a0a3a",
      "--gba-accent-glow": "rgba(167,139,250,0.45)",
      "--gba-accent-glow-soft": "rgba(167,139,250,0.2)",
      "--gba-text": "#ece6ff",
      "--gba-text-bright": "#d8ccff",
      "--gba-text-muted": "#9c8fc4",
      "--gba-text-label": "#c4b5fd",
      "--gba-text-link": "#c4b5fd",
      "--gba-text-link-hover": "#ece6ff",
      "--gba-tab-bg": "linear-gradient(180deg, #3a2c6a 0%, #14102a 100%)",
      "--gba-tab-active-bg": "linear-gradient(180deg, #c4b5fd 0%, #6d4ade 100%)",
      "--gba-tab-active-text": "#140a32",
      "--gba-btn-primary": "linear-gradient(180deg, #c4b5fd 0%, #8b6fef 50%, #3a1f8a 100%)",
      "--gba-btn-ghost": "linear-gradient(180deg, #5a4e8a 0%, #2e2454 55%, #14102a 100%)",
      "--gba-shadow-glow": "0 0 60px rgba(167,139,250,0.22)",
    },
  },
} as const satisfies Record<string, AuthTheme>;

export type AuthThemeId = keyof typeof AUTH_THEMES;

export const DEFAULT_AUTH_THEME: AuthThemeId = "steel-cyan";

/** List of `{ id, label }` for picker UIs. */
export const AUTH_THEME_LIST: Array<{ id: AuthThemeId; label: string }> =
  (Object.keys(AUTH_THEMES) as AuthThemeId[]).map((id) => ({
    id,
    label: AUTH_THEMES[id].label,
  }));

/**
 * Resolve a theme id into a flat CSS-variable style object suitable for
 * `<div style={...}>`. Merges base tokens with the theme's overrides.
 */
export function resolveAuthThemeStyle(id: AuthThemeId): React.CSSProperties {
  const overrides = AUTH_THEMES[id]?.tokens ?? {};
  return { ...BASE_AUTH_TOKENS, ...overrides } as React.CSSProperties;
}

// Re-export React for the CSSProperties type above without forcing consumers
// to import it.
import type React from "react";
