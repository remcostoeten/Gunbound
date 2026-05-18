---
title: Selective Subscriptions
impact: HIGH
impactDescription: Reduces bandwidth and client memory usage by 50-90%
tags: subscription, performance, bandwidth
---

## Selective Subscriptions

**Impact: HIGH (Reduces bandwidth and client memory usage by 50-90%)**

Subscribe only to the data your client actually needs. Avoid subscribing to entire tables when you only need a subset. Use WHERE clauses to filter server-side.

**Incorrect (subscribing to entire tables):**

```typescript
// Client subscribes to ALL data - wasteful!
import { DbConnection } from './generated';

const conn = DbConnection.builder()
  .withUri('ws://localhost:3000')
  .withModuleName('game-module')
  .onConnect((ctx, identity, token) => {
    // Downloads ALL messages ever sent
    conn.subscription(['SELECT * FROM message']);

    // Downloads ALL players, not just ones in current game
    conn.subscription(['SELECT * FROM player']);

    // Downloads entire inventory for ALL users
    conn.subscription(['SELECT * FROM inventory']);
  })
  .build();
```

**Correct (selective subscriptions with filters):**

```typescript
import { DbConnection } from './generated';

let currentChannelId: string;

const conn = DbConnection.builder()
  .withUri('ws://localhost:3000')
  .withModuleName('game-module')
  .onConnect((ctx, identity, token) => {
    const myIdentity = identity.toHexString();

    // Subscribe only to current user's inventory
    conn.subscription([
      'SELECT * FROM inventory WHERE ownerId = ?',
      myIdentity
    ]);

    // Subscribe only to online players
    conn.subscription([
      'SELECT * FROM player WHERE isOnline = true'
    ]);

    // Subscribe to leaderboard (top 100 only)
    conn.subscription([
      'SELECT * FROM player ORDER BY score DESC LIMIT 100'
    ]);
  })
  .build();

// Subscribe only to messages in current channel
function subscribeToChannel(channelId: string) {
  currentChannelId = channelId;
  return conn.subscription([
    'SELECT * FROM message WHERE channelId = ?',
    channelId
  ]);
}

// Subscribe only to recent messages (last 24 hours)
function subscribeToRecentMessages(channelId: string) {
  const oneDayAgo = BigInt(Date.now() - 24 * 60 * 60 * 1000);
  return conn.subscription([
    'SELECT * FROM message WHERE channelId = ? AND timestamp > ?',
    channelId,
    oneDayAgo
  ]);
}

// Subscribe only to players in the current game room
function subscribeToGameRoom(roomId: string) {
  return conn.subscription([
    'SELECT * FROM player WHERE roomId = ?',
    roomId
  ]);
}
```

```typescript
// React component with selective subscription
import { useEffect, useState } from 'react';
import { useTable, where, eq } from 'spacetimedb/react';
import { DbConnection, Message } from './generated';

function ChatRoom({ channelId, conn }: { channelId: string; conn: DbConnection }) {
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    // Subscribe when component mounts with specific channel
    const sub = conn.subscription([
      'SELECT * FROM message WHERE channelId = ?',
      channelId
    ]);
    setSubscription(sub);

    return () => {
      // Unsubscribe when component unmounts or channelId changes
      sub?.unsubscribe();
    };
  }, [channelId, conn]);

  // Use React hooks with filtering
  const { rows: messages } = useTable<DbConnection, Message>(
    'message',
    where(eq('channelId', channelId))
  );

  return (
    <div>
      {messages.map(msg => (
        <MessageComponent key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

Reference: [SpacetimeDB TypeScript Client SDK](https://spacetimedb.com/docs/sdks/typescript/)
