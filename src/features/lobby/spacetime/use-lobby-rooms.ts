"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSpacetimeDB, useTable } from "spacetimedb/react";

import { tables } from "@/features/game/spacetime";
import { ROOM_STATUS, type RoomStatus } from "@/features/game/spacetime/room-status";
import { parseMapType } from "@/features/game/constants/map-presentation";
import { generateRoomCode, generateSeed } from "./generate-code";
import type { LobbyRoomSettings } from "../types";
import type { MapType } from "@/features/game/types/shared";
const ROOM_CAPACITY = 2;

export type LobbyRoomView = {
  id: bigint;
  code: string;
  status: RoomStatus;
  hostIdentityHex: string;
  hostName: string;
  memberCount: number;
  capacity: number;
  settings: LobbyRoomSettings;
  createdAtMicros: bigint;
};

type CreateOptions = { code?: string; mapType?: MapType };

export function useLobbyRooms() {
  const connection = useSpacetimeDB();
  const [allRooms, roomsReady] = useTable(tables.room);
  const [allMembers] = useTable(tables.roomMember);
  const [allPlayers] = useTable(tables.player);

  const rooms = useMemo<LobbyRoomView[]>(() => {
    const memberCount = new Map<string, number>();
    for (const m of allMembers) {
      const key = m.roomId.toString();
      memberCount.set(key, (memberCount.get(key) ?? 0) + 1);
    }

    const playerNameByHex = new Map<string, string>();
    for (const p of allPlayers) {
      playerNameByHex.set(p.identity.toHexString(), p.name);
    }

    return allRooms
      .filter(r => r.status !== ROOM_STATUS.ENDED)
      .sort((a, b) => {
        const ax = a.createdAt.microsSinceUnixEpoch;
        const bx = b.createdAt.microsSinceUnixEpoch;
        if (bx > ax) return 1;
        if (bx < ax) return -1;
        return 0;
      })
      .map(r => {
        const hex = r.hostIdentity.toHexString();
        const name = playerNameByHex.get(hex) ?? "";
        return {
          id: r.id,
          code: r.code,
          status: r.status === ROOM_STATUS.IN_MATCH ? ROOM_STATUS.IN_MATCH : ROOM_STATUS.WAITING,
          hostIdentityHex: hex,
          hostName: name.length > 0 ? name : `Host-${hex.slice(0, 4)}`,
          memberCount: memberCount.get(r.id.toString()) ?? 0,
          capacity: ROOM_CAPACITY,
          settings: {
            mapType: parseMapType(r.mapType),
            targetScore: r.targetScore,
            roundLimit: r.roundLimit
          },
          createdAtMicros: r.createdAt.microsSinceUnixEpoch
        } satisfies LobbyRoomView;
      });
  }, [allRooms, allMembers, allPlayers]);

  const roomsRef = useRef(rooms);
  useEffect(() => { roomsRef.current = rooms; }, [rooms]);

  const createRoom = useCallback(
    async (options: CreateOptions = {}): Promise<string> => {
      const conn = connection.getConnection();
      if (!conn) throw new Error("not connected");
      const code = (options.code ?? generateRoomCode()).trim().toUpperCase();
      await conn.reducers.createRoom({ code, seed: generateSeed() });

      if (options.mapType) {
        const deadline = Date.now() + 2000;
        let created = roomsRef.current.find((r) => r.code === code);
        while (!created && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          created = roomsRef.current.find((r) => r.code === code);
        }
        if (created && created.settings.mapType !== options.mapType) {
          await conn.reducers.updateRoomSettings({
            roomId: created.id,
            mapType: options.mapType,
            targetScore: created.settings.targetScore,
            roundLimit: created.settings.roundLimit,
          });
        }
      }

      return code;
    },
    [connection]
  );

  const joinRoomByCode = useCallback(
    async (code: string): Promise<void> => {
      const conn = connection.getConnection();
      if (!conn) throw new Error("not connected");
      await conn.reducers.joinRoomByCode({ code: code.trim().toUpperCase() });
    },
    [connection]
  );

  const quickJoin = useCallback(async (): Promise<LobbyRoomView | null> => {
    const candidates = rooms.filter(
      r => r.status === ROOM_STATUS.WAITING && r.memberCount < r.capacity
    );
    if (candidates.length === 0) return null;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    await joinRoomByCode(target.code);
    return target;
  }, [rooms, joinRoomByCode]);

  return { rooms, roomsReady, createRoom, joinRoomByCode, quickJoin };
}
