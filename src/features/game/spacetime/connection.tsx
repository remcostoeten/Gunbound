'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import type { Identity } from 'spacetimedb';

import { DbConnection } from './module_bindings';
import { SPACETIME_MODULE, SPACETIME_URI } from './config';
import {
  clearStoredToken,
  readStoredToken,
  writeStoredToken
} from './token-storage';

type GunboundSpacetimeProviderProps = {
  children: ReactNode;
  onIdentity?: (identity: Identity) => void;
  sessionKey?: string | number;
};

export function GunboundSpacetimeProvider(
  props: GunboundSpacetimeProviderProps
): React.JSX.Element {
  const { children, onIdentity, sessionKey } = props;
  const [connectionRetry, setConnectionRetry] = useState(0);

  const connectionBuilder = useMemo(() => {
    const storedToken = readStoredToken();
    return DbConnection.builder()
      .withUri(createConnectionUri(connectionRetry, sessionKey))
      .withDatabaseName(SPACETIME_MODULE)
      .withToken(storedToken)
      .onConnect((_connection, identity, token) => {
        writeStoredToken(token);
        if (onIdentity) onIdentity(identity);
      })
      .onConnectError((_connection, error) => {
        if (storedToken && isStoredTokenVerificationError(error)) {
          clearStoredToken();
          setConnectionRetry((value) => value + 1);
        }
      });
  }, [connectionRetry, onIdentity, sessionKey]);

  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      {children}
    </SpacetimeDBProvider>
  );
}

function createConnectionUri(connectionRetry: number, sessionKey: string | number | undefined): string {
  if (connectionRetry === 0 && sessionKey === undefined) {
    return SPACETIME_URI;
  }

  try {
    const url = new URL(SPACETIME_URI);
    if (connectionRetry > 0) {
      url.searchParams.set('retry', String(connectionRetry));
    }
    if (sessionKey !== undefined) {
      url.searchParams.set('session', String(sessionKey));
    }
    return url.toString();
  } catch {
    return SPACETIME_URI;
  }
}

function isStoredTokenVerificationError(error: Error): boolean {
  return error.message.startsWith('Failed to verify token');
}
