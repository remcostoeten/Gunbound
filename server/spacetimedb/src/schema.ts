import { schema, table, t } from 'spacetimedb/server';

/**
 * Long-lived identity row, one per authenticated user.
 *
 * Created on first `clientConnected` and never deleted — `isOnline` and
 * `lastSeen` are flipped by the connect/disconnect lifecycle hooks so that
 * other players can see presence without needing to enumerate active sessions.
 * Display `name` starts empty and is set via the `set_player_name` reducer.
 */
export const Player = table(
  {
    name: 'player',
    public: true,
    indexes: [
      { accessor: 'player_is_online', algorithm: 'btree', columns: ['isOnline'] }
    ]
  },
  {
    identity: t.identity().primaryKey(),
    name: t.string(),
    isOnline: t.bool(),
    lastSeen: t.timestamp()
  }
);

/**
 * Invite-only lobby keyed by a short, human-shareable `code`.
 *
 * Lifecycle: `waiting` (accepting joins) → `in_round` (a round is being
 * played) → `waiting` (round ended, ready for another) → `ended` (last
 * member left). Codes are reusable across `ended` rooms — uniqueness is
 * only enforced against non-`ended` rooms in `create_room`.
 *
 * `seed` is the deterministic RNG seed for the current/most-recent round,
 * surfaced on the room itself so clients can render the lobby preview
 * without subscribing to the `round` table.
 */
export const Room = table(
  {
    name: 'room',
    public: true,
    indexes: [
      { accessor: 'room_code', algorithm: 'btree', columns: ['code'] },
      { accessor: 'room_host_identity', algorithm: 'btree', columns: ['hostIdentity'] },
      { accessor: 'room_status', algorithm: 'btree', columns: ['status'] }
    ]
  },
  {
    id: t.u64().primaryKey().autoInc(),
    code: t.string(),
    hostIdentity: t.identity(),
    status: t.string(),
    seed: t.u64(),
    createdAt: t.timestamp()
  }
);

/**
 * Join table linking a player identity to a room they currently occupy.
 *
 * One row per (room, identity) pair while the player is in the room; the
 * row is deleted when the player leaves. Used both for membership checks
 * (e.g. authorizing `record_round_event`) and for auto-transferring host
 * to a remaining member when the original host departs.
 */
export const RoomMember = table(
  {
    name: 'room_member',
    public: true,
    indexes: [
      { accessor: 'room_member_room_id', algorithm: 'btree', columns: ['roomId'] },
      { accessor: 'room_member_identity', algorithm: 'btree', columns: ['identity'] }
    ]
  },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64(),
    identity: t.identity(),
    joinedAt: t.timestamp()
  }
);

/**
 * One match played inside a room.
 *
 * Rounds are retained after they finish so the client can show match history
 * and so a late-joining spectator can replay events. `seed` is the RNG seed
 * used by the deterministic simulation — combined with the ordered
 * `round_event` stream, it lets any client reconstruct the round.
 *
 * `winnerIdentity` is optional because a round can end in a draw or be
 * cancelled by the host.
 */
export const Round = table(
  {
    name: 'round',
    public: true,
    indexes: [
      { accessor: 'round_room_id', algorithm: 'btree', columns: ['roomId'] }
    ]
  },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64(),
    seed: t.u64(),
    status: t.string(),
    startedAt: t.timestamp(),
    endedAt: t.timestamp().optional(),
    winnerIdentity: t.identity().optional()
  }
);

/**
 * Append-only history of in-round actions.
 *
 * Each row records a single deterministic event (shot fired, terrain
 * destroyed, damage dealt, turn advanced, etc.) tagged with the producing
 * `actorIdentity` and ordered by `tick`. The simulation is deterministic
 * given the round `seed`, so replaying events in tick order on any client
 * reconstructs the same authoritative state without trusting per-client
 * physics — this is the core of round persistence and late-join replay.
 *
 * `payload` is an opaque JSON string the client encodes per `kind`; the
 * server treats it as a blob so reducer logic does not have to evolve in
 * lockstep with gameplay tuning.
 */
export const RoundEvent = table(
  {
    name: 'round_event',
    public: true,
    indexes: [
      { accessor: 'round_event_round_id', algorithm: 'btree', columns: ['roundId'] }
    ]
  },
  {
    id: t.u64().primaryKey().autoInc(),
    roundId: t.u64(),
    tick: t.u64(),
    actorIdentity: t.identity(),
    kind: t.string(),
    payload: t.string(),
    createdAt: t.timestamp()
  }
);

const spacetimedb = schema({
  player: Player,
  room: Room,
  roomMember: RoomMember,
  round: Round,
  roundEvent: RoundEvent
});

export default spacetimedb;
