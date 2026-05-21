"use client";

import { useCallback, useMemo } from "react";
import { useSpacetimeDB, useTable } from "spacetimedb/react";
import { tables } from "@/features/game/spacetime";

export function useMatchmakingQueue() {
  const connection = useSpacetimeDB();
  const identity = connection.identity;

  const [queueRows] = useTable(tables.waitingPlayer);

  const inQueue = useMemo(() => {
    if (!identity) return false;
    return queueRows.some(r => r.identity.toHexString() === identity.toHexString());
  }, [queueRows, identity]);

  const joinQueue = useCallback(async (): Promise<void> => {
    const conn = connection.getConnection();
    if (!conn) throw new Error("not connected");
    await conn.reducers.joinQueue({});
  }, [connection]);

  const leaveQueue = useCallback(async (): Promise<void> => {
    const conn = connection.getConnection();
    if (!conn) throw new Error("not connected");
    await conn.reducers.leaveQueue({});
  }, [connection]);

  return { inQueue, joinQueue, leaveQueue };
}
