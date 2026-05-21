"use client";

import { useCallback, useMemo } from "react";
import { useSpacetimeDB, useTable } from "spacetimedb/react";
import type { Identity } from "spacetimedb";

import { parseMobileType } from "@/features/game/mobiles/mobile-factory";
import { tables } from "@/features/game/spacetime";
import type { Room, RoomMember, Round, RoundEvent } from "@/features/game/spacetime";
import type { MobileType } from "@/features/game/types/shared";
import type { LobbyRoomSettings } from "../types";

export type RoomChatMessage = {
  id: bigint;
  authorHex: string;
  authorName: string;
  text: string;
  createdAtMicros: bigint;
  isSelf: boolean;
};

export type RoomMemberView = {
  id: bigint;
  identity: Identity;
  identityHex: string;
  slotIndex: number;
  name: string;
  mobileType: MobileType | undefined;
  isReady: boolean;
  isHost: boolean;
  isSelf: boolean;
};

type UseRoomSessionResult = {
  room: Room | undefined;
  activeRound: Round | undefined;
  roundEvents: RoundEvent[];
  members: RoomMemberView[];
  self: RoomMemberView | undefined;
  isHost: boolean;
  chat: RoomChatMessage[];
  isLoaded: boolean;
  sendChat(text: string): Promise<void>;
  setReady(ready: boolean): Promise<void>;
  selectMobile(mobileType: MobileType): Promise<void>;
  updateRoomSettings(settings: LobbyRoomSettings): Promise<void>;
  startRound(): Promise<void>;
  leave(): Promise<void>;
};

export function useRoomSession(
  roomId: bigint | undefined,
): UseRoomSessionResult {
  const connection = useSpacetimeDB();
  const identityHex = connection.identity?.toHexString();

  const roomQuery = useMemo(() => {
    if (roomId === undefined) return tables.room;
    return tables.room.where((r) => r.id.eq(roomId));
  }, [roomId]);

  const [roomRows, roomReady] = useTable(roomQuery, {
    enabled: roomId !== undefined,
  });

  const room = useMemo<Room | undefined>(() => {
    if (roomId === undefined) return undefined;
    return roomRows.find((r) => r.id === roomId);
  }, [roomRows, roomId]);

  const memberQuery = useMemo(() => {
    if (roomId === undefined) return tables.roomMember;
    return tables.roomMember.where((m) => m.roomId.eq(roomId));
  }, [roomId]);

  const [memberRows, membersReady] = useTable(memberQuery, {
    enabled: roomId !== undefined,
  });

  const chatQuery = useMemo(() => {
    if (roomId === undefined) return tables.chatMessage;
    return tables.chatMessage.where((m) => m.roomId.eq(roomId));
  }, [roomId]);

  const [chatRows, chatReady] = useTable(chatQuery, {
    enabled: roomId !== undefined,
  });

  const roundQuery = useMemo(() => {
    if (roomId === undefined) return tables.round;
    return tables.round.where((r) => r.roomId.eq(roomId));
  }, [roomId]);

  const [roundRows, roundsReady] = useTable(roundQuery, {
    enabled: roomId !== undefined,
  });

  const activeRound = useMemo<Round | undefined>(() => {
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

  const roundEventQuery = useMemo(() => {
    if (!activeRound) return tables.roundEvent;
    return tables.roundEvent.where((event) => event.roundId.eq(activeRound.id));
  }, [activeRound]);

  const [roundEventRows, roundEventsReady] = useTable(roundEventQuery, {
    enabled: activeRound !== undefined,
  });

  const roundEvents = useMemo<RoundEvent[]>(() => {
    if (!activeRound) return [];
    return [...roundEventRows]
      .filter((event) => event.roundId === activeRound.id)
      .sort((a, b) => {
        if (a.tick > b.tick) return 1;
        if (a.tick < b.tick) return -1;
        if (a.id > b.id) return 1;
        if (a.id < b.id) return -1;
        return 0;
      });
  }, [roundEventRows, activeRound]);

  const [allPlayers] = useTable(tables.player);

  const playerNameByHex = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of allPlayers) map.set(p.identity.toHexString(), p.name);
    return map;
  }, [allPlayers]);

  const members = useMemo<RoomMemberView[]>(() => {
    if (!room) return [];
    return [...memberRows]
      .filter((m) => m.roomId === room.id)
      .sort((a, b) => {
        if (a.slotIndex !== b.slotIndex) return a.slotIndex - b.slotIndex;
        const ax = a.joinedAt.microsSinceUnixEpoch;
        const bx = b.joinedAt.microsSinceUnixEpoch;
        if (ax > bx) return 1;
        if (ax < bx) return -1;
        return 0;
      })
      .map<RoomMemberView>((m: RoomMember) => {
        const hex = m.identity.toHexString();
        const name = playerNameByHex.get(hex);
        return {
          id: m.id,
          identity: m.identity,
          identityHex: hex,
          slotIndex: m.slotIndex,
          name: name && name.length > 0 ? name : `Player-${hex.slice(0, 4)}`,
          mobileType: parseMobileType(m.mobileType),
          isReady: m.isReady,
          isHost: hex === room.hostIdentity.toHexString(),
          isSelf: hex === identityHex,
        };
      });
  }, [memberRows, room, playerNameByHex, identityHex]);

  const self = useMemo(() => members.find((m) => m.isSelf), [members]);
  const isHost = Boolean(
    room && identityHex && room.hostIdentity.toHexString() === identityHex,
  );

  const chat = useMemo<RoomChatMessage[]>(() => {
    if (!room) return [];
    return [...chatRows]
      .filter((m) => m.roomId === room.id)
      .sort((a, b) => {
        const ax = a.createdAt.microsSinceUnixEpoch;
        const bx = b.createdAt.microsSinceUnixEpoch;
        if (ax > bx) return 1;
        if (ax < bx) return -1;
        return 0;
      })
      .map<RoomChatMessage>((m) => {
        const hex = m.senderIdentity.toHexString();
        const name = playerNameByHex.get(hex);
        return {
          id: m.id,
          authorHex: hex,
          authorName:
            name && name.length > 0 ? name : `Player-${hex.slice(0, 4)}`,
          text: m.message,
          createdAtMicros: m.createdAt.microsSinceUnixEpoch,
          isSelf: hex === identityHex,
        };
      });
  }, [chatRows, room, playerNameByHex, identityHex]);

  const sendChat = useCallback(
    async (text: string) => {
      const conn = connection.getConnection();
      if (!conn || !room) return;
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      await conn.reducers.sendChat({ roomId: room.id, message: trimmed });
    },
    [connection, room],
  );

  const setReady = useCallback(
    async (ready: boolean) => {
      const conn = connection.getConnection();
      if (!conn || !room) return;
      await conn.reducers.setReady({ roomId: room.id, isReady: ready });
    },
    [connection, room],
  );

  const selectMobile = useCallback(
    async (mobileType: MobileType) => {
      const conn = connection.getConnection();
      if (!conn || !room) return;
      await conn.reducers.selectMobile({ roomId: room.id, mobileType });
    },
    [connection, room],
  );

  const updateRoomSettings = useCallback(
    async (settings: LobbyRoomSettings) => {
      const conn = connection.getConnection();
      if (!conn || !room) return;
      await conn.reducers.updateRoomSettings({
        roomId: room.id,
        mapType: settings.mapType,
        targetScore: settings.targetScore,
        roundLimit: settings.roundLimit,
      });
    },
    [connection, room],
  );

  const startRound = useCallback(async () => {
    const conn = connection.getConnection();
    if (!conn || !room) return;
    await conn.reducers.startRound({ roomId: room.id, seed: room.seed });
  }, [connection, room]);

  const leave = useCallback(async () => {
    const conn = connection.getConnection();
    if (!conn || !room) return;
    await conn.reducers.leaveRoom({ roomId: room.id });
  }, [connection, room]);

  const isLoaded = roomReady && membersReady && chatReady && roundsReady && (activeRound === undefined || roundEventsReady);

  return {
    room,
    activeRound,
    roundEvents,
    members,
    self,
    isHost,
    chat,
    isLoaded,
    sendChat,
    setReady,
    selectMobile,
    updateRoomSettings,
    startRound,
    leave,
  };
}
