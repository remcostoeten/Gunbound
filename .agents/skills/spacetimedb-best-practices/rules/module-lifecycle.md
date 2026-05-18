---
title: Lifecycle Hooks
impact: CRITICAL
impactDescription: Ensures proper initialization and cleanup
tags: module, lifecycle, init, connect
---

## Lifecycle Hooks

**Impact: CRITICAL (Ensures proper initialization and cleanup)**

SpacetimeDB provides lifecycle hooks for module initialization (`init`), client connection (`clientConnected`), and disconnection (`clientDisconnected`). Use these appropriately to set up initial state, track connected users, and clean up resources.

**Incorrect (missing lifecycle hooks):**

```typescript
// No initialization or connection tracking
import { spacetimedb, table, t, ReducerContext } from 'spacetimedb';

const GameState = table(
  { name: 'game_state', public: true },
  {
    id: t.string().primaryKey(),
    status: t.string(),
  }
);

const Player = table(
  { name: 'player', public: true },
  {
    identityId: t.string().primaryKey(),
    name: t.string(),
    isOnline: t.bool(), // Never updated!
  }
);

spacetimedb.reducer('join_game', { name: t.string() }, (ctx: ReducerContext, { name }) => {
  // Player online status never gets set properly
  ctx.db.player.insert({
    identityId: ctx.sender.toHexString(),
    name,
    isOnline: true
  });
});
```

**Correct (proper lifecycle management):**

```typescript
import { spacetimedb, table, t, ReducerContext } from 'spacetimedb';

const GameState = table(
  { name: 'game_state', public: true },
  {
    id: t.string().primaryKey(),
    status: t.string(), // 'waiting' | 'active' | 'finished'
    createdAt: t.u64(),
  }
);

const Player = table(
  { name: 'player', public: true },
  {
    identityId: t.identity().primaryKey(),
    name: t.string(),
    isOnline: t.bool(),
    lastSeen: t.u64(),
  }
);

// Initialize game state when module is first published
spacetimedb.init((ctx: ReducerContext) => {
  // Create initial game state if it doesn't exist
  if (!ctx.db.game_state.id.find('main')) {
    ctx.db.game_state.insert({
      id: 'main',
      status: 'waiting',
      createdAt: ctx.timestamp
    });
  }
});

// Track when a client connects
spacetimedb.clientConnected((ctx: ReducerContext) => {
  const identityId = ctx.sender;
  const player = ctx.db.player.identityId.find(identityId);

  if (player) {
    // Mark existing player as online
    ctx.db.player.identityId.update({
      ...player,
      isOnline: true,
      lastSeen: ctx.timestamp
    });
  }
});

// Track when a client disconnects
spacetimedb.clientDisconnected((ctx: ReducerContext) => {
  const identityId = ctx.sender;
  const player = ctx.db.player.identityId.find(identityId);

  if (player) {
    ctx.db.player.identityId.update({
      ...player,
      isOnline: false,
      lastSeen: ctx.timestamp
    });
  }
});

spacetimedb.reducer('register_player', { name: t.string() }, (ctx: ReducerContext, { name }) => {
  const identityId = ctx.sender;

  if (ctx.db.player.identityId.find(identityId)) {
    throw new Error('Player already registered');
  }

  ctx.db.player.insert({
    identityId,
    name,
    isOnline: true,
    lastSeen: ctx.timestamp
  });
});
```

Reference: [SpacetimeDB TypeScript Module Quickstart](https://spacetimedb.com/docs/modules/typescript/quickstart/)
