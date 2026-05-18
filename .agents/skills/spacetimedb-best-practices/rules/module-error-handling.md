---
title: Error Handling in Modules
impact: CRITICAL
impactDescription: Ensures graceful failure and debugging
tags: module, error-handling, debugging
---

## Error Handling in Modules

**Impact: CRITICAL (Ensures graceful failure and debugging)**

Handle errors gracefully in SpacetimeDB modules by throwing descriptive errors that clients can handle. Avoid silent failures that leave the database in inconsistent states.

**Incorrect (poor error handling):**

```typescript
import { spacetimedb, table, t, ReducerContext } from 'spacetimedb';

spacetimedb.reducer(
  'purchase_item',
  { itemId: t.string(), quantity: t.u32() },
  (ctx: ReducerContext, { itemId, quantity }) => {
    const user = ctx.db.user.identity.find(ctx.sender);
    const item = ctx.db.item.id.find(itemId);

    // Silent failure - no error if user or item doesn't exist
    if (!user || !item) {
      return; // Client has no idea what went wrong
    }

    // No validation - can go negative
    ctx.db.user.identity.update({ ...user, balance: user.balance - item.price * BigInt(quantity) });

    // Silent failure if insufficient stock
    if (item.stock < quantity) {
      return; // Purchase "succeeded" but nothing happened
    }

    ctx.db.item.id.update({ ...item, stock: item.stock - quantity });
  }
);
```

**Correct (comprehensive error handling):**

```typescript
import { spacetimedb, table, t, ReducerContext } from 'spacetimedb';

// Custom error types for different failure modes
class InsufficientBalanceError extends Error {
  constructor(required: bigint, available: bigint) {
    super(`Insufficient balance: need ${required}, have ${available}`);
    this.name = 'InsufficientBalanceError';
  }
}

class InsufficientStockError extends Error {
  constructor(itemName: string, requested: number, available: number) {
    super(`Insufficient stock for ${itemName}: requested ${requested}, available ${available}`);
    this.name = 'InsufficientStockError';
  }
}

class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

function generateId(): string {
  return crypto.randomUUID();
}

spacetimedb.reducer(
  'purchase_item',
  { itemId: t.string(), quantity: t.u32() },
  (ctx: ReducerContext, { itemId, quantity }) => {
    // Validate inputs
    if (!itemId || itemId.trim().length === 0) {
      throw new Error('Item ID is required');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }

    // Find user
    const user = ctx.db.user.identity.find(ctx.sender);
    if (!user) {
      throw new NotFoundError('User', ctx.sender.toHexString());
    }

    // Find item
    const item = ctx.db.item.id.find(itemId);
    if (!item) {
      throw new NotFoundError('Item', itemId);
    }

    // Check stock availability
    if (item.stock < quantity) {
      throw new InsufficientStockError(item.name, quantity, item.stock);
    }

    // Calculate total cost
    const totalCost = item.price * BigInt(quantity);

    // Check balance
    if (user.balance < totalCost) {
      throw new InsufficientBalanceError(totalCost, user.balance);
    }

    // All validations passed - perform the transaction
    ctx.db.user.identity.update({
      ...user,
      balance: user.balance - totalCost
    });

    ctx.db.item.id.update({
      ...item,
      stock: item.stock - quantity
    });

    // Record the purchase
    ctx.db.purchase.insert({
      id: generateId(),
      userId: ctx.sender.toHexString(),
      itemId,
      quantity,
      totalCost,
      timestamp: ctx.timestamp
    });

    // Log for debugging
    console.log(`Purchase completed: ${user.name} bought ${quantity}x ${item.name} for ${totalCost}`);
  }
);
```

```typescript
// Client-side error handling
import { DbConnection } from './generated';

async function handlePurchase(conn: DbConnection, itemId: string, quantity: number) {
  try {
    await conn.reducers.purchaseItem(itemId, quantity);
    showToast('Purchase successful!', 'success');
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Insufficient balance')) {
        showToast('Not enough coins! Earn more or buy coins.', 'warning');
        showBuyCoinsModal();
      } else if (error.message.includes('Insufficient stock')) {
        showToast('Item out of stock. Try again later.', 'error');
      } else if (error.message.includes('not found')) {
        showToast('Item no longer available.', 'error');
        refreshInventory();
      } else {
        // Generic error
        showToast(`Purchase failed: ${error.message}`, 'error');
      }
    } else {
      showToast('An unexpected error occurred.', 'error');
    }

    console.error('Purchase error:', error);
  }
}
```

Reference: [SpacetimeDB TypeScript Module Quickstart](https://spacetimedb.com/docs/modules/typescript/quickstart/)
