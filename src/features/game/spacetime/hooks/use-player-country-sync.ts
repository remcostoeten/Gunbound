'use client';

import { useEffect, useRef } from 'react';
import { useSpacetimeDB } from 'spacetimedb/react';

import { useCurrentPlayer } from './use-current-player';

type GeoResponse = { country: string | null };

export function usePlayerCountrySync(): void {
  const connection = useSpacetimeDB();
  const { player } = useCurrentPlayer();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!player) return;

    const identityHex = player.identity.toHexString();
    if (syncedFor.current === identityHex) return;
    syncedFor.current = identityHex;

    const controller = new AbortController();

    fetch('/api/geo', { signal: controller.signal, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: GeoResponse | null) => {
        const detected = data?.country?.toUpperCase() ?? '';
        const current = (player.country ?? '').toUpperCase();
        if (detected === current) return;
        const conn = connection.getConnection();
        if (!conn) return;
        conn.reducers.setPlayerCountry({ country: detected });
      })
      .catch(() => {
        syncedFor.current = null;
      });

    return () => controller.abort();
  }, [connection, player]);
}
