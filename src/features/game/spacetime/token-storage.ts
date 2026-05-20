import { SPACETIME_TOKEN_KEY } from './config';

export function readStoredToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const value = window.localStorage.getItem(SPACETIME_TOKEN_KEY);
  return value && value.length > 0 ? value : undefined;
}

export function writeStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SPACETIME_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SPACETIME_TOKEN_KEY);
}
