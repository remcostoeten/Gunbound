---
title: React Table Hooks
impact: MEDIUM
impactDescription: Simplifies reactive data binding in React
tags: react, hooks, tables, state
---

## React Table Hooks

**Impact: MEDIUM (Simplifies reactive data binding in React)**

Use SpacetimeDB's React hooks to automatically re-render components when table data changes. This provides a reactive data binding experience similar to other state management libraries.

**Incorrect (manual state management):**

```typescript
import { useState, useEffect } from 'react';
import { DbConnection, Player } from './generated';

// Manually managing state - error-prone and verbose
function PlayerList({ conn }: { conn: DbConnection }) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    // Manual subscription setup
    const sub = conn.subscription(['SELECT * FROM player WHERE isOnline = true']);

    // Manual event handling
    const handleInsert = (player: Player) => {
      setPlayers(prev => [...prev, player]);
    };

    const handleUpdate = (oldPlayer: Player, newPlayer: Player) => {
      setPlayers(prev => prev.map(p =>
        p.identity.toHexString() === newPlayer.identity.toHexString() ? newPlayer : p
      ));
    };

    const handleDelete = (player: Player) => {
      setPlayers(prev => prev.filter(p =>
        p.identity.toHexString() !== player.identity.toHexString()
      ));
    };

    conn.db.player.onInsert(handleInsert);
    conn.db.player.onUpdate(handleUpdate);
    conn.db.player.onDelete(handleDelete);

    return () => {
      sub?.unsubscribe();
      conn.db.player.offInsert(handleInsert);
      conn.db.player.offUpdate(handleUpdate);
      conn.db.player.offDelete(handleDelete);
    };
  }, [conn]);

  return (
    <ul>
      {players.map(player => (
        <li key={player.identity.toHexString()}>{player.name}</li>
      ))}
    </ul>
  );
}
```

**Correct (using React hooks):**

```typescript
import { useMemo } from 'react';
import { useTable, where, eq } from 'spacetimedb/react';
import { DbConnection, Player, Message } from './generated';

// Simple table hook - all rows
function PlayerList() {
  // Automatically re-renders when player table changes
  const { rows: players } = useTable<DbConnection, Player>('player');

  return (
    <ul>
      {players.map(player => (
        <li key={player.identity.toHexString()}>
          {player.name} - {player.score} points
        </li>
      ))}
    </ul>
  );
}

// Filtered query hook using where clause
function OnlinePlayerList() {
  // Only re-renders when online players change
  const { rows: onlinePlayers } = useTable<DbConnection, Player>(
    'player',
    where(eq('isOnline', true))
  );

  return (
    <ul>
      {onlinePlayers.map(player => (
        <li key={player.identity.toHexString()}>
          {player.name} - Online
        </li>
      ))}
    </ul>
  );
}

// Single row lookup
function PlayerProfile({ playerId }: { playerId: string }) {
  const { rows: players } = useTable<DbConnection, Player>('player');

  // Find the specific player
  const player = players.find(p => p.identity.toHexString() === playerId);

  if (!player) {
    return <div>Player not found</div>;
  }

  return (
    <div>
      <h2>{player.name}</h2>
      <p>Score: {player.score}</p>
      <p>Status: {player.isOnline ? 'Online' : 'Offline'}</p>
    </div>
  );
}

// Computed/derived data
function GameStats() {
  const { rows: players } = useTable<DbConnection, Player>('player');

  // Derived calculations are memoized
  const stats = useMemo(() => ({
    totalPlayers: players.length,
    onlinePlayers: players.filter(p => p.isOnline).length,
    averageScore: players.length > 0
      ? players.reduce((sum, p) => sum + Number(p.score), 0) / players.length
      : 0,
    topPlayer: players.reduce((top, p) =>
      Number(p.score) > (top ? Number(top.score) : 0) ? p : top,
      null as Player | null
    )
  }), [players]);

  return (
    <div>
      <p>Total Players: {stats.totalPlayers}</p>
      <p>Online: {stats.onlinePlayers}</p>
      <p>Average Score: {stats.averageScore.toFixed(0)}</p>
      {stats.topPlayer && (
        <p>Top Player: {stats.topPlayer.name} ({stats.topPlayer.score.toString()})</p>
      )}
    </div>
  );
}

// Multiple tables with relationships
function MessageWithAuthor({ messageId }: { messageId: string }) {
  const { rows: messages } = useTable<DbConnection, Message>('message');
  const { rows: players } = useTable<DbConnection, Player>('player');

  const message = messages.find(m => m.id === messageId);
  const author = message
    ? players.find(p => p.identity.toHexString() === message.authorId.toHexString())
    : null;

  if (!message || !author) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <strong>{author.name}</strong>: {message.content}
    </div>
  );
}
```

Reference: [SpacetimeDB TypeScript Client SDK](https://spacetimedb.com/docs/sdks/typescript/)
