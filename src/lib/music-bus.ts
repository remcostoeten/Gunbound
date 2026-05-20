// Shared music bus with smooth crossfades between named tracks.
// Tracks are pre-created HTMLAudioElements keyed by id so the same instance
// stays alive across mount/unmount and the crossfade is gapless.

type TrackId = string;

interface Track {
  el: HTMLAudioElement;
  targetVolume: number;
}

const tracks = new Map<TrackId, Track>();
let current: TrackId | null = null;
let rafId: number | null = null;
let unlocked = false;

const FADE_MS = 1400;

function ensureUnlockListener() {
  if (unlocked) return;
  const unlock = () => {
    unlocked = true;
    // Try to start whatever is current
    if (current) {
      const t = tracks.get(current);
      t?.el.play().catch(() => {});
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
  let t = tracks.get(id);
  if (!t) {
    const el = new Audio(src);
    el.loop = true;
    el.preload = "auto";
    el.volume = 0;
    // Equal-power-ish crossfade sounds smoother if both tracks share a similar
    // perceived loudness; we still ramp via tick().
    t = { el, targetVolume: volume };
    tracks.set(id, t);
  } else {
    t.targetVolume = volume;
  }
  return t;
}

function tick() {
  rafId = null;
  let active = false;
  const now = performance.now();
  tracks.forEach((t, id) => {
    const target = id === current ? t.targetVolume : 0;
    const diff = target - t.el.volume;
    if (Math.abs(diff) < 0.005) {
      t.el.volume = target;
      if (target === 0 && !t.el.paused) t.el.pause();
      return;
    }
    active = true;
    // step proportional to elapsed frame (~16ms) over FADE_MS
    const step = (16 / FADE_MS) * t.targetVolume;
    const next = diff > 0
      ? Math.min(target, t.el.volume + step)
      : Math.max(target, t.el.volume - step);
    t.el.volume = Math.max(0, Math.min(1, next));
  });
  if (active) rafId = requestAnimationFrame(tick);
  void now;
}

function scheduleTick() {
  if (rafId == null) rafId = requestAnimationFrame(tick);
}

export function playTrack(id: TrackId) {
  if (current === id) return;
  current = id;
  const t = tracks.get(id);
  if (!t) return;
  // Start playing (may be blocked until user gesture)
  const p = t.el.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => ensureUnlockListener());
  }
  scheduleTick();
}

export function stopAll() {
  current = null;
  scheduleTick();
}
