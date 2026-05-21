import { SPACETIME_TOKEN_KEY } from './config';

const SPACETIME_USERNAME_KEY = 'gunbound:username';

export function readStoredToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const value = readLocalStorageValue(SPACETIME_TOKEN_KEY);
  return value && value.length > 0 ? value : undefined;
}

export function writeStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SPACETIME_TOKEN_KEY, token);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SPACETIME_TOKEN_KEY);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function readStoredUsername(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const value = readLocalStorageValue(SPACETIME_USERNAME_KEY);
  return value && value.length > 0 ? value : undefined;
}

export function writeStoredUsername(username: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SPACETIME_USERNAME_KEY, username);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function clearStoredUsername(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SPACETIME_USERNAME_KEY);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function readLocalStorageValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
