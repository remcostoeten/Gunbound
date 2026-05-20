import { SPACETIME_TOKEN_KEY } from './config';

export function readStoredToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const value = readLocalStorageValue();
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

function readLocalStorageValue(): string | null {
  try {
    return window.localStorage.getItem(SPACETIME_TOKEN_KEY);
  } catch {
    return null;
  }
}
