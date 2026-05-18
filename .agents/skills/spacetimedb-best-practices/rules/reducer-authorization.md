---
title: Authorization Checks
impact: HIGH
impactDescription: Prevents unauthorized access and data manipulation
tags: reducer, authorization, security, identity
---

## Authorization Checks

**Impact: HIGH (Prevents unauthorized access and data manipulation)**

Always verify the caller's identity and permissions before performing sensitive operations. Use `ctx.sender` to identify the caller and check against stored permissions or ownership.

**Incorrect (no authorization checks):**

```typescript
import { spacetimedb, t, ReducerContext } from 'spacetimedb';

spacetimedb.reducer(
  'delete_message',
  { messageId: t.string() },
  (ctx: ReducerContext, { messageId }) => {
    // Anyone can delete any message!
    ctx.db.message.id.delete(messageId);
  }
);

spacetimedb.reducer(
  'update_user_profile',
  { userId: t.identity(), newName: t.string() },
  (ctx: ReducerContext, { userId, newName }) => {
    // Anyone can update any user's profile!
    const user = ctx.db.user.identity.find(userId);
    ctx.db.user.identity.update({ ...user, name: newName });
  }
);

spacetimedb.reducer(
  'ban_user',
  { userId: t.identity() },
  (ctx: ReducerContext, { userId }) => {
    // Anyone can ban anyone!
    const user = ctx.db.user.identity.find(userId);
    ctx.db.user.identity.update({ ...user, isBanned: true });
  }
);
```

**Correct (proper authorization):**

```typescript
import { spacetimedb, table, t, ReducerContext } from 'spacetimedb';

const Admin = table(
  { name: 'admin', public: true },
  {
    identity: t.identity().primaryKey(),
    role: t.string(), // 'super_admin' | 'moderator'
  }
);

function generateId(): string {
  return crypto.randomUUID();
}

spacetimedb.reducer(
  'delete_message',
  { messageId: t.string() },
  (ctx: ReducerContext, { messageId }) => {
    const callerId = ctx.sender;

    const message = ctx.db.message.id.find(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if caller is the message author OR an admin
    const isAuthor = message.authorId.toHexString() === callerId.toHexString();
    const isAdmin = ctx.db.admin.identity.find(callerId) !== undefined;

    if (!isAuthor && !isAdmin) {
      throw new Error('Not authorized to delete this message');
    }

    ctx.db.message.id.delete(messageId);

    // Log admin actions for audit
    if (isAdmin && !isAuthor) {
      ctx.db.audit_log.insert({
        id: generateId(),
        adminId: callerId,
        action: 'delete_message',
        targetId: messageId,
        timestamp: ctx.timestamp
      });
    }
  }
);

spacetimedb.reducer(
  'update_user_profile',
  { newName: t.string() },
  (ctx: ReducerContext, { newName }) => {
    // Users can only update their OWN profile
    const userId = ctx.sender;

    const user = ctx.db.user.identity.find(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!newName || newName.trim().length === 0) {
      throw new Error('Name cannot be empty');
    }

    ctx.db.user.identity.update({
      ...user,
      name: newName.trim(),
      updatedAt: ctx.timestamp
    });
  }
);

spacetimedb.reducer(
  'ban_user',
  { userId: t.identity(), reason: t.string() },
  (ctx: ReducerContext, { userId, reason }) => {
    const adminId = ctx.sender;

    // Verify caller is an admin
    const admin = ctx.db.admin.identity.find(adminId);
    if (!admin) {
      throw new Error('Only admins can ban users');
    }

    // Verify target exists
    const targetUser = ctx.db.user.identity.find(userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    // Prevent banning other admins (unless super_admin)
    const targetAdmin = ctx.db.admin.identity.find(userId);
    if (targetAdmin && admin.role !== 'super_admin') {
      throw new Error('Only super admins can ban other admins');
    }

    // Prevent self-ban
    if (adminId.toHexString() === userId.toHexString()) {
      throw new Error('Cannot ban yourself');
    }

    ctx.db.user.identity.update({
      ...targetUser,
      isBanned: true,
      bannedAt: ctx.timestamp,
      bannedBy: adminId,
      banReason: reason
    });

    ctx.db.audit_log.insert({
      id: generateId(),
      adminId,
      action: 'ban_user',
      targetId: userId.toHexString(),
      details: reason,
      timestamp: ctx.timestamp
    });
  }
);
```

Reference: [SpacetimeDB TypeScript Module Quickstart](https://spacetimedb.com/docs/modules/typescript/quickstart/)
