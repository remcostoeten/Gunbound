'use client';

import { useMemo } from 'react';
import { useTable } from 'spacetimedb/react';

import { tables } from '../module_bindings';
import type { Room } from '../module_bindings/types';

const ROOM_STATUS_ENDED = 'ended';

type UseRoomByCodeResult = {
  room: Room | undefined;
  isReady: boolean;
};

export function useRoomByCode(code: string | undefined): UseRoomByCodeResult {
  const normalized = useMemo(() => {
    return code ? code.trim().toUpperCase() : '';
  }, [code]);

  const query = useMemo(() => {
    if (normalized.length === 0) return tables.room;
    return tables.room.where(row => row.code.eq(normalized));
  }, [normalized]);

  const [rows, isReady] = useTable(query, { enabled: normalized.length > 0 });

  const room = useMemo(() => {
    return rows.find(r => r.code === normalized && r.status !== ROOM_STATUS_ENDED);
  }, [rows, normalized]);

  return { room, isReady };
}
