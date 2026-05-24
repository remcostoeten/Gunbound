"use client";

import { useCallback, useState } from "react";
import { useSpacetimeDB, useTable } from "spacetimedb/react";

import { tables } from "@/features/game/spacetime";
import { readStoredToken, writeStoredToken, writeStoredUsername } from "@/features/game/spacetime/token-storage";
import {
  decryptToken,
  encryptToken,
  InvalidPasswordError
} from "../crypto/token-cipher";

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const PASSWORD_MIN_LENGTH = 8;

type AuthState = "idle" | "working";

type RegisterResult = { username: string };
type LoginResult = { username: string };

type UseCredentialAuthResult = {
  state: AuthState;
  register(username: string, password: string): Promise<RegisterResult>;
  login(username: string, password: string): Promise<LoginResult>;
  loginWithGoogle(idToken: string): Promise<LoginResult>;
  isConnected: boolean;
  credentialsReady: boolean;
  connectionError: Error | undefined;
};

export function useCredentialAuth(): UseCredentialAuthResult {
  const connection = useSpacetimeDB();
  const [state, setState] = useState<AuthState>("idle");
  const [credentialRows, credentialsReady] = useTable(tables.credential);
  const isConnected = connection.isActive && Boolean(connection.getConnection());

  const register = useCallback(
    async (username: string, password: string): Promise<RegisterResult> => {
      const validated = validateCredentials(username, password);
      const conn = connection.getConnection();
      if (!conn) throw new Error("not connected to server");
      const currentToken = connection.token ?? readStoredToken();
      if (!currentToken) throw new Error("no active session token to register");

      setState("working");
      try {
        const encryptedToken = await encryptToken(
          currentToken,
          validated.password,
          validated.username
        );
        await conn.reducers.registerCredential({
          username: validated.username,
          encryptedToken
        });
        writeStoredUsername(validated.username);
        return { username: validated.username };
      } finally {
        setState("idle");
      }
    },
    [connection]
  );

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      const validated = validateCredentials(username, password);
      if (!credentialsReady) throw new Error("account list is still loading");
      setState("working");
      try {
        const row = credentialRows.find(r => r.username === validated.username);
        if (!row) throw new Error("no account with that username");

        let token: string;
        try {
          token = await decryptToken(row.encryptedToken, validated.password);
        } catch (e) {
          if (e instanceof InvalidPasswordError) throw e;
          throw new Error("could not decrypt account");
        }
        writeStoredToken(token);
        writeStoredUsername(validated.username);
        return { username: validated.username };
      } finally {
        setState("idle");
      }
    },
    [credentialRows, credentialsReady]
  );

  const loginWithGoogle = useCallback(
    async (idToken: string): Promise<LoginResult> => {
      setState("working");
      try {
        const decoded = decodeJwt(idToken);
        const rawName = decoded.name || decoded.email?.split("@")[0] || "GoogleUser";
        const sanitizedUsername = sanitizeUsername(rawName);

        writeStoredToken(idToken);
        writeStoredUsername(sanitizedUsername);
        return { username: sanitizedUsername };
      } finally {
        setState("idle");
      }
    },
    []
  );

  return {
    state,
    register,
    login,
    loginWithGoogle,
    isConnected,
    credentialsReady,
    connectionError: connection.connectionError
  };
}

function validateCredentials(username: string, password: string): { username: string; password: string } {
  const trimmedUsername = username.trim();
  if (!USERNAME_PATTERN.test(trimmedUsername)) {
    throw new Error("Username must be 3-20 characters: letters, digits, underscore");
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  return { username: trimmedUsername, password };
}

function decodeJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return {};
  }
}

function sanitizeUsername(name: string): string {
  let sanitized = name.replace(/[^A-Za-z0-9_]/g, "_");
  sanitized = sanitized.replace(/_+/g, "_");
  sanitized = sanitized.replace(/^_+|_+$/g, "");
  if (sanitized.length < 3) {
    sanitized = (sanitized + "_user").slice(0, 20);
  }
  if (sanitized.length > 20) {
    sanitized = sanitized.slice(0, 20);
    sanitized = sanitized.replace(/_+$/g, "");
  }
  return sanitized;
}

export { InvalidPasswordError };
