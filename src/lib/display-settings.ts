type DisplaySettings = {
  battleImmersive: boolean;
};

type Listener = () => void;

const STORAGE_KEY = "gunbound:display-settings";
const DEFAULT_SETTINGS: DisplaySettings = {
  battleImmersive: true,
};

let settings: DisplaySettings = {
  battleImmersive: DEFAULT_SETTINGS.battleImmersive,
};
let hydrated = false;
const listeners = new Set<Listener>();

export function getBattleImmersive(): boolean {
  hydrateDisplaySettings();
  return settings.battleImmersive;
}

export function setBattleImmersive(value: boolean): void {
  hydrateDisplaySettings();
  if (settings.battleImmersive === value) {
    return;
  }

  settings = {
    battleImmersive: value,
  };
  persistDisplaySettings();
  notifyDisplaySettings();
}

export function subscribeDisplaySettings(listener: Listener): () => void {
  listeners.add(listener);
  return function unsubscribeDisplaySettings(): void {
    listeners.delete(listener);
  };
}

function hydrateDisplaySettings(): void {
  if (hydrated || typeof window === "undefined") {
    return;
  }

  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Partial<DisplaySettings>;
    settings = {
      battleImmersive: parsed.battleImmersive ?? DEFAULT_SETTINGS.battleImmersive,
    };
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
}

function persistDisplaySettings(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function notifyDisplaySettings(): void {
  listeners.forEach(function notify(listener: Listener): void {
    listener();
  });
}
