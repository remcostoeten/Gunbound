'use client';

import { useMemo, type ReactNode } from 'react';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import type { Identity } from 'spacetimedb';

import { DbConnection } from './module_bindings';
import { SPACETIME_MODULE, SPACETIME_URI } from './config';
import { readStoredToken, writeStoredToken } from './token-storage';

type GunboundSpacetimeProviderProps = {
  children: ReactNode;
  onIdentity?: (identity: Identity) => void;
};

export function GunboundSpacetimeProvider(
  props: GunboundSpacetimeProviderProps
): React.JSX.Element {
  const { children, onIdentity } = props;

  const connectionBuilder = useMemo(() => {
    return DbConnection.builder()
      .withUri(SPACETIME_URI)
      .withDatabaseName(SPACETIME_MODULE)
      .withToken(readStoredToken())
      .onConnect((connection, identity, token) => {
        writeStoredToken(token);
        if (onIdentity) onIdentity(identity);
        connection.subscriptionBuilder().subscribeToAllTables();
      });
  }, [onIdentity]);

  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      {children}
    </SpacetimeDBProvider>
  );
}
