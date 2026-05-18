---
title: Connection Lifecycle Management
impact: MEDIUM-HIGH
impactDescription: Ensures reliable real-time sync and user experience
tags: client, connection, lifecycle, reconnection
---

## Connection Lifecycle Management

**Impact: MEDIUM-HIGH (Ensures reliable real-time sync and user experience)**

Properly handle connection, disconnection, and reconnection events on the client. This ensures users see accurate connection status and data syncs correctly after reconnection.

**Incorrect (ignoring connection events):**

```typescript
// No connection state handling - using old API
import { DbConnection } from './generated';

// Just connect and hope for the best
const conn = DbConnection.builder()
  .withUri('ws://localhost:3000')
  .withModuleName('my-module')
  .build();

// No handling of disconnects or errors
// User has no idea if they're connected or not
```

**Correct (comprehensive connection lifecycle):**

```typescript
import { DbConnection, Identity } from './generated';

// Connection state management
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

class GameClient {
  private conn: DbConnection | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private onStateChange: (state: ConnectionState) => void;
  private currentChannelId: string | null = null;
  private identity: Identity | null = null;
  private token: string | null = null;

  constructor(onStateChange: (state: ConnectionState) => void) {
    this.onStateChange = onStateChange;
  }

  async connect() {
    this.connectionState = 'connecting';
    this.onStateChange('connecting');

    try {
      this.conn = DbConnection.builder()
        .withUri('ws://localhost:3000')
        .withModuleName('game-module')
        .onConnect((ctx, identity, token) => {
          console.log('Connected to SpacetimeDB');
          this.identity = identity;
          this.token = token;
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.onStateChange('connected');

          // Re-establish subscriptions after connection
          this.setupSubscriptions();
        })
        .onDisconnect((ctx, error) => {
          console.log('Disconnected from SpacetimeDB', error);

          if (this.connectionState === 'connected') {
            // Unexpected disconnect - attempt reconnection
            this.connectionState = 'reconnecting';
            this.onStateChange('reconnecting');
            this.attemptReconnect();
          } else {
            this.connectionState = 'disconnected';
            this.onStateChange('disconnected');
          }
        })
        .onConnectError((ctx, error) => {
          console.error('SpacetimeDB connection error:', error);
          this.connectionState = 'disconnected';
          this.onStateChange('disconnected');
        })
        .build();
    } catch (error) {
      console.error('Initial connection failed:', error);
      this.connectionState = 'disconnected';
      this.onStateChange('disconnected');
      throw error;
    }
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.connectionState = 'disconnected';
      this.onStateChange('disconnected');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.attemptReconnect();
    }
  }

  private setupSubscriptions() {
    if (!this.conn || !this.identity) return;

    // Re-subscribe to relevant data after connection
    this.conn.subscription(['SELECT * FROM player WHERE isOnline = true']);

    if (this.currentChannelId) {
      this.conn.subscription([
        'SELECT * FROM message WHERE channelId = ?',
        this.currentChannelId
      ]);
    }
  }

  setCurrentChannel(channelId: string) {
    this.currentChannelId = channelId;
    if (this.conn && this.connectionState === 'connected') {
      this.conn.subscription([
        'SELECT * FROM message WHERE channelId = ?',
        channelId
      ]);
    }
  }

  disconnect() {
    this.connectionState = 'disconnected';
    this.conn = null;
    this.onStateChange('disconnected');
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getConnection(): DbConnection | null {
    return this.conn;
  }
}

export { GameClient, ConnectionState };
```

```typescript
// React hook for connection state
import { useState, useEffect, useRef } from 'react';
import { GameClient, ConnectionState } from './GameClient';

function useConnectionState() {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const clientRef = useRef<GameClient | null>(null);

  useEffect(() => {
    clientRef.current = new GameClient(setState);
    clientRef.current.connect();

    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  return { state, client: clientRef.current };
}

// Connection status indicator component
function ConnectionStatus() {
  const { state } = useConnectionState();

  const statusMap = {
    disconnected: { color: 'red', text: 'Offline' },
    connecting: { color: 'yellow', text: 'Connecting...' },
    connected: { color: 'green', text: 'Connected' },
    reconnecting: { color: 'orange', text: 'Reconnecting...' }
  };

  const status = statusMap[state];

  return (
    <div style={{ color: status.color }}>
      {status.text}
    </div>
  );
}

export { useConnectionState, ConnectionStatus };
```

Reference: [SpacetimeDB TypeScript Client SDK](https://spacetimedb.com/docs/sdks/typescript/quickstart)
