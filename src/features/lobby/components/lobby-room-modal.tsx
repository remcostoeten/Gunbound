"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomSession } from "../spacetime/use-room-session";
import { DEFAULT_MOBILE } from "@/features/game/mobiles/mobile-factory";
import type { LobbyRoom } from "../types";

type Props = {
  room: LobbyRoom;
  onClose: () => void;
  onStarted: (roomId: bigint) => void;
};

export function LobbyRoomModal({ room, onClose, onStarted }: Props) {
  const session = useRoomSession(room.id);
  const [chatDraft, setChatDraft] = useState("");
  const [readyBusy, setReadyBusy] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const autoMobileRef = useRef(false);

  useEffect(() => {
    chatBodyRef.current?.scrollTo({
      top: chatBodyRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [session.chat.length]);

  useEffect(() => {
    if (autoMobileRef.current) return;
    if (!session.self) return;
    if (session.self.mobileType !== undefined) {
      autoMobileRef.current = true;
      return;
    }
    autoMobileRef.current = true;
    session.selectMobile(DEFAULT_MOBILE).catch((e) => {
      autoMobileRef.current = false;
      setError(messageFromError(e));
    });
  }, [session]);

  useEffect(() => {
    if (startedRef.current) return;
    if (!session.room) return;
    if (session.room.status !== "in_match") return;
    startedRef.current = true;
    onStarted(session.room.id);
  }, [session.room, onStarted]);

  async function toggleReady() {
    if (!session.self || readyBusy) return;
    setReadyBusy(true);
    setError(null);
    try {
      await session.setReady(!session.self.isReady);
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setReadyBusy(false);
    }
  }

  async function start() {
    if (!session.isHost || startBusy) return;
    setStartBusy(true);
    setError(null);
    try {
      await session.startRound();
    } catch (e) {
      setError(messageFromError(e));
      setStartBusy(false);
    }
  }

  async function leave() {
    setError(null);
    try {
      await session.leave();
    } catch {
      // ignore — closing anyway
    }
    onClose();
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const text = chatDraft;
    setChatDraft("");
    try {
      await session.sendChat(text);
    } catch (err) {
      setError(messageFromError(err));
    }
  }

  if (!session.isLoaded) {
    return (
      <div className="gb-modal-back" onClick={onClose}>
        <div className="gb-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gb-modal-head">
            <span className="gb-modal-name">Joining {room.code}…</span>
          </div>
          <div className="gb-modal-body">
            <p className="gb-field-hint">Connecting to room.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session.room) {
    return (
      <div className="gb-modal-back" onClick={onClose}>
        <div className="gb-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gb-modal-head">
            <span className="gb-modal-name">Room not available</span>
            <button className="gb-modal-x" onClick={onClose}>✕</button>
          </div>
          <div className="gb-modal-body">
            <p className="gb-field-hint">This room may have closed. Try another.</p>
          </div>
          <div className="gb-modal-foot">
            <button className="gb-modal-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const slots: Array<{ key: string; member?: typeof session.members[number] }> = [];
  for (let i = 0; i < room.capacity; i += 1) {
    slots.push({
      key: `slot-${i}`,
      member: session.members.find((m) => m.slotIndex === i)
    });
  }

  const everyoneReady =
    session.members.length === room.capacity &&
    session.members.every((m) => m.isReady && m.mobileType !== undefined);
  const startEnabled = session.isHost && everyoneReady && !startBusy;
  const youAreReady = session.self?.isReady === true;

  return (
    <div className="gb-modal-back" onClick={onClose}>
      <div className="gb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gb-modal-head">
          <span className="gb-modal-no">{session.room.code}</span>
          <span className="gb-modal-name">Host: {session.members.find(m => m.isHost)?.name ?? "—"}</span>
          <button className="gb-modal-x" onClick={leave}>✕</button>
        </div>
        <div className="gb-modal-body">
          {slots.map((slot, index) => {
            const m = slot.member;
            if (!m) {
              return (
                <div key={slot.key} className="gb-slot gb-slot-empty">
                  <span>Waiting for player…</span>
                </div>
              );
            }
            return (
              <div
                key={slot.key}
                className={`gb-slot ${m.isHost ? "gb-slot-host" : ""}`}
              >
                <span className="gb-slot-tag">{m.isHost ? "HOST" : `P${index + 1}`}</span>
                <span className="gb-slot-name">
                  {m.name}{m.isSelf ? " (You)" : ""}
                </span>
                <span className={`gb-slot-state ${m.isReady ? "gb-slot-on" : ""}`}>
                  {m.isReady ? "READY" : "Waiting"}
                </span>
              </div>
            );
          })}

          <div className="gb-modal-meta">
            <span>Code: <b>{session.room.code}</b></span>
            <span>Players: <b>{session.members.length}/{room.capacity}</b></span>
            <span>Status: <b>{session.room.status === "in_match" ? "Playing" : "Waiting"}</b></span>
          </div>

          <div className="gb-chat gb-chat-inroom">
            <div className="gb-chat-head">
              <span className="gb-chat-icon">💬</span>
              <span className="gb-chat-title">ROOM CHAT</span>
            </div>
            <div className="gb-chat-body" ref={chatBodyRef}>
              {session.chat.length === 0 ? (
                <p className="gb-msg gb-msg-system">
                  <b>SYSTEM:</b> <span>Say hi to your opponent.</span>
                </p>
              ) : (
                session.chat.map((m) => (
                  <p
                    key={m.id.toString()}
                    className={`gb-msg gb-msg-${m.isSelf ? "self" : "other"}`}
                  >
                    <b>{m.authorName}:</b> <span>{m.text}</span>
                  </p>
                ))
              )}
            </div>
            <form className="gb-chat-foot" onSubmit={sendChat}>
              <span className="gb-chat-foot-tab">Room</span>
              <input
                className="gb-chat-input"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Type a message…"
                maxLength={200}
              />
              <button type="submit" className="gb-chat-send" disabled={chatDraft.trim().length === 0}>
                Send
              </button>
            </form>
          </div>

          {error && <p className="gb-field-error">{error}</p>}
        </div>
        <div className="gb-modal-foot">
          <button
            className={`gb-modal-btn gb-modal-btn-ready ${youAreReady ? "on" : ""}`}
            onClick={toggleReady}
            disabled={readyBusy || !session.self}
          >
            {youAreReady ? "Cancel Ready" : "Ready"}
          </button>
          {session.isHost && (
            <button
              className="gb-modal-btn gb-modal-btn-start"
              disabled={!startEnabled}
              onClick={start}
              title={
                !everyoneReady
                  ? "Both players must be ready"
                  : undefined
              }
            >
              {startBusy ? "Starting…" : "Start"}
            </button>
          )}
          <button className="gb-modal-btn" onClick={leave}>Leave</button>
        </div>
      </div>
    </div>
  );
}

function messageFromError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
