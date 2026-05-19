import { schema, table, t } from 'spacetimedb/server';

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
