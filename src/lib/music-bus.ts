// Shared music bus with smooth crossfades between named tracks.
// Tracks are pre-created HTMLAudioElements keyed by id so the same instance
// stays alive across mount/unmount and the crossfade is gapless.

import { useEffect } from "react";
import { getAudioVolume, getUiClickEnabled, subscribeAudioSettings } from "@/lib/audio-settings";

type TrackId = string;

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

let clickAudio: HTMLAudioElement | null = null;

export function playClick(): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (!getUiClickEnabled()) return;
  if (!clickAudio) {
    clickAudio = new Audio("/audio/button-click-1.mp3");
    clickAudio.preload = "auto";
  }
  const volume = 0.5 * getAudioVolume("sfx");
  const clone = clickAudio.cloneNode(true) as HTMLAudioElement;
  clone.volume = volume;
  clone.play().catch(() => {});
}

export function useMenuClickSound() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const button = target.closest("button");
      if (button && !button.disabled) {
        playClick();
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);
}
