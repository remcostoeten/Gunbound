import { schema, table, t } from 'spacetimedb/server';

/**
 * Long-lived identity row, one per authenticated user.
 *
 * Created on first `clientConnected` and never deleted — `isOnline` and
 * `lastSeen` are flipped by the connect/disconnect lifecycle hooks so that
 * other players can see presence without needing to enumerate active sessions.
 * Display `name` starts empty and is set via the profile reducers.
 */
export const Player = table(
  {
    name: 'player',
    public: true,
    indexes: [
      { accessor: 'player_is_online', algorithm: 'btree', columns: ['isOnline'] },
      { accessor: 'player_level', algorithm: 'btree', columns: ['level'] }
    ]
  },
  {
    identity: t.identity().primaryKey(),
    name: t.string(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
    displayNameSetAt: t.timestamp().optional(),
    isOnline: t.bool(),
    lastSeen: t.timestamp(),
    xp: t.u64(),
    level: t.u32(),
    loginStreak: t.u32(),
    longestStreak: t.u32(),
    lastLoginDay: t.u64(),
    totalWins: t.u32(),
    totalLosses: t.u32(),
    totalRoundsPlayed: t.u32(),
    isAdmin: t.bool().optional(),
    country: t.string().optional()
  }
);

/**
 * Public runtime flags controlled by server reducers.
 *
 * Values are stored as strings to keep the table generic. Clients parse the
 * setting they care about and reducers are responsible for authorization.
 */
export const AppSetting = table(
  {
    name: 'app_setting',
    public: true
  },
  {
    key: t.string().primaryKey(),
    value: t.string(),
    updatedBy: t.identity().optional(),
    updatedAt: t.timestamp()
  }
);

/**
 * Invite-only lobby keyed by a short, human-shareable `code`.
 *
 * Lifecycle: `waiting` (accepting joins) → `in_match` (a round is being
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
    mapType: t.string(),
    targetScore: t.u32(),
    roundLimit: t.u32(),
    turnDurationMode: t.string().optional(),
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
    slotIndex: t.u32(),
    teamIndex: t.u32().optional(),
    mobileType: t.string(),
    isReady: t.bool(),
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

export const RoundStat = table(
  {
    name: 'round_stat',
    public: true,
    indexes: [
      { accessor: 'round_stat_round_id', algorithm: 'btree', columns: ['roundId'] },
      { accessor: 'round_stat_player_identity', algorithm: 'btree', columns: ['playerIdentity'] }
    ]
  },
  {
    id: t.u64().primaryKey().autoInc(),
    roundId: t.u64(),
    playerIdentity: t.identity(),
    damageDealt: t.u32(),
    shotsFired: t.u32(),
    directHits: t.u32(),
    xpAwarded: t.u32()
  }
);

export const ChatMessage = table(
  {
    name: 'chat_message',
    public: true,
    indexes: [
      { accessor: 'chat_message_room_id', algorithm: 'btree', columns: ['roomId'] }
    ]
  },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64(),
    senderIdentity: t.identity(),
    message: t.string(),
    createdAt: t.timestamp()
  }
);

/**
 * Persistent public lobby chat scoped by channel.
 *
 * Rows are append-only so players who reconnect later can replay the channel
 * history from the database instead of starting from client fixture state.
 */
export const LobbyChatMessage = table(
  {
    name: 'lobby_chat_message',
    public: true,
    indexes: [
      { accessor: 'lobby_chat_message_channel', algorithm: 'btree', columns: ['channel'] }
    ]
  },
  {
    id: t.u64().primaryKey().autoInc(),
    channel: t.u32(),
    senderIdentity: t.identity(),
    message: t.string(),
    createdAt: t.timestamp()
  }
);

export const RequestStatus = t.enum('RequestStatus', ['Pending', 'Accepted', 'Declined']);

export const FriendRequest = table(
  {
    name: 'friend_request',
    public: true,
    indexes: [
      { accessor: 'friend_request_recipient', algorithm: 'btree', columns: ['recipientIdentity'] },
      { accessor: 'friend_request_requester', algorithm: 'btree', columns: ['requesterIdentity'] }
    ]
  },
  {
    id: t.u64().primaryKey().autoInc(),
    requesterIdentity: t.identity(),
    recipientIdentity: t.identity(),
    status: RequestStatus,
    createdAt: t.timestamp(),
    resolvedAt: t.timestamp().optional()
  }
);

export const Friendship = table(
  {
    name: 'friendship',
    public: true,
    indexes: [
      { accessor: 'friendship_owner', algorithm: 'btree', columns: ['ownerIdentity'] },
      { accessor: 'friendship_buddy', algorithm: 'btree', columns: ['buddyIdentity'] }
    ]
  },
  {
    id: t.u64().primaryKey().autoInc(),
    ownerIdentity: t.identity(),
    buddyIdentity: t.identity(),
    createdAt: t.timestamp()
  }
);

export const RoomInvite = table(
  {
    name: 'room_invite',
    public: true,
    indexes: [
      { accessor: 'room_invite_recipient', algorithm: 'btree', columns: ['recipientIdentity'] },
      { accessor: 'room_invite_requester', algorithm: 'btree', columns: ['requesterIdentity'] },
      { accessor: 'room_invite_room_id', algorithm: 'btree', columns: ['roomId'] }
    ]
  },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64(),
    requesterIdentity: t.identity(),
    recipientIdentity: t.identity(),
    status: RequestStatus,
    createdAt: t.timestamp(),
    resolvedAt: t.timestamp().optional()
  }
);

/**
 * One row per player currently in the matchmaking queue.
 *
 * When a second player calls `join_queue`, the server pairs them immediately:
 * both rows are removed and a shared room is created. If no partner is
 * available the row persists until `leave_queue` or disconnect.
 */
export const WaitingPlayer = table(
  {
    name: 'waiting_player',
    public: true
  },
  {
    identity: t.identity().primaryKey(),
    joinedAt: t.timestamp()
  }
);

/**
 * Account credentials for cross-device login.
 *
 * Each row binds a chosen `username` to the player's SpacetimeDB `identity`.
 * `encryptedToken` is the player's SpacetimeDB session token, encrypted on
 * the client with AES-GCM using a key derived from their password via PBKDF2
 * (salt = username). The server stores only the ciphertext; passwords and
 * plaintext tokens never reach the server.
 *
 * To log in on a new device, the client subscribes to the row matching the
 * typed username, decrypts the token locally with the typed password, and
 * installs the result in localStorage. A wrong password fails AES-GCM tag
 * verification on the client and is rejected without any server roundtrip.
 *
 * Public so any client can fetch any user's encrypted blob during login —
 * the encryption is the actual access control.
 */
export const Credential = table(
  {
    name: 'credential',
    public: true,
    indexes: [
      { accessor: 'credential_identity', algorithm: 'btree', columns: ['identity'] }
    ]
  },
  {
    username: t.string().primaryKey(),
    identity: t.identity(),
    encryptedToken: t.string(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp()
  }
);

const spacetimedb = schema({
  player: Player,
  appSetting: AppSetting,
  room: Room,
  roomMember: RoomMember,
  round: Round,
  roundEvent: RoundEvent,
  roundStat: RoundStat,
  chatMessage: ChatMessage,
  lobbyChatMessage: LobbyChatMessage,
  friendRequest: FriendRequest,
  friendship: Friendship,
  roomInvite: RoomInvite,
  credential: Credential,
  waitingPlayer: WaitingPlayer
});

// Per-subscriber visibility filters for the social tables. Tables stay
// `public` so the TypeScript client bindings continue to expose them, but
// the server only delivers rows where the subscriber is a party. Without
// these filters any authenticated client could subscribe to the raw tables
// and enumerate the full social graph.
//
// Migrate to `spacetimedb.view(...)` when the TypeScript codegen begins
// emitting view accessors (2.2.0 silently skips them).
export const friendshipOwnerVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT * FROM friendship WHERE ownerIdentity = :sender'
);

export const friendRequestRecipientVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT * FROM friend_request WHERE recipientIdentity = :sender'
);

export const friendRequestRequesterVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT * FROM friend_request WHERE requesterIdentity = :sender'
);

export const roomInviteRecipientVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT * FROM room_invite WHERE recipientIdentity = :sender'
);

export default spacetimedb;
