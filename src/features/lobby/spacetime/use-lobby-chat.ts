"use client";

import { useCallback, useMemo } from "react";
import { useSpacetimeDB, useTable } from "spacetimedb/react";

import { tables } from "@/features/game/spacetime";
import type { LobbyChatMsg } from "../types";

const MAX_VISIBLE_MESSAGES = 200;

export function useLobbyChat(channel: number): {
  messages: LobbyChatMsg[];
  isReady: boolean;
  sendChat(text: string): Promise<void>;
  sendFriendRequest(username: string): Promise<void>;
} {
  const connection = useSpacetimeDB();
  const identity = connection.identity;

  const chatQuery = useMemo(() => {
    return tables.lobbyChatMessage.where((message) => message.channel.eq(channel));
  }, [channel]);

  const [chatRows, isReady] = useTable(chatQuery);
  const [players] = useTable(tables.player);

  const playerNameByHex = useMemo(() => {
    const map = new Map<string, string>();
    for (const player of players) {
      map.set(player.identity.toHexString(), player.name);
    }
    return map;
  }, [players]);

  const messages = useMemo<LobbyChatMsg[]>(() => {
    const sorted = [...chatRows].sort((a, b) => {
      const ax = a.createdAt.microsSinceUnixEpoch;
      const bx = b.createdAt.microsSinceUnixEpoch;
      if (ax > bx) return 1;
      if (ax < bx) return -1;
      return 0;
    });

    return sorted.slice(-MAX_VISIBLE_MESSAGES).map<LobbyChatMsg>((message) => {
      const senderHex = message.senderIdentity.toHexString();
      const author = playerNameByHex.get(senderHex);
      return {
        id: message.id.toString(),
        author: author && author.trim().length > 0 ? author : `Player-${senderHex.slice(0, 4)}`,
        text: message.message,
        tone: identity && senderHex === identity.toHexString() ? "self" : "other",
      };
    });
  }, [chatRows, identity, playerNameByHex]);

  const sendChat = useCallback(
    async (text: string): Promise<void> => {
      const conn = connection.getConnection();
      if (!conn) throw new Error("not connected");
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      if (trimmed.startsWith("/add ")) {
        const username = trimmed.slice("/add ".length).trim().split(/\s+/, 1)[0] ?? "";
        if (!username) throw new Error("usage: /add username");
        await conn.reducers.sendFriendRequest({ username });
        return;
      }
      if (trimmed.startsWith("/w ")) {
        throw new Error("private whispers are not persistent yet");
      }
      if (trimmed.startsWith("/")) {
        throw new Error("unknown command");
      }
      await conn.reducers.sendLobbyChat({ channel, message: trimmed });
    },
    [channel, connection],
  );

  const sendFriendRequest = useCallback(
    async (username: string): Promise<void> => {
      const conn = connection.getConnection();
      if (!conn) throw new Error("not connected");
      await conn.reducers.sendFriendRequest({ username: username.trim() });
    },
    [connection],
  );

  return { messages, isReady, sendChat, sendFriendRequest };
}
