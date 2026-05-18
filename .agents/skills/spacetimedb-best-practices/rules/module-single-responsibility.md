---
title: Single Responsibility Modules
impact: CRITICAL
impactDescription: Improves maintainability and testability
tags: module, architecture, design
---

## Single Responsibility Modules

**Impact: CRITICAL (Improves maintainability and testability)**

Each SpacetimeDB module should focus on a single domain concept. This makes modules easier to understand, test, and maintain. Avoid creating "god modules" that handle multiple unrelated concerns.

**Incorrect (multiple concerns in one module):**

```typescript
// module.ts - handles users, products, AND orders
import { spacetimedb, table, t, ReducerContext, Table } from 'spacetimedb';

const User = table(
  { name: 'user', public: true },
  {
    id: t.string().primaryKey(),
    name: t.string(),
  }
);

const Product = table(
  { name: 'product', public: true },
  {
    id: t.string().primaryKey(),
    name: t.string(),
    price: t.u64(),
  }
);

const Order = table(
  { name: 'order', public: true },
  {
    id: t.string().primaryKey(),
    userId: t.string(),
    productId: t.string(),
  }
);

// Too many unrelated reducers in one module
spacetimedb.reducer('create_user', { name: t.string() }, (ctx: ReducerContext, { name }) => {
  /* ... */
});

spacetimedb.reducer('update_product', { id: t.string(), price: t.u64() }, (ctx: ReducerContext, { id, price }) => {
  /* ... */
});

spacetimedb.reducer('place_order', { userId: t.string(), productId: t.string() }, (ctx: ReducerContext, { userId, productId }) => {
  /* ... */
});
```

**Correct (separate modules per domain):**

```typescript
// users/module.ts
import { spacetimedb, table, t, ReducerContext } from 'spacetimedb';

export const User = table(
  { name: 'user', public: true },
  {
    id: t.string().primaryKey(),
    name: t.string(),
    email: t.string(),
  }
);

function generateId(): string {
  return crypto.randomUUID();
}

spacetimedb.reducer('create_user', { name: t.string(), email: t.string() }, (ctx: ReducerContext, { name, email }) => {
  ctx.db.user.insert({ id: generateId(), name, email });
});

spacetimedb.reducer('update_user', { id: t.string(), name: t.string() }, (ctx: ReducerContext, { id, name }) => {
  const user = ctx.db.user.id.find(id);
  if (user) {
    ctx.db.user.id.update({ ...user, name });
  }
});
```

```typescript
// orders/module.ts
import { spacetimedb, table, t, ReducerContext } from 'spacetimedb';

export const Order = table(
  { name: 'order', public: true },
  {
    id: t.string().primaryKey(),
    userId: t.string().index(),
    productId: t.string(),
    quantity: t.u32(),
    createdAt: t.u64(),
  }
);

function generateId(): string {
  return crypto.randomUUID();
}

spacetimedb.reducer('place_order', { productId: t.string(), quantity: t.u32() }, (ctx: ReducerContext, { productId, quantity }) => {
  const userId = ctx.sender.toHexString();
  ctx.db.order.insert({
    id: generateId(),
    userId,
    productId,
    quantity,
    createdAt: ctx.timestamp
  });
});
```

Reference: [SpacetimeDB TypeScript Module Quickstart](https://spacetimedb.com/docs/modules/typescript/quickstart/)
