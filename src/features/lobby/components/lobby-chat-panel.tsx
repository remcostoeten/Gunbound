"use client";

import { useEffect, useRef, useState } from "react";
import type { LobbyChatMsg } from "../hooks/use-lobby-state";

type Props = {
  messages: LobbyChatMsg[];
  onSend: (text: string) => void;
  whisperTo: string | null;
  onClearWhisper: () => void;
  onFriendRequestResponse: (requestId: bigint, accept: boolean) => void;
};

export function LobbyChatPanel({ messages, onSend, whisperTo, onClearWhisper, onFriendRequestResponse }: Props) {
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = whisperTo ? `/w ${whisperTo} ${draft}` : draft;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="gb-chat">
      <div className="gb-chat-head">
        <span className="gb-chat-icon">💬</span>
        <span className="gb-chat-title">CHAT</span>
        <span className="gb-chat-pin">📌</span>
        <div className="gb-chat-spacer" />
        <span className="gb-chat-mute">🔕</span>
        <span className="gb-chat-mute">🚫</span>
      </div>
      <div className="gb-chat-body" ref={bodyRef}>
        {messages.map((m) => (
          <p key={m.id} className={`gb-msg gb-msg-${m.tone}`}>
            <b>{m.author}:</b> <span>{m.text}</span>
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
        ))}
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
