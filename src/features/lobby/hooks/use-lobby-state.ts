import { useCallback, useEffect, useState } from "react";

import { getLobbyDataSource } from "../data";
import type { LobbyChatMsg, LobbyRoom } from "../types";

export type { LobbyChatMsg } from "../types";

export type LobbyToast = {
  id: number;
  text: string;
};

let toastSeq = 0;
let chatSeq = 1000;

export function useLobbyState(selfName?: string | null, emptyDataEnabled = false) {
  const [activeRoom, setActiveRoom] = useState<LobbyRoom | null>(null);
  const [creating, setCreating] = useState(false);
  const [whisperTo, setWhisperTo] = useState<string | null>(null);
  const [toasts, setToasts] = useState<LobbyToast[]>([]);
  const [messages, setMessages] = useState<LobbyChatMsg[]>(() =>
    getLobbyDataSource(emptyDataEnabled).getInitialMessages()
  );

  useEffect(() => {
    setMessages(getLobbyDataSource(emptyDataEnabled).getInitialMessages());
  }, [emptyDataEnabled]);

  const pushToast = useCallback((text: string) => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);

  const sendChat = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const author = selfName?.trim() || "You";
    setMessages((m) => [...m, { id: ++chatSeq, author, text: trimmed, tone: "self" }]);
  }, [selfName]);

  return {
    activeRoom, setActiveRoom,
    creating, setCreating,
    whisperTo, setWhisperTo,
    toasts, pushToast,
    messages, sendChat,
  };
}
