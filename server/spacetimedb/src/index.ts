import spacetimedb from './schema';
import { t, SenderError } from 'spacetimedb/server';
import type { Identity } from 'spacetimedb';
import type { InferSchema, ReducerCtx } from 'spacetimedb/server';
import { ROOM_STATUS } from '../../../src/features/game/spacetime/room-status';

export { default } from './schema';

type ModuleContext = ReducerCtx<InferSchema<typeof spacetimedb>>;

const ROUND_STATUS_ACTIVE = 'active';
const ROUND_STATUS_FINISHED = 'finished';
const FRIEND_REQUEST_STATUS_PENDING = 'pending';
const FRIEND_REQUEST_STATUS_ACCEPTED = 'accepted';
const FRIEND_REQUEST_STATUS_DECLINED = 'declined';
const ROOM_INVITE_STATUS_PENDING = 'pending';
const ROOM_INVITE_STATUS_ACCEPTED = 'accepted';
const ROOM_INVITE_STATUS_DECLINED = 'declined';

const ROOM_MAX_MEMBERS = 2;
const DEFAULT_MAP_TYPE = 'rolling';
const DEFAULT_TARGET_SCORE = 2;
const DEFAULT_ROUND_LIMIT = 5;
const MIN_TARGET_SCORE = 1;
const MAX_TARGET_SCORE = 9;
const MIN_ROUND_LIMIT = 1;
const MAX_ROUND_LIMIT = 15;
const CHAT_MESSAGE_MAX_LENGTH = 200;
const LOBBY_CHANNEL_MIN = 1;
const LOBBY_CHANNEL_MAX = 8;
const MICROS_PER_DAY = 86_400n * 1_000_000n;
const EMPTY_DATA_SETTING_KEY = 'empty_data_enabled';
const BOOTSTRAP_ADMIN_USERNAMES = new Set(['remco', 'remcostoeten']);

const VALID_MOBILE_TYPES = new Set([
  'armor', 'knight', 'dragon', 'snow', 'trico', 'aduko',
  'mage', 'nak', 'turtle', 'frog', 'sate'
]);
const VALID_MAP_TYPES = new Set(['rolling', 'canyon', 'crater', 'ridge']);

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const ENCRYPTED_TOKEN_MAX_LENGTH = 2048;

function isBootstrapAdminUsername(username: string): boolean {
  return BOOTSTRAP_ADMIN_USERNAMES.has(username.trim().toLowerCase());
}

function hasBootstrapAdminCredential(ctx: ModuleContext, identity: { toHexString(): string }): boolean {
  const target = identity.toHexString();
  for (const credential of ctx.db.credential.iter()) {
    if (
      credential.identity.toHexString() === target &&
      isBootstrapAdminUsername(credential.username)
    ) {
      return true;
    }
  }
  return false;
}

function isAdmin(ctx: ModuleContext): boolean {
  const player = ctx.db.player.identity.find(ctx.sender);
  return player?.isAdmin === true || hasBootstrapAdminCredential(ctx, ctx.sender);
}

function assertAdmin(ctx: ModuleContext): void {
  if (!isAdmin(ctx)) throw new SenderError('admin privileges required');
}

function upsertEmptyDataSetting(ctx: ModuleContext, enabled: boolean): void {
  const value = enabled ? 'true' : 'false';
  const existing = ctx.db.appSetting.key.find(EMPTY_DATA_SETTING_KEY);

  if (existing) {
    ctx.db.appSetting.key.update({
      ...existing,
      value,
      updatedBy: ctx.sender,
      updatedAt: ctx.timestamp
    });
    return;
  }

  ctx.db.appSetting.insert({
    key: EMPTY_DATA_SETTING_KEY,
    value,
    updatedBy: ctx.sender,
    updatedAt: ctx.timestamp
  });
}

function isqrt(n: bigint): bigint {
  if (n <= 0n) return 0n;
  let x = BigInt(Math.floor(Math.sqrt(Number(n))));
  while (x * x > n) x -= 1n;
  while ((x + 1n) * (x + 1n) <= n) x += 1n;
  return x;
}

function computeLevel(xp: bigint): number {
  return Number(isqrt(xp / 50n));
}

function computeRoundXp(isWinner: boolean, isDraw: boolean, damageDealt: number, directHits: number): number {
  const base = isWinner ? 100 : (isDraw ? 30 : 20);
  const damageBonus = Math.min(Math.floor(damageDealt / 10), 100);
  const accuracyBonus = Math.min(directHits, 10) * 5;
  return base + damageBonus + accuracyBonus;
}

function isActiveRoomStatus(status: string): boolean {
  return status !== ROOM_STATUS.ENDED;
}

function isRoomLockedForMatch(status: string): boolean {
  return status === ROOM_STATUS.STARTING || status === ROOM_STATUS.IN_MATCH;
}

function findActiveRoomMembership(ctx: ModuleContext): { roomId: bigint } | null {
  for (const member of ctx.db.roomMember.room_member_identity.filter(ctx.sender)) {
    const room = ctx.db.room.id.find(member.roomId);
    if (room && isActiveRoomStatus(room.status)) {
      return { roomId: member.roomId };
    }
  }
  return null;
}

function assertNotInActiveRoom(ctx: ModuleContext): void {
  if (findActiveRoomMembership(ctx)) {
    throw new SenderError('leave your current room before joining another');
  }
}

function identitiesMatch(a: Identity, b: Identity): boolean {
  return a.toHexString() === b.toHexString();
}

function findFriendship(ctx: ModuleContext, ownerIdentity: Identity, buddyIdentity: Identity) {
  const buddyHex = buddyIdentity.toHexString();
  for (const friendship of ctx.db.friendship.friendship_owner.filter(ownerIdentity)) {
    if (friendship.buddyIdentity.toHexString() === buddyHex) return friendship;
  }
  return null;
}

function findPendingFriendRequest(ctx: ModuleContext, requesterIdentity: Identity, recipientIdentity: Identity) {
  const recipientHex = recipientIdentity.toHexString();
  for (const request of ctx.db.friendRequest.friend_request_requester.filter(requesterIdentity)) {
    if (
      request.recipientIdentity.toHexString() === recipientHex &&
      request.status === FRIEND_REQUEST_STATUS_PENDING
    ) {
      return request;
    }
  }
  return null;
}

function findPendingRoomInvite(ctx: ModuleContext, roomId: bigint, requesterIdentity: Identity, recipientIdentity: Identity) {
  const requesterHex = requesterIdentity.toHexString();
  const recipientHex = recipientIdentity.toHexString();
  for (const invite of ctx.db.roomInvite.room_invite_room_id.filter(roomId)) {
    if (
      invite.requesterIdentity.toHexString() === requesterHex &&
      invite.recipientIdentity.toHexString() === recipientHex &&
      invite.status === ROOM_INVITE_STATUS_PENDING
    ) {
      return invite;
    }
  }
  return null;
}

function ensureFriendship(ctx: ModuleContext, ownerIdentity: Identity, buddyIdentity: Identity): void {
  if (findFriendship(ctx, ownerIdentity, buddyIdentity)) return;
  ctx.db.friendship.insert({
    id: 0n,
    ownerIdentity,
    buddyIdentity,
    createdAt: ctx.timestamp
  });
}

function getNextRoomSlotIndex(ctx: ModuleContext, roomId: bigint): number {
  const used = new Set<number>();
  for (const member of ctx.db.roomMember.room_member_room_id.filter(roomId)) {
    used.add(member.slotIndex);
  }

  let slot = 0;
  while (slot < ROOM_MAX_MEMBERS) {
    if (!used.has(slot)) return slot;
    slot += 1;
  }

  throw new SenderError('room is full');
}

function insertPlayer(ctx: ModuleContext, name: string): void {
  const currentDay = ctx.timestamp.microsSinceUnixEpoch / MICROS_PER_DAY;
  ctx.db.player.insert({
    identity: ctx.sender,
    name,
    createdAt: ctx.timestamp,
    updatedAt: ctx.timestamp,
    displayNameSetAt: name.length > 0 ? ctx.timestamp : undefined,
    isOnline: true,
    lastSeen: ctx.timestamp,
    xp: 0n,
    level: 0,
    loginStreak: 1,
    longestStreak: 1,
    lastLoginDay: currentDay,
    totalWins: 0,
    totalLosses: 0,
    totalRoundsPlayed: 0,
    isAdmin: hasBootstrapAdminCredential(ctx, ctx.sender)
  });
}

function setPlayerDisplayName(ctx: ModuleContext, name: string): void {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new SenderError('name must not be empty');
  if (trimmed.length > 32) throw new SenderError('name must be 32 characters or fewer');

  const existing = ctx.db.player.identity.find(ctx.sender);
  if (existing) {
    ctx.db.player.identity.update({
      ...existing,
      name: trimmed,
      updatedAt: ctx.timestamp,
      displayNameSetAt: ctx.timestamp
    });
    return;
  }

  insertPlayer(ctx, trimmed);
}

export const init = spacetimedb.init(ctx => {
  if (!ctx.db.appSetting.key.find(EMPTY_DATA_SETTING_KEY)) {
    ctx.db.appSetting.insert({
      key: EMPTY_DATA_SETTING_KEY,
      value: 'false',
      updatedBy: undefined,
      updatedAt: ctx.timestamp
    });
  }
});

/**
 * Upserts the `player` row for the connecting identity.
 *
 * First-time connections create the row with an empty `name`; reconnects
 * just flip presence to online. We never delete `player` rows — friends
 * keep their slot across sessions so their display name and history stick.
 */
export const onClientConnected = spacetimedb.clientConnected(ctx => {
  const currentDay = ctx.timestamp.microsSinceUnixEpoch / MICROS_PER_DAY;
  const existing = ctx.db.player.identity.find(ctx.sender);

  if (existing) {
    let { loginStreak, longestStreak, xp, level } = existing;

    if (existing.lastLoginDay !== currentDay) {
      loginStreak = existing.lastLoginDay === currentDay - 1n ? loginStreak + 1 : 1;
      longestStreak = Math.max(longestStreak, loginStreak);

      const streakBonus = BigInt(Math.min(loginStreak, 30) * 3);
      xp += streakBonus;
      level = computeLevel(xp);
    }

    ctx.db.player.identity.update({
      ...existing,
      updatedAt: ctx.timestamp,
      isOnline: true,
      lastSeen: ctx.timestamp,
      loginStreak,
      longestStreak,
      lastLoginDay: currentDay,
      xp,
      level,
      isAdmin: existing.isAdmin || hasBootstrapAdminCredential(ctx, ctx.sender)
    });
    return;
  }

  insertPlayer(ctx, '');
});

/**
 * Marks the player offline and stamps `lastSeen`.
 *
 * Room/round membership is intentionally preserved so the player can
 * reconnect mid-match without losing their seat; cleanup of empty rooms
 * is driven by `leave_room`, not by disconnect.
 */
export const onClientDisconnected = spacetimedb.clientDisconnected(ctx => {
  const existing = ctx.db.player.identity.find(ctx.sender);
  if (!existing) return;
  ctx.db.player.identity.update({
    ...existing,
    updatedAt: ctx.timestamp,
    isOnline: false,
    lastSeen: ctx.timestamp
  });
});

/**
 * Sets the caller's profile data.
 *
 * Trims whitespace and enforces a 1-32 character bound so room rosters and
 * HUD overlays stay readable. Creates the player row if the rename arrives
 * before the lifecycle hook has fired (shouldn't happen in practice, but
 * the upsert keeps the reducer safe to retry).
 */
export const set_player_profile = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    setPlayerDisplayName(ctx, name);
  }
);

/**
 * Compatibility alias for existing clients. New code should call
 * `set_player_profile` so profile fields can grow without another rename.
 */
export const set_player_name = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    setPlayerDisplayName(ctx, name);
  }
);

/**
 * Admin-only: toggles whether lobby fixture data should be hidden.
 *
 * This replaces the old client-side `NEXT_PUBLIC_EMPTY_DATA` flag with
 * runtime server state so an admin can change it without rebuilding.
 */
export const set_empty_data_enabled = spacetimedb.reducer(
  { enabled: t.bool() },
  (ctx, { enabled }) => {
    assertAdmin(ctx);
    upsertEmptyDataSetting(ctx, enabled);
  }
);

/**
 * Creates a new room owned by the caller and adds them as the first member.
 *
 * Codes are normalized to uppercase and bounded to 4-8 characters so they
 * stay easy to type and share verbally. Uniqueness is only enforced against
 * rooms that are still active (`waiting`, `starting`, or `in_match`) — once a room ends,
 * its code becomes free again so friends can reuse memorable strings.
 */
export const create_room = spacetimedb.reducer(
  { code: t.string(), seed: t.u64() },
  (ctx, { code, seed }) => {
    assertNotInActiveRoom(ctx);

    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length < 4 || normalizedCode.length > 8) {
      throw new SenderError('room code must be 4-8 characters');
    }

    for (const existing of ctx.db.room.room_code.filter(normalizedCode)) {
      if (existing.status !== ROOM_STATUS.ENDED) {
        throw new SenderError('room code already in use');
      }
    }

    const room = ctx.db.room.insert({
      id: 0n,
      code: normalizedCode,
      hostIdentity: ctx.sender,
      status: ROOM_STATUS.WAITING,
      seed,
      mapType: DEFAULT_MAP_TYPE,
      targetScore: DEFAULT_TARGET_SCORE,
      roundLimit: DEFAULT_ROUND_LIMIT,
      createdAt: ctx.timestamp
    });

    ctx.db.roomMember.insert({
      id: 0n,
      roomId: room.id,
      identity: ctx.sender,
      slotIndex: 0,
      teamIndex: undefined,
      mobileType: '',
      isReady: false,
      joinedAt: ctx.timestamp
    });
  }
);

/**
 * Host-only: updates the room rules while the lobby is waiting.
 */
export const update_room_settings = spacetimedb.reducer(
  { roomId: t.u64(), mapType: t.string(), targetScore: t.u32(), roundLimit: t.u32() },
  (ctx, { roomId, mapType, targetScore, roundLimit }) => {
    if (!VALID_MAP_TYPES.has(mapType)) throw new SenderError('unknown map type');
    if (targetScore < MIN_TARGET_SCORE || targetScore > MAX_TARGET_SCORE) {
      throw new SenderError(`target score must be ${MIN_TARGET_SCORE}-${MAX_TARGET_SCORE}`);
    }
    if (roundLimit < MIN_ROUND_LIMIT || roundLimit > MAX_ROUND_LIMIT) {
      throw new SenderError(`round limit must be ${MIN_ROUND_LIMIT}-${MAX_ROUND_LIMIT}`);
    }

    const room = ctx.db.room.id.find(roomId);
    if (!room) throw new SenderError('room not found');
    if (room.hostIdentity.toHexString() !== ctx.sender.toHexString()) {
      throw new SenderError('only the host can update room settings');
    }
    if (room.status !== ROOM_STATUS.WAITING) {
      throw new SenderError('room settings are locked once a match starts');
    }

    ctx.db.room.id.update({
      ...room,
      mapType,
      targetScore,
      roundLimit
    });
  }
);

/**
 * Joins the caller into a room by its shared code.
 *
 * Only rooms in `waiting` status are joinable — rooms already in a round
 * are locked so latecomers don't desync the simulation. The reducer is
 * idempotent: if the caller is already a member, it returns silently so
 * a duplicate UI click or websocket retry doesn't error.
 */
export const join_room_by_code = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length === 0) throw new SenderError('room code required');

    let target = null;
    for (const candidate of ctx.db.room.room_code.filter(normalizedCode)) {
      if (candidate.status === ROOM_STATUS.WAITING) {
        target = candidate;
        break;
      }
    }
    if (!target) throw new SenderError('no joinable room with that code');

    const currentMembership = findActiveRoomMembership(ctx);
    if (currentMembership) {
      if (currentMembership.roomId === target.id) return;
      throw new SenderError('leave your current room before joining another');
    }

    let memberCount = 0;
    for (const member of ctx.db.roomMember.room_member_room_id.filter(target.id)) {
      memberCount += 1;
    }

    if (memberCount >= ROOM_MAX_MEMBERS) {
      throw new SenderError('room is full');
    }

    ctx.db.roomMember.insert({
      id: 0n,
      roomId: target.id,
      identity: ctx.sender,
      slotIndex: getNextRoomSlotIndex(ctx, target.id),
      teamIndex: undefined,
      mobileType: '',
      isReady: false,
      joinedAt: ctx.timestamp
    });
  }
);

/**
 * Removes the caller from a room and runs ownership/lifecycle cleanup.
 *
 * Three follow-on cases, evaluated in order:
 *   1. If no members remain, the room is moved to `ended` so its code is
 *      freed for reuse and clients can drop their subscriptions.
 *   2. Otherwise, if the leaving member was the host, host is transferred
 *      to an arbitrary remaining member so the room stays controllable.
 *   3. Otherwise, no further state changes — non-host departure is silent.
 *
 * Round state (if any) is intentionally left untouched; the host decides
 * via `end_round` whether to abort or let the remaining players continue.
 */
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
      ctx.db.room.id.update({ ...room, status: ROOM_STATUS.ENDED });
    } else if (room.hostIdentity.toHexString() === ctx.sender.toHexString()) {
      for (const member of ctx.db.roomMember.room_member_room_id.filter(roomId)) {
        ctx.db.room.id.update({ ...room, hostIdentity: member.identity });
        break;
      }
    }
  }
);

/**
 * Host-only: opens a new active round inside an existing room.
 *
 * Stamps the round with the caller-supplied `seed` and mirrors it onto the
 * room so all subscribers — including any reconnecting late-joiners — see
 * the same RNG seed without waiting on the round subscription to settle.
 * Refuses to start if a round is already in progress; the host must
 * `end_round` first to keep the per-room round history linear.
 */
export const start_round = spacetimedb.reducer(
  { roomId: t.u64(), seed: t.u64() },
  (ctx, { roomId, seed }) => {
    const room = ctx.db.room.id.find(roomId);
    if (!room) throw new SenderError('room not found');
    if (room.hostIdentity.toHexString() !== ctx.sender.toHexString()) {
      throw new SenderError('only the host can start a round');
    }
    if (isRoomLockedForMatch(room.status)) {
      throw new SenderError('round already in progress');
    }

    let memberCount = 0;
    for (const member of ctx.db.roomMember.room_member_room_id.filter(roomId)) {
      if (!member.isReady) throw new SenderError('all members must be ready before starting');
      if (member.mobileType === '') throw new SenderError('all members must select a mobile before starting');
      memberCount += 1;
    }
    if (memberCount < ROOM_MAX_MEMBERS) throw new SenderError('waiting for all players to join');

    ctx.db.round.insert({
      id: 0n,
      roomId,
      seed,
      status: ROUND_STATUS_ACTIVE,
      startedAt: ctx.timestamp,
      endedAt: undefined,
      winnerIdentity: undefined
    });

    ctx.db.room.id.update({ ...room, status: ROOM_STATUS.IN_MATCH, seed });
  }
);

/**
 * Appends a single deterministic event to a round's history.
 *
 * Authorization: caller must be a member of the round's room. The reducer
 * intentionally does not validate `tick` ordering or `kind`/`payload`
 * contents — events are an append-only stream and the client-side replay
 * is responsible for sorting and interpreting them. Keeping this surface
 * small lets gameplay evolve without server redeploys.
 *
 * Rejects events for non-active rounds so finished history is immutable.
 */
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

/**
 * Host-only: closes an active round and returns the room to `waiting`.
 *
 * Stamps `endedAt` and an optional `winnerIdentity` (left undefined for
 * draws or aborts). The round row itself is kept for history — clients
 * can replay it from the `round_event` stream. The parent room is moved
 * back to `waiting` so the same lobby can immediately start another
 * round without forcing everyone to rejoin.
 */
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

    const isDraw = winnerIdentity === undefined;

    for (const member of ctx.db.roomMember.room_member_room_id.filter(round.roomId)) {
      const player = ctx.db.player.identity.find(member.identity);
      if (!player) continue;

      const isWinner = !isDraw && member.identity.toHexString() === winnerIdentity!.toHexString();

      let damageDealt = 0;
      let shotsFired = 0;
      let directHits = 0;
      let statRow = null;
      for (const stat of ctx.db.roundStat.round_stat_round_id.filter(round.id)) {
        if (stat.playerIdentity.toHexString() === member.identity.toHexString()) {
          damageDealt = stat.damageDealt;
          shotsFired = stat.shotsFired;
          directHits = stat.directHits;
          statRow = stat;
          break;
        }
      }

      const xpEarned = computeRoundXp(isWinner, isDraw, damageDealt, directHits);
      const newXp = player.xp + BigInt(xpEarned);
      const newLevel = computeLevel(newXp);

      ctx.db.player.identity.update({
        ...player,
        updatedAt: ctx.timestamp,
        xp: newXp,
        level: newLevel,
        totalWins: isWinner ? player.totalWins + 1 : player.totalWins,
        totalLosses: !isWinner && !isDraw ? player.totalLosses + 1 : player.totalLosses,
        totalRoundsPlayed: player.totalRoundsPlayed + 1
      });

      if (statRow !== null) {
        ctx.db.roundStat.id.update({ ...statRow, xpAwarded: xpEarned });
      }

      ctx.db.roomMember.id.update({ ...member, isReady: false });
    }

    ctx.db.room.id.update({ ...room, status: ROOM_STATUS.WAITING });
  }
);

/**
 * Records the caller's end-of-round stats for XP calculation.
 *
 * Must be called before `end_round`. The server trusts the reported numbers —
 * this is intentional for a friend-game context where cheat resistance is not
 * a design goal. Each player may only submit once per round; duplicates are
 * rejected. If a player never submits, `end_round` awards base win/loss XP
 * with zero damage/accuracy bonuses.
 */
export const submit_round_stats = spacetimedb.reducer(
  { roundId: t.u64(), damageDealt: t.u32(), shotsFired: t.u32(), directHits: t.u32() },
  (ctx, { roundId, damageDealt, shotsFired, directHits }) => {
    const round = ctx.db.round.id.find(roundId);
    if (!round) throw new SenderError('round not found');
    if (round.status !== ROUND_STATUS_ACTIVE) throw new SenderError('round is not active');

    let isMember = false;
    for (const member of ctx.db.roomMember.room_member_room_id.filter(round.roomId)) {
      if (member.identity.toHexString() === ctx.sender.toHexString()) {
        isMember = true;
        break;
      }
    }
    if (!isMember) throw new SenderError('only room members may submit stats');

    for (const stat of ctx.db.roundStat.round_stat_round_id.filter(roundId)) {
      if (stat.playerIdentity.toHexString() === ctx.sender.toHexString()) {
        throw new SenderError('stats already submitted for this round');
      }
    }

    ctx.db.roundStat.insert({
      id: 0n,
      roundId,
      playerIdentity: ctx.sender,
      damageDealt,
      shotsFired,
      directHits,
      xpAwarded: 0
    });
  }
);

/**
 * Sends a chat message scoped to a room.
 *
 * Visible in both lobby (`waiting`) and in-round states so players can
 * coordinate before and during a match. Membership is required — spectators
 * cannot chat. Messages are capped at 200 characters to keep the rendered
 * history readable without truncation surprises on the client.
 */
export const send_chat = spacetimedb.reducer(
  { roomId: t.u64(), message: t.string() },
  (ctx, { roomId, message }) => {
    const trimmed = message.trim();
    if (trimmed.length === 0) throw new SenderError('message must not be empty');
    if (trimmed.length > CHAT_MESSAGE_MAX_LENGTH) {
      throw new SenderError(`message must be ${CHAT_MESSAGE_MAX_LENGTH} characters or fewer`);
    }

    const room = ctx.db.room.id.find(roomId);
    if (!room || room.status === ROOM_STATUS.ENDED) throw new SenderError('room not found');

    let isMember = false;
    for (const member of ctx.db.roomMember.room_member_room_id.filter(roomId)) {
      if (member.identity.toHexString() === ctx.sender.toHexString()) {
        isMember = true;
        break;
      }
    }
    if (!isMember) throw new SenderError('only room members may chat');

    ctx.db.chatMessage.insert({
      id: 0n,
      roomId,
      senderIdentity: ctx.sender,
      message: trimmed,
      createdAt: ctx.timestamp
    });
  }
);

/**
 * Sends a public lobby message to one of the numbered lobby channels.
 *
 * This is intentionally independent from room chat so channel history remains
 * available after a player leaves rooms, logs out, or reconnects later.
 */
export const send_lobby_chat = spacetimedb.reducer(
  { channel: t.u32(), message: t.string() },
  (ctx, { channel, message }) => {
    const trimmed = message.trim();
    if (channel < LOBBY_CHANNEL_MIN || channel > LOBBY_CHANNEL_MAX) {
      throw new SenderError('invalid lobby channel');
    }
    if (trimmed.length === 0) throw new SenderError('message must not be empty');
    if (trimmed.length > CHAT_MESSAGE_MAX_LENGTH) {
      throw new SenderError(`message must be ${CHAT_MESSAGE_MAX_LENGTH} characters or fewer`);
    }

    const player = ctx.db.player.identity.find(ctx.sender);
    if (!player || player.name.trim().length === 0) {
      throw new SenderError('set a player name before chatting');
    }

    ctx.db.lobbyChatMessage.insert({
      id: 0n,
      channel,
      senderIdentity: ctx.sender,
      message: trimmed,
      createdAt: ctx.timestamp
    });
  }
);

export const send_friend_request = spacetimedb.reducer(
  { username: t.string() },
  (ctx, { username }) => {
    const trimmed = username.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      throw new SenderError('username must be 3-20 characters: letters, digits, underscore');
    }

    const credential = ctx.db.credential.username.find(trimmed);
    if (!credential) throw new SenderError('user not found');
    if (identitiesMatch(credential.identity, ctx.sender)) {
      throw new SenderError('cannot add yourself');
    }
    if (findFriendship(ctx, ctx.sender, credential.identity)) {
      throw new SenderError('already buddies');
    }
    if (findPendingFriendRequest(ctx, ctx.sender, credential.identity)) {
      throw new SenderError('friend request already sent');
    }

    const reciprocal = findPendingFriendRequest(ctx, credential.identity, ctx.sender);
    if (reciprocal) {
      ctx.db.friendRequest.id.update({
        ...reciprocal,
        status: FRIEND_REQUEST_STATUS_ACCEPTED,
        resolvedAt: ctx.timestamp
      });
      ensureFriendship(ctx, ctx.sender, credential.identity);
      ensureFriendship(ctx, credential.identity, ctx.sender);
      return;
    }

    ctx.db.friendRequest.insert({
      id: 0n,
      requesterIdentity: ctx.sender,
      recipientIdentity: credential.identity,
      status: FRIEND_REQUEST_STATUS_PENDING,
      createdAt: ctx.timestamp,
      resolvedAt: undefined
    });
  }
);

export const respond_friend_request = spacetimedb.reducer(
  { requestId: t.u64(), accept: t.bool() },
  (ctx, { requestId, accept }) => {
    const request = ctx.db.friendRequest.id.find(requestId);
    if (!request || request.status !== FRIEND_REQUEST_STATUS_PENDING) {
      throw new SenderError('friend request not found');
    }
    if (!identitiesMatch(request.recipientIdentity, ctx.sender)) {
      throw new SenderError('only the recipient can respond');
    }

    ctx.db.friendRequest.id.update({
      ...request,
      status: accept ? FRIEND_REQUEST_STATUS_ACCEPTED : FRIEND_REQUEST_STATUS_DECLINED,
      resolvedAt: ctx.timestamp
    });

    if (!accept) return;
    ensureFriendship(ctx, request.requesterIdentity, request.recipientIdentity);
    ensureFriendship(ctx, request.recipientIdentity, request.requesterIdentity);
  }
);

export const remove_friend = spacetimedb.reducer(
  { buddyIdentity: t.identity() },
  (ctx, { buddyIdentity }) => {
    const ownEdge = findFriendship(ctx, ctx.sender, buddyIdentity);
    if (ownEdge) ctx.db.friendship.id.delete(ownEdge.id);

    const reciprocalEdge = findFriendship(ctx, buddyIdentity, ctx.sender);
    if (reciprocalEdge) ctx.db.friendship.id.delete(reciprocalEdge.id);
  }
);

export const send_room_invite = spacetimedb.reducer(
  { roomId: t.u64(), username: t.string() },
  (ctx, { roomId, username }) => {
    const trimmed = username.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      throw new SenderError('username must be 3-20 characters: letters, digits, underscore');
    }

    const room = ctx.db.room.id.find(roomId);
    if (!room || !isActiveRoomStatus(room.status)) throw new SenderError('room not found');
    if (isRoomLockedForMatch(room.status)) throw new SenderError('cannot invite during an active round');

    let isMember = false;
    for (const member of ctx.db.roomMember.room_member_room_id.filter(roomId)) {
      if (identitiesMatch(member.identity, ctx.sender)) {
        isMember = true;
        break;
      }
    }
    if (!isMember) throw new SenderError('only room members can invite');

    const credential = ctx.db.credential.username.find(trimmed);
    if (!credential) throw new SenderError('user not found');
    if (identitiesMatch(credential.identity, ctx.sender)) throw new SenderError('cannot invite yourself');

    for (const member of ctx.db.roomMember.room_member_room_id.filter(roomId)) {
      if (identitiesMatch(member.identity, credential.identity)) {
        throw new SenderError('user is already in this room');
      }
    }
    if (findPendingRoomInvite(ctx, roomId, ctx.sender, credential.identity)) {
      throw new SenderError('room invite already sent');
    }

    ctx.db.roomInvite.insert({
      id: 0n,
      roomId,
      requesterIdentity: ctx.sender,
      recipientIdentity: credential.identity,
      status: ROOM_INVITE_STATUS_PENDING,
      createdAt: ctx.timestamp,
      resolvedAt: undefined
    });
  }
);

export const respond_room_invite = spacetimedb.reducer(
  { inviteId: t.u64(), accept: t.bool() },
  (ctx, { inviteId, accept }) => {
    const invite = ctx.db.roomInvite.id.find(inviteId);
    if (!invite || invite.status !== ROOM_INVITE_STATUS_PENDING) {
      throw new SenderError('room invite not found');
    }
    if (!identitiesMatch(invite.recipientIdentity, ctx.sender)) {
      throw new SenderError('only the recipient can respond');
    }

    ctx.db.roomInvite.id.update({
      ...invite,
      status: accept ? ROOM_INVITE_STATUS_ACCEPTED : ROOM_INVITE_STATUS_DECLINED,
      resolvedAt: ctx.timestamp
    });

    if (!accept) return;

    const room = ctx.db.room.id.find(invite.roomId);
    if (!room || !isActiveRoomStatus(room.status)) throw new SenderError('room not found');
    if (isRoomLockedForMatch(room.status)) throw new SenderError('room is already playing');
    assertNotInActiveRoom(ctx);

    for (const member of ctx.db.roomMember.room_member_room_id.filter(invite.roomId)) {
      if (identitiesMatch(member.identity, ctx.sender)) return;
    }

    ctx.db.roomMember.insert({
      id: 0n,
      roomId: invite.roomId,
      identity: ctx.sender,
      slotIndex: getNextRoomSlotIndex(ctx, invite.roomId),
      teamIndex: undefined,
      mobileType: '',
      isReady: false,
      joinedAt: ctx.timestamp
    });
  }
);

/**
 * Sets the caller's chosen mobile for the upcoming round.
 *
 * Can be changed freely while the room is in `waiting` status but is locked
 * during an active round so mid-game mobile swaps cannot desync the
 * simulation. Both players must select before the host can start the round
 * (enforced by `start_round`).
 */
export const select_mobile = spacetimedb.reducer(
  { roomId: t.u64(), mobileType: t.string() },
  (ctx, { roomId, mobileType }) => {
    if (!VALID_MOBILE_TYPES.has(mobileType)) {
      throw new SenderError('unknown mobile type');
    }

    const room = ctx.db.room.id.find(roomId);
    if (!room) throw new SenderError('room not found');
    if (isRoomLockedForMatch(room.status)) {
      throw new SenderError('cannot change mobile during an active round');
    }

    for (const member of ctx.db.roomMember.room_member_room_id.filter(roomId)) {
      if (member.identity.toHexString() === ctx.sender.toHexString()) {
        ctx.db.roomMember.id.update({ ...member, mobileType });
        return;
      }
    }

    throw new SenderError('not a member of this room');
  }
);

/**
 * Toggles the caller's ready state for the next round.
 *
 * The `start_round` reducer checks that all members are ready before allowing
 * the host to begin, giving both players a chance to confirm their mobile
 * selection and wind conditions. Ready state is reset to false at round end
 * so players must explicitly re-ready for each new round.
 */
export const set_ready = spacetimedb.reducer(
  { roomId: t.u64(), isReady: t.bool() },
  (ctx, { roomId, isReady }) => {
    const room = ctx.db.room.id.find(roomId);
    if (!room) throw new SenderError('room not found');
    if (isRoomLockedForMatch(room.status)) {
      throw new SenderError('cannot change ready state during an active round');
    }

    for (const member of ctx.db.roomMember.room_member_room_id.filter(roomId)) {
      if (member.identity.toHexString() === ctx.sender.toHexString()) {
        ctx.db.roomMember.id.update({ ...member, isReady });
        return;
      }
    }

    throw new SenderError('not a member of this room');
  }
);

/**
 * Registers a new account binding the caller's identity to a chosen username.
 *
 * `encryptedToken` is the caller's SpacetimeDB session token, encrypted on
 * the client with their password. The server stores only the ciphertext; it
 * has no way to derive the password or recover the token. Usernames are the
 * primary key, so uniqueness is enforced automatically — a second register
 * with the same username will throw.
 *
 * Also sets the player's display name to the username on first registration
 * so chat and room rosters show a real name instead of a hex fallback.
 */
export const register_credential = spacetimedb.reducer(
  { username: t.string(), encryptedToken: t.string() },
  (ctx, { username, encryptedToken }) => {
    const trimmed = username.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      throw new SenderError('username must be 3-20 characters: letters, digits, underscore');
    }
    if (encryptedToken.length === 0) {
      throw new SenderError('encrypted token required');
    }
    if (encryptedToken.length > ENCRYPTED_TOKEN_MAX_LENGTH) {
      throw new SenderError(`encrypted token exceeds ${ENCRYPTED_TOKEN_MAX_LENGTH} characters`);
    }

    const existing = ctx.db.credential.username.find(trimmed);
    if (existing) {
      throw new SenderError('username already taken');
    }

    for (const row of ctx.db.credential.iter()) {
      if (row.identity.toHexString() === ctx.sender.toHexString()) {
        throw new SenderError('this identity already has a registered account');
      }
    }

    ctx.db.credential.insert({
      username: trimmed,
      identity: ctx.sender,
      encryptedToken,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp
    });

    const player = ctx.db.player.identity.find(ctx.sender);
    if (player) {
      const shouldSetName = player.name === '';
      ctx.db.player.identity.update({
        ...player,
        name: shouldSetName ? trimmed : player.name,
        updatedAt: ctx.timestamp,
        displayNameSetAt: shouldSetName ? ctx.timestamp : player.displayNameSetAt,
        isAdmin: player.isAdmin || isBootstrapAdminUsername(trimmed)
      });
    }
  }
);

/**
 * Replaces the encrypted token blob for the caller's existing credential row.
 *
 * Used when the user changes their password — the client re-encrypts the
 * stored token with the new key and pushes the new ciphertext. Only the row
 * owner (matching identity) may update; other identities cannot overwrite
 * someone else's credential.
 */
export const update_credential_token = spacetimedb.reducer(
  { username: t.string(), encryptedToken: t.string() },
  (ctx, { username, encryptedToken }) => {
    const trimmed = username.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      throw new SenderError('invalid username');
    }
    if (encryptedToken.length === 0 || encryptedToken.length > ENCRYPTED_TOKEN_MAX_LENGTH) {
      throw new SenderError('encrypted token invalid');
    }

    const existing = ctx.db.credential.username.find(trimmed);
    if (!existing) throw new SenderError('credential not found');
    if (existing.identity.toHexString() !== ctx.sender.toHexString()) {
      throw new SenderError('not the owner of this credential');
    }

    ctx.db.credential.username.update({
      ...existing,
      encryptedToken,
      updatedAt: ctx.timestamp
    });
  }
);

/**
 * Host-only: removes a member from the room by force.
 *
 * The host cannot kick themselves (they must call `leave_room` instead, which
 * triggers host transfer). Kicking during an active round is allowed — the
 * host's responsibility to handle the consequence via `end_round`.
 */
export const kick_from_room = spacetimedb.reducer(
  { roomId: t.u64(), targetIdentity: t.identity() },
  (ctx, { roomId, targetIdentity }) => {
    const room = ctx.db.room.id.find(roomId);
    if (!room) throw new SenderError('room not found');
    if (room.hostIdentity.toHexString() !== ctx.sender.toHexString()) {
      throw new SenderError('only the host can kick members');
    }
    if (targetIdentity.toHexString() === ctx.sender.toHexString()) {
      throw new SenderError('host cannot kick themselves');
    }

    for (const member of ctx.db.roomMember.room_member_room_id.filter(roomId)) {
      if (member.identity.toHexString() === targetIdentity.toHexString()) {
        ctx.db.roomMember.id.delete(member.id);
        return;
      }
    }

    throw new SenderError('target is not a member of this room');
  }
);
