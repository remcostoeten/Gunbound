"use client";

import { useMemo } from "react";
import { useTable } from "spacetimedb/react";
import { tables } from "@/features/game/spacetime";
import { BATTLE_EVENT_KIND, parseBattleEventPayload } from "@/features/game/multiplayer/battle-events";

export function useYourTurnInRoom(
  roomId: bigint | undefined,
  selfIdentityHex: string | undefined,
): boolean {
  const roundQuery = useMemo(() => {
    if (roomId === undefined) return tables.round;
    return tables.round.where((r) => r.roomId.eq(roomId));
  }, [roomId]);

  const [roundRows] = useTable(roundQuery, { enabled: roomId !== undefined });

  const activeRound = useMemo(() => {
    if (roomId === undefined) return undefined;
    return [...roundRows]
      .filter((r) => r.roomId === roomId && r.status === "active")
      .sort((a, b) => {
        const ax = a.startedAt.microsSinceUnixEpoch;
        const bx = b.startedAt.microsSinceUnixEpoch;
        if (bx > ax) return 1;
        if (bx < ax) return -1;
        return 0;
      })[0];
  }, [roundRows, roomId]);

  const eventQuery = useMemo(() => {
    if (!activeRound) return tables.roundEvent;
    return tables.roundEvent.where((e) => e.roundId.eq(activeRound.id));
  }, [activeRound]);

  const [eventRows] = useTable(eventQuery, { enabled: activeRound !== undefined });

  const memberQuery = useMemo(() => {
    if (roomId === undefined) return tables.roomMember;
    return tables.roomMember.where((m) => m.roomId.eq(roomId));
  }, [roomId]);

  const [memberRows] = useTable(memberQuery, { enabled: roomId !== undefined });

  return useMemo(() => {
    if (!activeRound || !selfIdentityHex || !roomId) return false;

    const events = [...eventRows]
      .filter((e) => e.roundId === activeRound.id)
      .sort((a, b) => {
        if (a.tick > b.tick) return 1;
        if (a.tick < b.tick) return -1;
        if (a.id > b.id) return 1;
        if (a.id < b.id) return -1;
        return 0;
      });

    let turn: 1 | 2 = 1;
    for (const event of events) {
      if (event.kind !== BATTLE_EVENT_KIND.MOVE && event.kind !== BATTLE_EVENT_KIND.FIRE) continue;
      const payload = parseBattleEventPayload(event.kind, event.payload);
      if (!payload) continue;
      if ("turn" in payload && payload.turn !== turn) continue;
      turn = turn === 1 ? 2 : 1;
    }

    const activeSlot = turn - 1;
    const members = [...memberRows]
      .filter((m) => m.roomId === roomId)
      .sort((a, b) => a.slotIndex - b.slotIndex);

    const activeMember = members.find((m) => m.slotIndex === activeSlot);
    if (!activeMember) return false;
    return activeMember.identity.toHexString() === selfIdentityHex;
  }, [activeRound, eventRows, memberRows, selfIdentityHex, roomId]);
}
