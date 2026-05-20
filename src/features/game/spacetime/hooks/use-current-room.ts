'use client';

import { useMemo } from 'react';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';

import { tables } from '../module_bindings';
import { ROOM_STATUS } from '../room-status';
import type { Room, RoomMember } from '../module_bindings/types';

type UseCurrentRoomResult = {
  room: Room | undefined;
  members: readonly RoomMember[];
  isReady: boolean;
};

export function useCurrentRoom(): UseCurrentRoomResult {
  const connection = useSpacetimeDB();
  const identity = connection.identity;

  const membershipQuery = useMemo(() => {
    if (!identity) return tables.roomMember;
    return tables.roomMember.where(row => row.identity.eq(identity));
  }, [identity]);

  const [memberRows, memberReady] = useTable(membershipQuery, {
    enabled: Boolean(identity)
  });

  const myMembership = useMemo(() => {
    if (!identity) return undefined;
    return memberRows.find(
      row => row.identity.toHexString() === identity.toHexString()
    );
  }, [memberRows, identity]);

  const roomQuery = useMemo(() => {
    if (!myMembership) return tables.room;
    return tables.room.where(row => row.id.eq(myMembership.roomId));
  }, [myMembership]);

  const [roomRows, roomReady] = useTable(roomQuery, {
    enabled: Boolean(myMembership)
  });

  const room = useMemo(() => {
    if (!myMembership) return undefined;
    return roomRows.find(
      r => r.id === myMembership.roomId && r.status !== ROOM_STATUS.ENDED
    );
  }, [roomRows, myMembership]);

  const allMembersQuery = useMemo(() => {
    if (!room) return tables.roomMember;
    return tables.roomMember.where(row => row.roomId.eq(room.id));
  }, [room]);

  const [allMembers, allMembersReady] = useTable(allMembersQuery, {
    enabled: Boolean(room)
  });

  const members = useMemo(() => {
    if (!room) return [];
    return allMembers.filter(m => m.roomId === room.id);
  }, [allMembers, room]);

  const isReady = memberReady && (!myMembership || (roomReady && allMembersReady));

  return { room, members, isReady };
}
