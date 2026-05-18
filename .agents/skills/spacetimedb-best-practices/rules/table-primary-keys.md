---
title: Primary Key Strategies
impact: CRITICAL
impactDescription: Affects query performance and data integrity
tags: table, schema, primary-key, indexing
---

## Primary Key Strategies

**Impact: CRITICAL (Affects query performance and data integrity)**

Every SpacetimeDB table requires a primary key. Choose the right strategy based on your use case: auto-increment for simple cases, identity-based for user data, or composite keys for relationship tables.

**Incorrect (poor primary key choices):**

```typescript
import { spacetimedb, table, t } from 'spacetimedb';

// Using mutable data as primary key
const Player = table(
  { name: 'player', public: true },
  {
    username: t.string().primaryKey(), // Bad: username might change!
    score: t.u64(),
  }
);

// No primary key at all
const Message = table(
  { name: 'message', public: true },
  {
    content: t.string(),
    senderId: t.string(),
    timestamp: t.u64(),
    // Missing .primaryKey() - compilation error
  }
);

// Using auto-increment when identity would be better
const UserProfile = table(
  { name: 'user_profile', public: true },
  {
    id: t.u64().primaryKey().autoInc(), // Bad: loses relationship to identity
    displayName: t.string(),
  }
);
```

**Correct (appropriate primary key strategies):**

```typescript
import { spacetimedb, table, t, ReducerContext } from 'spacetimedb';

// Use identity as primary key for user-owned data
const Player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().primaryKey(), // Identity is immutable and unique per user
    username: t.string(),
    score: t.u64(),
  }
);

// Use generated UUIDs for entity tables
const Message = table(
  { name: 'message', public: true },
  {
    id: t.string().primaryKey(), // UUID generated at insert time
    senderId: t.identity(),
    recipientId: t.identity(),
    content: t.string(),
    timestamp: t.u64(),
  }
);

// Use auto-increment for sequential IDs when appropriate
const GameRound = table(
  { name: 'game_round', public: true },
  {
    roundNumber: t.u64().primaryKey().autoInc(), // Auto-increment makes sense for sequential data
    startedAt: t.u64(),
    endedAt: t.u64().optional(),
  }
);

// Use composite keys for junction/relationship tables
const Friendship = table(
  { name: 'friendship', public: true },
  {
    userId: t.identity().primaryKey(),
    friendId: t.identity().primaryKey().index(),
    createdAt: t.u64(),
  }
);
```

```typescript
// Helper for generating UUIDs
function generateId(): string {
  return crypto.randomUUID();
}

spacetimedb.reducer(
  'send_message',
  { recipientId: t.identity(), content: t.string() },
  (ctx: ReducerContext, { recipientId, content }) => {
    ctx.db.message.insert({
      id: generateId(),
      senderId: ctx.sender,
      recipientId,
      content,
      timestamp: ctx.timestamp
    });
  }
);
```

Reference: [SpacetimeDB TypeScript Module Quickstart](https://spacetimedb.com/docs/modules/typescript/quickstart/)
