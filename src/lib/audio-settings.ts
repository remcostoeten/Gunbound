type AudioChannel = "music" | "sfx";

const UI_CLICK_KEY = "gunbound:ui-click-sounds";

export function getUiClickEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(UI_CLICK_KEY);
  // Default on; only disabled when explicitly set to "false".
  return stored !== "false";
}

export function setUiClickEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UI_CLICK_KEY, String(enabled));
  notifyAudioSettings();
}

type AudioSettings = Record<AudioChannel, number>;

type Listener = () => void;

const STORAGE_KEY = "gunbound:audio-settings";
const DEFAULT_SETTINGS: AudioSettings = {
  music: 1,
  sfx: 1,
};

let settings: AudioSettings = {
  music: DEFAULT_SETTINGS.music,
  sfx: DEFAULT_SETTINGS.sfx,
};
let hydrated = false;
const listeners = new Set<Listener>();

export function getAudioVolume(channel: AudioChannel): number {
  hydrateAudioSettings();
  return settings[channel];
}

export function setAudioVolume(channel: AudioChannel, value: number): void {
  hydrateAudioSettings();
  const next = clampVolume(value);
  if (settings[channel] === next) {
    return;
  }

  settings = { ...settings, [channel]: next };
  persistAudioSettings();
  notifyAudioSettings();
}

export function subscribeAudioSettings(listener: Listener): () => void {
  listeners.add(listener);
  return function unsubscribeAudioSettings(): void {
    listeners.delete(listener);
  };
}

function hydrateAudioSettings(): void {
  if (hydrated || typeof window === "undefined") {
    return;
  }

  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    settings = {
      music: clampVolume(parsed.music ?? DEFAULT_SETTINGS.music),
      sfx: clampVolume(parsed.sfx ?? DEFAULT_SETTINGS.sfx),
    };
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
}

function persistAudioSettings(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function notifyAudioSettings(): void {
  listeners.forEach((listener) => listener());
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}
