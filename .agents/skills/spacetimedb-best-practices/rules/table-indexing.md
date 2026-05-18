---
title: Index Frequently Queried Columns
impact: CRITICAL
impactDescription: 10-100x faster queries on indexed columns
tags: table, schema, index, performance
---

## Index Frequently Queried Columns

**Impact: CRITICAL (10-100x faster queries on indexed columns)**

Add `.index()` to columns that are frequently used in subscription filters or lookups. Without indexes, SpacetimeDB must scan the entire table for each query.

**Incorrect (missing indexes on frequently queried columns):**

```typescript
import { spacetimedb, table, t } from 'spacetimedb';

const Message = table(
  { name: 'message', public: true },
  {
    id: t.string().primaryKey(),

    // These are frequently queried but not indexed!
    senderId: t.identity(),
    recipientId: t.identity(),
    channelId: t.string(),

    content: t.string(),
    timestamp: t.u64(),
  }
);

// Client subscribes to messages by channel - slow without index!
// subscription: SELECT * FROM message WHERE channelId = 'general'
```

**Correct (indexes on query columns):**

```typescript
import { spacetimedb, table, t } from 'spacetimedb';

const Message = table(
  { name: 'message', public: true },
  {
    id: t.string().primaryKey(),

    senderId: t.identity().index(), // Indexed - fast lookups by sender

    recipientId: t.identity().index(), // Indexed - fast lookups by recipient

    channelId: t.string().index(), // Indexed - fast channel filtering for subscriptions

    content: t.string(),

    timestamp: t.u64().index(), // Indexed - enables efficient time-range queries
  }
);

const Player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().primaryKey(),

    username: t.string().index(), // Indexed - allows finding players by username

    score: t.u64().index(), // Indexed - enables leaderboard queries

    isOnline: t.bool().index(), // Indexed - fast online player filtering
  }
);
```

```typescript
// Client can now efficiently subscribe to specific data
import { DbConnection } from './generated';

const conn = DbConnection.builder()
  .withUri('ws://localhost:3000')
  .withModuleName('my-module')
  .onConnect((ctx, identity, token) => {
    // Fast - uses channelId index
    conn.subscription(['SELECT * FROM message WHERE channelId = ?', channelId]);

    // Fast - uses isOnline index
    conn.subscription(['SELECT * FROM player WHERE isOnline = true']);

    // Fast - uses score index for leaderboard
    conn.subscription(['SELECT * FROM player ORDER BY score DESC LIMIT 100']);
  })
  .build();
```

**Index Guidelines:**
- Index columns used in WHERE clauses
- Index columns used in ORDER BY clauses
- Index foreign key columns for joins
- Don't index columns that are rarely queried
- Don't index columns with very low cardinality (e.g., boolean with 50/50 distribution)

Reference: [SpacetimeDB TypeScript Module Quickstart](https://spacetimedb.com/docs/modules/typescript/quickstart/)
