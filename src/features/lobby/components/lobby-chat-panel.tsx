"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampLobbyChatHeight,
  getLobbyChatHeightPx,
  setLobbyChatHeightPx,
} from "@/lib/display-settings";
import { chatTimestampToIso, formatChatTimestamp } from "../lib/format-chat-timestamp";
import type { LobbyChatMsg } from "../hooks/use-lobby-state";

type Props = {
  messages: LobbyChatMsg[];
  onSend: (text: string) => void;
  whisperTo: string | null;
  onClearWhisper: () => void;
  onFriendRequestResponse: (requestId: bigint, accept: boolean) => void;
};

export function LobbyChatPanel({
  messages,
  onSend,
  whisperTo,
  onClearWhisper,
  onFriendRequestResponse,
}: Props) {
  const [draft, setDraft] = useState("");
  const [chatHeight, setChatHeight] = useState(() => getLobbyChatHeightPx());
  const bodyRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const finishResize = useCallback(() => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    setLobbyChatHeightPx(chatHeight);
  }, [chatHeight]);

  const onResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { startY: e.clientY, startHeight: chatHeight };
  }, [chatHeight]);

  const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return;
    const deltaY = resizeRef.current.startY - e.clientY;
    setChatHeight(clampLobbyChatHeight(resizeRef.current.startHeight + deltaY));
  }, []);

  const onResizePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      finishResize();
    },
    [finishResize],
  );

  const onResizeLostPointerCapture = useCallback(() => {
    finishResize();
  }, [finishResize]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = whisperTo ? `/w ${whisperTo} ${draft}` : draft;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="gb-chat" style={{ height: chatHeight }}>
      <div
        className="gb-chat-resize"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize chat"
        aria-valuemin={120}
        aria-valuemax={480}
        aria-valuenow={chatHeight}
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizeLostPointerCapture}
        onLostPointerCapture={onResizeLostPointerCapture}
      >
        <span className="gb-chat-resize-grip" aria-hidden="true" />
      </div>
      <div className="gb-chat-head">
        <span className="gb-chat-icon">💬</span>
        <span className="gb-chat-title">CHAT</span>
        <span className="gb-chat-pin">📌</span>
        <div className="gb-chat-spacer" />
        <span className="gb-chat-mute">🔕</span>
        <span className="gb-chat-mute">🚫</span>
      </div>
      <div className="gb-chat-body" ref={bodyRef}>
        {messages.map((m) => {
          const timestamp = formatChatTimestamp(m.createdAtMicros);
          return (
            <p key={m.id} className={`gb-msg gb-msg-${m.tone}`}>
              {timestamp && m.createdAtMicros !== undefined ? (
                <time className="gb-msg-time" dateTime={chatTimestampToIso(m.createdAtMicros)}>
                  {timestamp}
                </time>
              ) : null}
              <span className="gb-msg-content">
                <b>{m.author}:</b> <span>{m.text}</span>
              </span>
              {m.friendRequest && (
                <span className="gb-chat-request-actions">
                  <button type="button" onClick={() => onFriendRequestResponse(m.friendRequest!.id, true)}>
                    Accept
                  </button>
                  <button type="button" onClick={() => onFriendRequestResponse(m.friendRequest!.id, false)}>
                    Decline
                  </button>
                </span>
              )}
            </p>
          );
        })}
      </div>
      <form className="gb-chat-foot" onSubmit={submit}>
        {whisperTo ? (
          <button type="button" className="gb-chat-whisper" onClick={onClearWhisper}>
            → {whisperTo} ✕
          </button>
        ) : (
          <span className="gb-chat-foot-tab">All</span>
        )}
        <input
          className="gb-chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={whisperTo ? `Whisper to ${whisperTo}…` : "Say something or /add username"}
          maxLength={140}
        />
        <button type="submit" className="gb-chat-send">Send</button>
      </form>
    </div>
  );
}
