"use client";

import { useCallback, useMemo } from "react";
import { useSpacetimeDB, useTable } from "spacetimedb/react";
import type { Identity } from "spacetimedb";

import { tables } from "@/features/game/spacetime";
import type { FriendRequest, Player, RoomInvite } from "@/features/game/spacetime/module_bindings/types";

const PENDING_STATUS = "Pending";
const AWAY_AFTER_MS = 10 * 60 * 1000;

export type LobbyFriendPresence = "online" | "away" | "offline";

export type LobbyFriendView = {
  identity: Identity;
  identityHex: string;
  name: string;
  level: number;
  isOnline: boolean;
  presence: LobbyFriendPresence;
  statusLabel: string;
  lastSeenLabel: string;
};

export type IncomingFriendRequestView = {
  id: bigint;
  requesterName: string;
  createdAtMicros: bigint;
};

export type IncomingRoomInviteView = {
  id: bigint;
  roomId: bigint;
  roomCode: string;
  requesterName: string;
  createdAtMicros: bigint;
};

export function useLobbyFriends(): {
  friends: LobbyFriendView[];
  incomingRequests: IncomingFriendRequestView[];
  incomingRoomInvites: IncomingRoomInviteView[];
  requestFriend(username: string): Promise<void>;
  respondToFriendRequest(requestId: bigint, accept: boolean): Promise<void>;
  removeFriend(buddyIdentity: Identity): Promise<void>;
  sendRoomInvite(roomId: bigint, username: string): Promise<void>;
  respondToRoomInvite(inviteId: bigint, accept: boolean): Promise<void>;
  hasFriendIdentity(identity: Identity): boolean;
  hasPendingRequestForIdentity(identity: Identity): boolean;
} {
  const connection = useSpacetimeDB();
  const identity = connection.identity;

  const friendshipQuery = useMemo(() => {
    if (!identity) return tables.friendship;
    return tables.friendship.where((friendship) => friendship.ownerIdentity.eq(identity));
  }, [identity]);

  const requestQuery = useMemo(() => {
    if (!identity) return tables.friendRequest;
    return tables.friendRequest.where((request) => request.recipientIdentity.eq(identity));
  }, [identity]);

  const outgoingRequestQuery = useMemo(() => {
    if (!identity) return tables.friendRequest;
    return tables.friendRequest.where((request) => request.requesterIdentity.eq(identity));
  }, [identity]);

  const roomInviteQuery = useMemo(() => {
    if (!identity) return tables.roomInvite;
    return tables.roomInvite.where((invite) => invite.recipientIdentity.eq(identity));
  }, [identity]);

  const [friendshipRows] = useTable(friendshipQuery, { enabled: Boolean(identity) });
  const [incomingRequestRows] = useTable(requestQuery, { enabled: Boolean(identity) });
  const [outgoingRequestRows] = useTable(outgoingRequestQuery, { enabled: Boolean(identity) });
  const [incomingRoomInviteRows] = useTable(roomInviteQuery, { enabled: Boolean(identity) });
  const [players] = useTable(tables.player);
  const [rooms] = useTable(tables.room);

  const playerByHex = useMemo(() => {
    const map = new Map<string, Player>();
    for (const player of players) {
      map.set(player.identity.toHexString(), player);
    }
    return map;
  }, [players]);

  const friends = useMemo<LobbyFriendView[]>(() => {
    const now = Date.now();
    return [...friendshipRows]
      .map((friendship) => {
        const identityHex = friendship.buddyIdentity.toHexString();
        const player = playerByHex.get(identityHex);
        const name = player?.name?.trim() || `Player-${identityHex.slice(0, 4)}`;
        const lastSeenMs = player ? microsToMs(player.lastSeen.microsSinceUnixEpoch) : 0;
        const isAway = Boolean(player?.isOnline) && now - lastSeenMs > AWAY_AFTER_MS;
        const presence: LobbyFriendPresence = player?.isOnline ? (isAway ? "away" : "online") : "offline";
        return {
          identity: friendship.buddyIdentity,
          identityHex,
          name,
          level: player?.level ?? 0,
          isOnline: Boolean(player?.isOnline),
          presence,
          statusLabel: presence === "online" ? "Online" : presence === "away" ? "Away" : "Offline",
          lastSeenLabel: player ? formatLastSeen(player.lastSeen.microsSinceUnixEpoch, player.isOnline) : "Last seen unknown",
        };
      })
      .sort((a, b) => {
        const presenceRank = presenceSortRank(a.presence) - presenceSortRank(b.presence);
        if (presenceRank !== 0) return presenceRank;
        return a.name.localeCompare(b.name);
      });
  }, [friendshipRows, playerByHex]);

  const incomingRequests = useMemo<IncomingFriendRequestView[]>(() => {
    return [...incomingRequestRows]
      .filter((request) => request.status.tag === PENDING_STATUS)
      .sort(compareRequests)
      .map((request) => {
        const requesterHex = request.requesterIdentity.toHexString();
        const requester = playerByHex.get(requesterHex);
        return {
          id: request.id,
          requesterName: requester?.name?.trim() || `Player-${requesterHex.slice(0, 4)}`,
          createdAtMicros: request.createdAt.microsSinceUnixEpoch,
        };
      });
  }, [incomingRequestRows, playerByHex]);

  const incomingRoomInvites = useMemo<IncomingRoomInviteView[]>(() => {
    return [...incomingRoomInviteRows]
      .filter((invite) => invite.status.tag === PENDING_STATUS)
      .sort(compareRoomInvites)
      .map((invite) => {
        const requesterHex = invite.requesterIdentity.toHexString();
        const requester = playerByHex.get(requesterHex);
        const room = rooms.find((candidate) => candidate.id === invite.roomId);
        return {
          id: invite.id,
          roomId: invite.roomId,
          roomCode: room?.code ?? invite.roomId.toString(),
          requesterName: requester?.name?.trim() || `Player-${requesterHex.slice(0, 4)}`,
          createdAtMicros: invite.createdAt.microsSinceUnixEpoch,
        };
      });
  }, [incomingRoomInviteRows, playerByHex, rooms]);

  const requestFriend = useCallback(
    async (username: string): Promise<void> => {
      const conn = connection.getConnection();
      if (!conn) throw new Error("not connected");
      await conn.reducers.sendFriendRequest({ username: username.trim() });
    },
    [connection],
  );

  const respondToFriendRequest = useCallback(
    async (requestId: bigint, accept: boolean): Promise<void> => {
      const conn = connection.getConnection();
      if (!conn) throw new Error("not connected");
      await conn.reducers.respondFriendRequest({ requestId, accept });
    },
    [connection],
  );

  const removeFriend = useCallback(
    async (buddyIdentity: Identity): Promise<void> => {
      const conn = connection.getConnection();
      if (!conn) throw new Error("not connected");
      await conn.reducers.removeFriend({ buddyIdentity });
    },
    [connection],
  );

  const sendRoomInvite = useCallback(
    async (roomId: bigint, username: string): Promise<void> => {
      const conn = connection.getConnection();
      if (!conn) throw new Error("not connected");
      await conn.reducers.sendRoomInvite({ roomId, username: username.trim() });
    },
    [connection],
  );

  const respondToRoomInvite = useCallback(
    async (inviteId: bigint, accept: boolean): Promise<void> => {
      const conn = connection.getConnection();
      if (!conn) throw new Error("not connected");
      await conn.reducers.respondRoomInvite({ inviteId, accept });
    },
    [connection],
  );

  const hasFriendIdentity = useCallback(
    (target: Identity): boolean => friends.some((friend) => friend.identityHex === target.toHexString()),
    [friends],
  );

  const hasPendingRequestForIdentity = useCallback(
    (target: Identity): boolean => {
      const targetHex = target.toHexString();
      return outgoingRequestRows.some(
        (request) => request.recipientIdentity.toHexString() === targetHex && request.status.tag === PENDING_STATUS,
      );
    },
    [outgoingRequestRows],
  );

  return {
    friends,
    incomingRequests,
    incomingRoomInvites,
    requestFriend,
    respondToFriendRequest,
    removeFriend,
    sendRoomInvite,
    respondToRoomInvite,
    hasFriendIdentity,
    hasPendingRequestForIdentity,
  };
}

function compareRequests(a: FriendRequest, b: FriendRequest): number {
  const ax = a.createdAt.microsSinceUnixEpoch;
  const bx = b.createdAt.microsSinceUnixEpoch;
  if (ax > bx) return 1;
  if (ax < bx) return -1;
  return 0;
}

function compareRoomInvites(a: RoomInvite, b: RoomInvite): number {
  const ax = a.createdAt.microsSinceUnixEpoch;
  const bx = b.createdAt.microsSinceUnixEpoch;
  if (ax > bx) return 1;
  if (ax < bx) return -1;
  return 0;
}

function presenceSortRank(presence: LobbyFriendPresence): number {
  if (presence === "online") return 0;
  if (presence === "away") return 1;
  return 2;
}

function microsToMs(micros: bigint): number {
  return Number(micros / BigInt(1000));
}

function formatLastSeen(micros: bigint, isOnline: boolean): string {
  if (isOnline) return "Active now";
  const elapsedMs = Date.now() - microsToMs(micros);
  if (elapsedMs < 60_000) return "Last seen just now";
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Last seen ${days}d ago`;
}
