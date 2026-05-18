---
title: Reducer Hooks with Error Handling
impact: MEDIUM
impactDescription: Provides consistent reducer invocation with proper error handling
tags: react, hooks, reducers, error-handling
---

## Reducer Hooks with Error Handling

**Impact: MEDIUM (Provides consistent reducer invocation with proper error handling)**

Use hooks to call SpacetimeDB reducers with proper loading states, error handling, and optimistic updates. This improves user experience with immediate feedback.

**Incorrect (no error handling or loading states):**

```typescript
import { useState } from 'react';
import { DbConnection } from './generated';

function SendMessageButton({ channelId, conn }: { channelId: string; conn: DbConnection }) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    // Fire and forget - no feedback to user
    conn.reducers.sendMessage(channelId, message);
    setMessage('');
  };

  return (
    <div>
      <input value={message} onChange={e => setMessage(e.target.value)} />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

**Correct (proper hooks with error handling):**

```typescript
import { useState, useCallback } from 'react';
import { DbConnection } from './generated';

// Custom hook for reducer with loading/error states
function useReducerWithState<T extends any[]>(
  conn: DbConnection | null,
  reducerName: keyof DbConnection['reducers']
): [(...args: T) => Promise<void>, { loading: boolean; error: Error | null }] {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const call = useCallback(async (...args: T) => {
    if (!conn) {
      setError(new Error('Not connected'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await (conn.reducers[reducerName] as (...args: T) => Promise<void>)(...args);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [conn, reducerName]);

  return [call, { loading, error }];
}

// Message sending with proper feedback
function MessageInput({ channelId, conn }: { channelId: string; conn: DbConnection }) {
  const [message, setMessage] = useState('');
  const [sendMessage, { loading, error }] = useReducerWithState<[string, string]>(
    conn,
    'sendMessage'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    try {
      await sendMessage(channelId, message.trim());
      setMessage(''); // Only clear on success
    } catch (err) {
      // Error is already set in hook state
      console.error('Failed to send message:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={message}
        onChange={e => setMessage(e.target.value)}
        disabled={loading}
        placeholder="Type a message..."
      />
      <button type="submit" disabled={loading || !message.trim()}>
        {loading ? 'Sending...' : 'Send'}
      </button>
      {error && (
        <div style={{ color: 'red' }}>
          Failed to send: {error.message}
        </div>
      )}
    </form>
  );
}

// Optimistic updates for instant feedback
function LikeButton({
  postId,
  currentLikes,
  conn
}: {
  postId: string;
  currentLikes: number;
  conn: DbConnection;
}) {
  const [optimisticLikes, setOptimisticLikes] = useState<number | null>(null);
  const [likePost, { loading, error }] = useReducerWithState<[string]>(
    conn,
    'likePost'
  );

  const handleLike = async () => {
    // Optimistic update - show new count immediately
    setOptimisticLikes(currentLikes + 1);

    try {
      await likePost(postId);
      // Success - optimistic update will be replaced by real data
    } catch (err) {
      // Revert optimistic update on failure
      setOptimisticLikes(null);
    }
  };

  const displayLikes = optimisticLikes ?? currentLikes;

  return (
    <button onClick={handleLike} disabled={loading}>
      ❤️ {displayLikes}
      {error && ' (failed)'}
    </button>
  );
}

// Complex form with multiple reducers
function CreateGameForm({ conn }: { conn: DbConnection }) {
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);

  const [createGame, createState] = useReducerWithState<[string, number]>(
    conn,
    'createGame'
  );
  const [joinGame, joinState] = useReducerWithState<[string]>(
    conn,
    'joinGame'
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create game and join it
      await createGame(gameName, maxPlayers);
      // After game is created, we'd typically get the game ID from state
      // and then join it
    } catch (err) {
      // Error states are handled by individual hooks
    }
  };

  const loading = createState.loading || joinState.loading;
  const error = createState.error || joinState.error;

  return (
    <form onSubmit={handleCreate}>
      <input
        value={gameName}
        onChange={e => setGameName(e.target.value)}
        placeholder="Game name"
        disabled={loading}
      />
      <select
        value={maxPlayers}
        onChange={e => setMaxPlayers(Number(e.target.value))}
        disabled={loading}
      >
        {[2, 4, 6, 8].map(n => (
          <option key={n} value={n}>{n} players</option>
        ))}
      </select>
      <button type="submit" disabled={loading || !gameName.trim()}>
        {loading ? 'Creating...' : 'Create Game'}
      </button>
      {error && (
        <div style={{ color: 'red' }}>
          {error.message}
        </div>
      )}
    </form>
  );
}
```

Reference: [SpacetimeDB TypeScript Client SDK](https://spacetimedb.com/docs/sdks/typescript/)
