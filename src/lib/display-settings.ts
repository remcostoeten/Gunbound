type DisplaySettings = {
  battleImmersive: boolean;
  browserFullscreen: boolean;
  lobbyEmptyStateAnimated: boolean;
  lobbyChatHeightPx: number;
};

type Listener = () => void;

const STORAGE_KEY = "gunbound:display-settings";
const LOBBY_CHAT_HEIGHT_MIN = 120;
const LOBBY_CHAT_HEIGHT_MAX = 480;
const LOBBY_CHAT_HEIGHT_DEFAULT = 180;

const DEFAULT_SETTINGS: DisplaySettings = {
  battleImmersive: true,
  browserFullscreen: false,
  lobbyEmptyStateAnimated: true,
  lobbyChatHeightPx: LOBBY_CHAT_HEIGHT_DEFAULT,
};

let settings: DisplaySettings = {
  battleImmersive: DEFAULT_SETTINGS.battleImmersive,
  browserFullscreen: DEFAULT_SETTINGS.browserFullscreen,
  lobbyEmptyStateAnimated: DEFAULT_SETTINGS.lobbyEmptyStateAnimated,
  lobbyChatHeightPx: DEFAULT_SETTINGS.lobbyChatHeightPx,
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
    ...settings,
    battleImmersive: value,
  };
  persistDisplaySettings();
  notifyDisplaySettings();
}

export function getBrowserFullscreen(): boolean {
  hydrateDisplaySettings();
  return settings.browserFullscreen;
}

export async function setBrowserFullscreen(value: boolean): Promise<void> {
  hydrateDisplaySettings();
  const currentlyFullscreen =
    typeof document !== "undefined" && document.fullscreenElement !== null;
  if (settings.browserFullscreen === value && currentlyFullscreen === value) {
    return;
  }

  let nextValue = value;

  if (typeof window !== "undefined") {
    try {
      if (value) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.fullscreenElement !== null) {
          await document.exitFullscreen();
        }
      }
    } catch {
    }
    nextValue = document.fullscreenElement !== null;
  }

  settings = {
    ...settings,
    browserFullscreen: nextValue,
  };
  persistDisplaySettings();
  notifyDisplaySettings();
}

export function getLobbyEmptyStateAnimated(): boolean {
  hydrateDisplaySettings();
  return settings.lobbyEmptyStateAnimated;
}

export function getLobbyChatHeightPx(): number {
  hydrateDisplaySettings();
  return settings.lobbyChatHeightPx;
}

export function setLobbyChatHeightPx(value: number): void {
  hydrateDisplaySettings();
  const clamped = clampLobbyChatHeight(value);
  if (settings.lobbyChatHeightPx === clamped) {
    return;
  }

  settings = {
    ...settings,
    lobbyChatHeightPx: clamped,
  };
  persistDisplaySettings();
  notifyDisplaySettings();
}

export function clampLobbyChatHeight(value: number): number {
  return Math.min(LOBBY_CHAT_HEIGHT_MAX, Math.max(LOBBY_CHAT_HEIGHT_MIN, Math.round(value)));
}

export function setLobbyEmptyStateAnimated(value: boolean): void {
  hydrateDisplaySettings();
  if (settings.lobbyEmptyStateAnimated === value) {
    return;
  }

  settings = {
    ...settings,
    lobbyEmptyStateAnimated: value,
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
      browserFullscreen: false,
      lobbyEmptyStateAnimated: parsed.lobbyEmptyStateAnimated ?? DEFAULT_SETTINGS.lobbyEmptyStateAnimated,
      lobbyChatHeightPx: clampLobbyChatHeight(
        parsed.lobbyChatHeightPx ?? DEFAULT_SETTINGS.lobbyChatHeightPx,
      ),
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
