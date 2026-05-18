---
title: Atomic Reducers
impact: HIGH
impactDescription: Ensures data consistency and predictable behavior
tags: reducer, atomicity, transactions
---

## Atomic Reducers

**Impact: HIGH (Ensures data consistency and predictable behavior)**

Reducers in SpacetimeDB are transactional - they either complete entirely or roll back. Design reducers to be atomic: each reducer should perform one logical operation. This ensures data consistency and makes debugging easier.

**Incorrect (non-atomic reducer doing too much):**

```typescript
import { spacetimedb, t, ReducerContext } from 'spacetimedb';

spacetimedb.reducer(
  'process_game_turn',
  { playerId: t.string(), action: t.string() },
  (ctx: ReducerContext, { playerId, action }) => {
    // This reducer does too many things - if it fails partway through,
    // it's hard to know what state we're in

    // Step 1: Update player position
    const player = ctx.db.player.id.find(playerId);
    ctx.db.player.id.update({ ...player, position: calculateNewPosition(action) });

    // Step 2: Check for collisions with all other players
    const allPlayers = ctx.db.player.iter();
    for (const other of allPlayers) {
      if (checkCollision(player, other)) {
        // Step 3: Apply damage
        ctx.db.player.id.update({ ...other, health: other.health - 10 });
        // Step 4: Create combat log
        ctx.db.combat_log.insert({ /* ... */ });
        // Step 5: Update leaderboard
        ctx.db.leaderboard.id.update({ /* ... */ });
        // Step 6: Award achievements
        checkAndAwardAchievements(ctx, playerId);
      }
    }

    // Step 7: Advance game state
    advanceGameState(ctx);
  }
);
```

**Correct (atomic, focused reducers):**

```typescript
import { spacetimedb, t, ReducerContext } from 'spacetimedb';

function generateId(): string {
  return crypto.randomUUID();
}

// Each reducer does ONE thing well

spacetimedb.reducer(
  'move_player',
  { direction: t.string() },
  (ctx: ReducerContext, { direction }) => {
    const playerId = ctx.sender;
    const player = ctx.db.player.identity.find(playerId);

    if (!player) {
      throw new Error('Player not found');
    }

    const newPosition = calculateNewPosition(player.position, direction);

    if (!isValidPosition(newPosition)) {
      throw new Error('Invalid move');
    }

    ctx.db.player.identity.update({
      ...player,
      position: newPosition,
      lastMoveAt: ctx.timestamp
    });
  }
);

spacetimedb.reducer(
  'attack_player',
  { targetId: t.identity(), damage: t.u32() },
  (ctx: ReducerContext, { targetId, damage }) => {
    const attackerId = ctx.sender;
    const target = ctx.db.player.identity.find(targetId);

    if (!target) {
      throw new Error('Target not found');
    }

    const newHealth = Math.max(0, target.health - damage);

    ctx.db.player.identity.update({
      ...target,
      health: newHealth
    });

    ctx.db.combat_log.insert({
      id: generateId(),
      attackerId,
      targetId,
      damage,
      timestamp: ctx.timestamp
    });
  }
);

spacetimedb.reducer(
  'claim_achievement',
  { achievementId: t.string() },
  (ctx: ReducerContext, { achievementId }) => {
    const playerId = ctx.sender;
    const player = ctx.db.player.identity.find(playerId);

    if (!player) {
      throw new Error('Player not found');
    }

    // Verify achievement requirements
    if (!checkAchievementRequirements(ctx, playerId, achievementId)) {
      throw new Error('Achievement requirements not met');
    }

    // Check if already claimed
    const existing = ctx.db.player_achievement.playerId.filter(playerId)
      .find(a => a.achievementId === achievementId);

    if (existing) {
      throw new Error('Achievement already claimed');
    }

    ctx.db.player_achievement.insert({
      playerId,
      achievementId,
      claimedAt: ctx.timestamp
    });
  }
);
```

Reference: [SpacetimeDB TypeScript Module Quickstart](https://spacetimedb.com/docs/modules/typescript/quickstart/)
