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
  const [channel, setChannel] = useState(3);
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

  const selectChannel = useCallback((n: number) => {
    setChannel(n);
    pushToast(`Switched to Channel ${n}`);
    setMessages((m) => [
      ...m,
      { id: ++chatSeq, author: "SYSTEM", text: `Joined Channel ${n}.`, tone: "system" },
    ]);
  }, [pushToast]);

  return {
    channel, selectChannel,
    activeRoom, setActiveRoom,
    creating, setCreating,
    whisperTo, setWhisperTo,
    toasts, pushToast,
    messages, sendChat,
  };
}
