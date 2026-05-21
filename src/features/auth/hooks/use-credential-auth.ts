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

  return {
    state,
    register,
    login,
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

export { InvalidPasswordError };
