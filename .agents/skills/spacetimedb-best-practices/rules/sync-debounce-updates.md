---
title: Debounce Rapid Updates
impact: LOW-MEDIUM
impactDescription: Reduces unnecessary re-renders and network traffic
tags: sync, performance, debounce, ui
---

## Debounce Rapid Updates

**Impact: LOW-MEDIUM (Reduces unnecessary re-renders and network traffic)**

When handling real-time updates that can arrive rapidly (like cursor positions, typing indicators, or frequent state changes), debounce the UI updates to prevent excessive re-renders and improve perceived performance.

**Incorrect (updating on every change):**

```typescript
import { useTable } from 'spacetimedb/react';
import { DbConnection, PlayerCursor } from './generated';

function CursorOverlay() {
  const { rows: cursors } = useTable<DbConnection, PlayerCursor>('player_cursor');

  // Re-renders on EVERY cursor movement - could be 60+ times per second per player!
  return (
    <div>
      {cursors.map(cursor => (
        <div
          key={cursor.playerId.toHexString()}
          style={{
            position: 'absolute',
            left: cursor.x,
            top: cursor.y
          }}
        >
          {cursor.playerName}
        </div>
      ))}
    </div>
  );
}

// Sending every mouse move - floods the server
function Canvas({ conn }: { conn: DbConnection }) {
  const handleMouseMove = (e: React.MouseEvent) => {
    conn.reducers.updateCursor(e.clientX, e.clientY);
  };

  return <canvas onMouseMove={handleMouseMove} />;
}
```

**Correct (debounced/throttled updates):**

```typescript
import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { useTable } from 'spacetimedb/react';
import { DbConnection, PlayerCursor, TypingIndicator } from './generated';

// Throttle hook for limiting update frequency
function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdated.current >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timerId = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdated.current));

      return () => clearTimeout(timerId);
    }
  }, [value, interval]);

  return throttledValue;
}

// Throttled cursor overlay - updates at most 30fps
function CursorOverlay() {
  const { rows: rawCursors } = useTable<DbConnection, PlayerCursor>('player_cursor');

  // Throttle to 30fps for smooth but performant rendering
  const cursors = useThrottle(rawCursors, 33);

  // Use CSS transforms for GPU acceleration
  return (
    <div>
      {cursors.map(cursor => (
        <div
          key={cursor.playerId.toHexString()}
          style={{
            position: 'absolute',
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            willChange: 'transform'
          }}
        >
          {cursor.playerName}
        </div>
      ))}
    </div>
  );
}

// Throttled mouse position sending
function Canvas({ conn }: { conn: DbConnection }) {
  const lastSent = useRef(0);
  const pendingPosition = useRef<{ x: number; y: number } | null>(null);

  const sendPosition = useCallback(() => {
    if (pendingPosition.current) {
      conn.reducers.updateCursor(
        pendingPosition.current.x,
        pendingPosition.current.y
      );
      pendingPosition.current = null;
    }
  }, [conn]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    pendingPosition.current = { x: e.clientX, y: e.clientY };

    const now = Date.now();
    if (now - lastSent.current >= 50) { // Max 20 updates per second
      lastSent.current = now;
      sendPosition();
    }
  }, [sendPosition]);

  // Send final position on mouse stop
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingPosition.current) {
        sendPosition();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [sendPosition]);

  return <canvas onMouseMove={handleMouseMove} />;
}

// Debounced typing indicator
function TypingIndicatorDisplay({ channelId }: { channelId: string }) {
  const { rows: typingUsers } = useTable<DbConnection, TypingIndicator>('typing_indicator');

  // Filter to current channel and recent activity
  const activeTyping = typingUsers.filter(
    u => u.channelId === channelId && Number(u.lastTypedAt) > Date.now() - 3000
  );

  // Debounce the display to avoid flicker
  const [debouncedTyping, setDebouncedTyping] = useState(activeTyping);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTyping(activeTyping);
    }, 300);

    return () => clearTimeout(timer);
  }, [activeTyping]);

  if (debouncedTyping.length === 0) return null;

  const names = debouncedTyping.map(u => u.userName).join(', ');

  return (
    <div className="typing-indicator">
      {names} {debouncedTyping.length === 1 ? 'is' : 'are'} typing...
    </div>
  );
}

// Debounced input for sending typing indicator
function MessageInput({ channelId, conn }: { channelId: string; conn: DbConnection }) {
  const [message, setMessage] = useState('');
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    // Debounce typing indicator updates
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    // Send typing indicator
    conn.reducers.setTyping(channelId, true);

    // Clear typing after 2 seconds of no input
    typingTimeout.current = setTimeout(() => {
      conn.reducers.setTyping(channelId, false);
    }, 2000);
  };

  return (
    <input
      value={message}
      onChange={handleChange}
      placeholder="Type a message..."
    />
  );
}
```

Reference: [SpacetimeDB TypeScript Client SDK](https://spacetimedb.com/docs/sdks/typescript/)
