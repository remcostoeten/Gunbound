---
title: Input Validation at Reducer Entry
impact: HIGH
impactDescription: Prevents invalid state and security issues
tags: reducer, validation, security
---

## Input Validation at Reducer Entry

**Impact: HIGH (Prevents invalid state and security issues)**

Always validate all inputs at the start of a reducer before performing any database operations. This ensures data integrity and prevents malicious or malformed data from corrupting your database.

**Incorrect (no input validation):**

```typescript
import { spacetimedb, t, ReducerContext } from 'spacetimedb';

spacetimedb.reducer(
  'create_product',
  { name: t.string(), price: t.u64(), stock: t.u32() },
  (ctx: ReducerContext, { name, price, stock }) => {
    // No validation - accepts any input!
    ctx.db.product.insert({
      id: generateId(),
      name,
      price,
      stock,
      createdBy: ctx.sender
    });
  }
);

spacetimedb.reducer(
  'transfer_funds',
  { toUserId: t.identity(), amount: t.u64() },
  (ctx: ReducerContext, { toUserId, amount }) => {
    const fromUser = ctx.db.user.identity.find(ctx.sender);
    const toUser = ctx.db.user.identity.find(toUserId);

    // No validation - could transfer negative amounts or overdraw!
    ctx.db.user.identity.update({ ...fromUser, balance: fromUser.balance - amount });
    ctx.db.user.identity.update({ ...toUser, balance: toUser.balance + amount });
  }
);
```

**Correct (comprehensive input validation):**

```typescript
import { spacetimedb, t, ReducerContext } from 'spacetimedb';

function generateId(): string {
  return crypto.randomUUID();
}

spacetimedb.reducer(
  'create_product',
  { name: t.string(), price: t.u64(), stock: t.u32() },
  (ctx: ReducerContext, { name, price, stock }) => {
    // Validate all inputs first
    if (!name || name.trim().length === 0) {
      throw new Error('Product name is required');
    }

    if (name.length > 100) {
      throw new Error('Product name must be 100 characters or less');
    }

    if (price <= 0n) {
      throw new Error('Price must be positive');
    }

    // Check for duplicate names
    const existing = [...ctx.db.product.iter()].find(p => p.name === name.trim());
    if (existing) {
      throw new Error('Product with this name already exists');
    }

    // All validation passed - safe to insert
    ctx.db.product.insert({
      id: generateId(),
      name: name.trim(),
      price,
      stock,
      createdBy: ctx.sender,
      createdAt: ctx.timestamp
    });
  }
);

spacetimedb.reducer(
  'transfer_funds',
  { toUserId: t.identity(), amount: t.u64() },
  (ctx: ReducerContext, { toUserId, amount }) => {
    // Validate amount
    if (amount <= 0n) {
      throw new Error('Amount must be positive');
    }

    // Validate recipient exists
    const toUser = ctx.db.user.identity.find(toUserId);
    if (!toUser) {
      throw new Error('Recipient not found');
    }

    // Validate sender exists and has sufficient balance
    const fromUser = ctx.db.user.identity.find(ctx.sender);
    if (!fromUser) {
      throw new Error('Sender not found');
    }

    // Prevent self-transfer
    if (ctx.sender.toHexString() === toUserId.toHexString()) {
      throw new Error('Cannot transfer to yourself');
    }

    // Check sufficient balance
    if (fromUser.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // All validation passed - safe to transfer
    ctx.db.user.identity.update({
      ...fromUser,
      balance: fromUser.balance - amount
    });

    ctx.db.user.identity.update({
      ...toUser,
      balance: toUser.balance + amount
    });

    // Log the transaction
    ctx.db.transaction.insert({
      id: generateId(),
      fromUserId: ctx.sender,
      toUserId,
      amount,
      timestamp: ctx.timestamp
    });
  }
);
```

Reference: [SpacetimeDB TypeScript Module Quickstart](https://spacetimedb.com/docs/modules/typescript/quickstart/)
