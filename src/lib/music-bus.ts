// Shared music bus with smooth crossfades between named tracks.
// Tracks are pre-created HTMLAudioElements keyed by id so the same instance
// stays alive across mount/unmount and the crossfade is gapless.

import { useEffect } from "react";
import { getAudioVolume, getUiClickEnabled, subscribeAudioSettings } from "@/lib/audio-settings";

type TrackId = string;
export type UiSfxId =
  | "click"
  | "primary"
  | "confirm"
  | "select"
  | "open"
  | "close"
  | "notify"
  | "error"
  | "denied";

interface Track {
  el: HTMLAudioElement;
  baseVolume: number;
  src: string;
}

const tracks = new Map<TrackId, Track>();
let current: TrackId | null = null;
let rafId: number | null = null;
let unlocked = false;
let settingsSubscribed = false;

const FADE_MS = 1400;

export const lobbyAudioBlockedEvent = "gunbound:lobby-audio-blocked";
export const lobbyAudioStartedEvent = "gunbound:lobby-audio-started";

let currentLobbyTrack: string | null = null;

export const LOBBY_BGM_SRC = "/audio/lobby.mp3";

export function getRandomLobbyTrack(): string {
  if (typeof window === "undefined") return LOBBY_BGM_SRC;
  if (!currentLobbyTrack) {
    currentLobbyTrack = LOBBY_BGM_SRC;
  }
  return currentLobbyTrack;
}

export function resetLobbyTrackSelection(): void {
  currentLobbyTrack = null;
}

function notifyPlaybackStarted(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(lobbyAudioStartedEvent));
}

function notifyPlaybackBlocked(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(lobbyAudioBlockedEvent));
}

function attemptTrackPlay(playPromise: Promise<void> | undefined): void {
  if (!playPromise || typeof playPromise.then !== "function") return;
  void playPromise
    .then(() => notifyPlaybackStarted())
    .catch(() => {
      ensureUnlockListener();
      notifyPlaybackBlocked();
    });
}

function ensureUnlockListener() {
  if (unlocked) return;
  const unlock = () => {
    unlocked = true;
    // Try to start whatever is current
    if (current) {
      const t = tracks.get(current);
      attemptTrackPlay(t?.el.play());
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
}

export function registerTrack(id: TrackId, src: string, volume = 0.5) {
  // SSR guard — Audio is a browser-only constructor.
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  ensureSettingsSubscription();
  let t = tracks.get(id);
  if (t && t.src !== src) {
    t.el.pause();
    t.el.src = "";
    tracks.delete(id);
    t = undefined;
  }
  if (!t) {
    const el = new Audio(src);
    el.loop = true;
    el.preload = "auto";
    el.volume = 0;
    // Equal-power-ish crossfade sounds smoother if both tracks share a similar
    // perceived loudness; we still ramp via tick().
    t = { el, baseVolume: volume, src };
    tracks.set(id, t);
  } else {
    t.baseVolume = volume;
  }
  if (current === id) {
    attemptTrackPlay(t.el.play());
    scheduleTick();
  }
  return t;
}

function tick() {
  rafId = null;
  let active = false;
  tracks.forEach((t, id) => {
    const target = id === current ? t.baseVolume * getAudioVolume("music") : 0;
    const diff = target - t.el.volume;
    if (Math.abs(diff) < 0.005) {
      t.el.volume = target;
      if (target === 0 && !t.el.paused) t.el.pause();
      if (target > 0 && t.el.paused) {
        void t.el.play().catch(() => {});
      }
      return;
    }
    active = true;
    // step proportional to elapsed frame (~16ms) over FADE_MS
    const step = (16 / FADE_MS) * Math.max(t.baseVolume, target);
    const next = diff > 0
      ? Math.min(target, t.el.volume + step)
      : Math.max(target, t.el.volume - step);
    t.el.volume = Math.max(0, Math.min(1, next));
  });
  if (active) rafId = requestAnimationFrame(tick);
}

function scheduleTick() {
  if (rafId == null) rafId = requestAnimationFrame(tick);
}

function ensureSettingsSubscription(): void {
  if (settingsSubscribed || typeof window === "undefined") {
    return;
  }

  settingsSubscribed = true;
  subscribeAudioSettings(function handleAudioSettingsChange(): void {
    scheduleTick();
  });
}

export function playTrack(id: TrackId) {
  if (current === id) return;
  current = id;
  ensureSettingsSubscription();
  const t = tracks.get(id);
  if (!t) return;
  // Start playing (may be blocked until user gesture)
  attemptTrackPlay(t.el.play());
  scheduleTick();
}

export function stopAll() {
  current = null;
  scheduleTick();
}

const uiSfxCache = new Map<UiSfxId, HTMLAudioElement>();

const UI_SFX_PATHS: Record<UiSfxId, string> = {
  click: "/audio/ui/ui-click-soft.wav",
  primary: "/audio/ui/ui-click-primary.wav",
  confirm: "/audio/ui/ui-confirm.wav",
  select: "/audio/ui/ui-select.wav",
  open: "/audio/ui/ui-open.wav",
  close: "/audio/ui/ui-close.wav",
  notify: "/audio/ui/ui-notify.wav",
  error: "/audio/ui/ui-error.wav",
  denied: "/audio/ui/ui-denied.wav",
};

export function playClick(): void {
  playUiSfx("click");
}

export function playUiSfx(id: UiSfxId): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (!getUiClickEnabled()) return;

  let audio = uiSfxCache.get(id) ?? null;
  if (audio === null) {
    audio = new Audio(UI_SFX_PATHS[id]);
    audio.preload = "auto";
    uiSfxCache.set(id, audio);
  }

  const volume = getUiSfxVolume(id) * getAudioVolume("sfx");
  const clone = audio.cloneNode(true) as HTMLAudioElement;
  clone.volume = volume;
  clone.play().catch(() => {});
}

function getUiSfxVolume(id: UiSfxId): number {
  if (id === "notify") return 0.45;
  if (id === "error" || id === "denied") return 0.4;
  if (id === "primary" || id === "confirm") return 0.38;
  return 0.34;
}

export function useMenuClickSound() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (isModalBackdropClick(target, e.target)) {
        playUiSfx("close");
        return;
      }

      const control = target.closest("button, [role='button'], a, .gb-room-btn, .gb-channel, .gb-tip, .gb-top-btn") as HTMLElement | null;
      if (control === null || isDisabledControl(control)) {
        return;
      }

      playUiSfx(getControlSfx(control));
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);
}

function isDisabledControl(control: HTMLElement): boolean {
  if (control instanceof HTMLButtonElement || control instanceof HTMLInputElement) {
    return control.disabled;
  }

  return control.getAttribute("aria-disabled") === "true" || control.classList.contains("disabled");
}

function isModalBackdropClick(target: HTMLElement, eventTarget: EventTarget | null): boolean {
  return target === eventTarget && target.classList.contains("gb-modal-back");
}

function getControlSfx(control: HTMLElement): UiSfxId {
  const explicit = control.dataset.uiSfx as UiSfxId | undefined;
  if (explicit && explicit in UI_SFX_PATHS) {
    return explicit;
  }

  const label = getControlLabel(control);
  if (control.classList.contains("gb-modal-x") || control.classList.contains("gb-modal-min")) {
    return "close";
  }
  if (/\b(cancel|close|leave|back|done|decline|dismiss|exit)\b/i.test(label)) {
    return "close";
  }
  if (/\b(error|blocked|locked|disabled|denied)\b/i.test(label)) {
    return "denied";
  }
  if (/\b(start|play|launch|ready|create|join|accept|save|login|register|continue|restart)\b/i.test(label)) {
    return "confirm";
  }
  if (/\b(option|settings|theme|map|mobile|weapon|item|switch|tab|channel|inbox|search|info|leaderboard)\b/i.test(label)) {
    return "select";
  }
  if (control.classList.contains("gb-room-btn") || control.closest(".gb-room")) {
    return "primary";
  }

  return "click";
}

function getControlLabel(control: HTMLElement): string {
  return [
    control.getAttribute("aria-label"),
    control.getAttribute("title"),
    control.textContent,
    control.className
  ].filter(Boolean).join(" ");
}
