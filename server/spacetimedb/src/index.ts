import spacetimedb from './schema';
import { t, SenderError } from 'spacetimedb/server';

export { default } from './schema';

const ROOM_STATUS_WAITING = 'waiting';
const ROOM_STATUS_IN_ROUND = 'in_round';
const ROOM_STATUS_ENDED = 'ended';

const ROUND_STATUS_ACTIVE = 'active';
const ROUND_STATUS_FINISHED = 'finished';

export const init = spacetimedb.init(_ctx => {});

export const onClientConnected = spacetimedb.clientConnected(ctx => {
  const existing = ctx.db.player.identity.find(ctx.sender);
  if (existing) {
    ctx.db.player.identity.update({
      ...existing,
      isOnline: true,
      lastSeen: ctx.timestamp
    });
    return;
  }
  ctx.db.player.insert({
    identity: ctx.sender,
    name: '',
    isOnline: true,
    lastSeen: ctx.timestamp
  });
});

export const onClientDisconnected = spacetimedb.clientDisconnected(ctx => {
  const existing = ctx.db.player.identity.find(ctx.sender);
  if (!existing) return;
  ctx.db.player.identity.update({
    ...existing,
    isOnline: false,
    lastSeen: ctx.timestamp
  });
});

export const set_player_name = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new SenderError('name must not be empty');
    if (trimmed.length > 32) throw new SenderError('name must be 32 characters or fewer');

    const existing = ctx.db.player.identity.find(ctx.sender);
    if (existing) {
      ctx.db.player.identity.update({ ...existing, name: trimmed });
      return;
    }
    ctx.db.player.insert({
      identity: ctx.sender,
      name: trimmed,
      isOnline: true,
      lastSeen: ctx.timestamp
    });
  }
);

export const create_room = spacetimedb.reducer(
  { code: t.string(), seed: t.u64() },
  (ctx, { code, seed }) => {
    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length < 4 || normalizedCode.length > 8) {
      throw new SenderError('room code must be 4-8 characters');
    }

    for (const existing of ctx.db.room.room_code.filter(normalizedCode)) {
      if (existing.status !== ROOM_STATUS_ENDED) {
        throw new SenderError('room code already in use');
      }
    }

    const room = ctx.db.room.insert({
      id: 0n,
      code: normalizedCode,
      hostIdentity: ctx.sender,
      status: ROOM_STATUS_WAITING,
      seed,
      createdAt: ctx.timestamp
    });

    ctx.db.roomMember.insert({
      id: 0n,
      roomId: room.id,
      identity: ctx.sender,
      joinedAt: ctx.timestamp
    });
  }
);

export const join_room_by_code = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length === 0) throw new SenderError('room code required');

    let target = null;
    for (const candidate of ctx.db.room.room_code.filter(normalizedCode)) {
      if (candidate.status === ROOM_STATUS_WAITING) {
        target = candidate;
        break;
      }
    }
    if (!target) throw new SenderError('no joinable room with that code');

    for (const member of ctx.db.roomMember.room_member_room_id.filter(target.id)) {
      if (member.identity.toHexString() === ctx.sender.toHexString()) {
        return;
      }
    }

    ctx.db.roomMember.insert({
      id: 0n,
      roomId: target.id,
      identity: ctx.sender,
      joinedAt: ctx.timestamp
    });
  }
);

export const leave_room = spacetimedb.reducer(
  { roomId: t.u64() },
  (ctx, { roomId }) => {
    const room = ctx.db.room.id.find(roomId);
    if (!room) throw new SenderError('room not found');

    for (const member of ctx.db.roomMember.room_member_room_id.filter(roomId)) {
      if (member.identity.toHexString() === ctx.sender.toHexString()) {
        ctx.db.roomMember.id.delete(member.id);
        break;
      }
    }

    let remaining = 0;
    for (const _ of ctx.db.roomMember.room_member_room_id.filter(roomId)) {
      remaining += 1;
    }

    if (remaining === 0) {
      ctx.db.room.id.update({ ...room, status: ROOM_STATUS_ENDED });
    } else if (room.hostIdentity.toHexString() === ctx.sender.toHexString()) {
      for (const member of ctx.db.roomMember.room_member_room_id.filter(roomId)) {
        ctx.db.room.id.update({ ...room, hostIdentity: member.identity });
        break;
      }
    }
  }
);

export const start_round = spacetimedb.reducer(
  { roomId: t.u64(), seed: t.u64() },
  (ctx, { roomId, seed }) => {
    const room = ctx.db.room.id.find(roomId);
    if (!room) throw new SenderError('room not found');
    if (room.hostIdentity.toHexString() !== ctx.sender.toHexString()) {
      throw new SenderError('only the host can start a round');
    }
    if (room.status === ROOM_STATUS_IN_ROUND) {
      throw new SenderError('round already in progress');
    }

    ctx.db.round.insert({
      id: 0n,
      roomId,
      seed,
      status: ROUND_STATUS_ACTIVE,
      startedAt: ctx.timestamp,
      endedAt: undefined,
      winnerIdentity: undefined
    });

    ctx.db.room.id.update({ ...room, status: ROOM_STATUS_IN_ROUND, seed });
  }
);

export const record_round_event = spacetimedb.reducer(
  {
    roundId: t.u64(),
    tick: t.u64(),
    kind: t.string(),
    payload: t.string()
  },
  (ctx, { roundId, tick, kind, payload }) => {
    const round = ctx.db.round.id.find(roundId);
    if (!round) throw new SenderError('round not found');
    if (round.status !== ROUND_STATUS_ACTIVE) {
      throw new SenderError('round is not active');
    }

    let isMember = false;
    for (const member of ctx.db.roomMember.room_member_room_id.filter(round.roomId)) {
      if (member.identity.toHexString() === ctx.sender.toHexString()) {
        isMember = true;
        break;
      }
    }
    if (!isMember) throw new SenderError('only room members may record events');

    ctx.db.roundEvent.insert({
      id: 0n,
      roundId,
      tick,
      actorIdentity: ctx.sender,
      kind,
      payload,
      createdAt: ctx.timestamp
    });
  }
);

export const end_round = spacetimedb.reducer(
  { roundId: t.u64(), winnerIdentity: t.identity().optional() },
  (ctx, { roundId, winnerIdentity }) => {
    const round = ctx.db.round.id.find(roundId);
    if (!round) throw new SenderError('round not found');

    const room = ctx.db.room.id.find(round.roomId);
    if (!room) throw new SenderError('room not found');
    if (room.hostIdentity.toHexString() !== ctx.sender.toHexString()) {
      throw new SenderError('only the host can end a round');
    }

    ctx.db.round.id.update({
      ...round,
      status: ROUND_STATUS_FINISHED,
      endedAt: ctx.timestamp,
      winnerIdentity
    });

    ctx.db.room.id.update({ ...room, status: ROOM_STATUS_WAITING });
  }
);
