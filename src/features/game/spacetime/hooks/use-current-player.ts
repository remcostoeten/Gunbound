'use client';

import { useMemo } from 'react';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';

import { tables } from '../module_bindings';
import type { Player } from '../module_bindings/types';

type UseCurrentPlayerResult = {
  player: Player | undefined;
  isReady: boolean;
};

export function useCurrentPlayer(): UseCurrentPlayerResult {
  const connection = useSpacetimeDB();
  const identity = connection.identity;

  const query = useMemo(() => {
    if (!identity) return tables.player;
    return tables.player.where(row => row.identity.eq(identity));
  }, [identity]);

  const [rows, isReady] = useTable(query, { enabled: Boolean(identity) });

  const player = useMemo(() => {
    if (!identity) return undefined;
    return rows.find(row => row.identity.toHexString() === identity.toHexString());
  }, [rows, identity]);

  return { player, isReady };
}
