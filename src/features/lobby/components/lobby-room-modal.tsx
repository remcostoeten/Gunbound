"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomSession } from "../spacetime/use-room-session";
import { ROOM_STATUS } from "@/features/game/spacetime/room-status";
import { DEFAULT_MOBILE } from "@/features/game/mobiles/mobile-factory";
import { getMapPresentation, mapPresentationOptions, parseMapType } from "@/features/game/constants/map-presentation";
import type { MapType } from "@/features/game/types/shared";
import type { LobbyRoom, LobbyRoomSettings } from "../types";

type Props = {
  room: LobbyRoom;
  onClose: () => void;
  onStarted: (roomId: bigint) => void;
  onInvite: (roomId: bigint, username: string) => Promise<void>;
};

export function LobbyRoomModal({ room, onClose, onStarted, onInvite }: Props) {
  const session = useRoomSession(room.id);
  const [chatDraft, setChatDraft] = useState("");
  const [inviteDraft, setInviteDraft] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<LobbyRoomSettings>(() => getRoomSettings(room.settings));
  const [readyBusy, setReadyBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const autoMobileRef = useRef(false);
  const syncedSettingsRef = useRef<LobbyRoomSettings>(getRoomSettings(room.settings));

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
    if (session.room.status !== ROOM_STATUS.IN_MATCH) return;
    startedRef.current = true;
    onStarted(session.room.id);
  }, [session.room, onStarted]);

  useEffect(() => {
    if (!session.room) return;
    const nextSettings = getRoomSettings({
      mapType: parseMapType(session.room.mapType),
      targetScore: session.room.targetScore,
      roundLimit: session.room.roundLimit,
    });
    setSettingsDraft((currentDraft) => {
      const previousSynced = syncedSettingsRef.current;
      syncedSettingsRef.current = nextSettings;
      return settingsEqual(currentDraft, previousSynced) ? nextSettings : currentDraft;
    });
  }, [session.room]);

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

  async function saveSettings() {
    if (!session.isHost || !session.room || settingsBusy) return;
    setSettingsBusy(true);
    setError(null);
    try {
      await session.updateRoomSettings(settingsDraft);
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setSettingsBusy(false);
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

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!session.room || inviteBusy) return;
    const username = inviteDraft.trim();
    if (username.length === 0) return;
    setInviteBusy(true);
    setError(null);
    try {
      await onInvite(session.room.id, username);
      setInviteDraft("");
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setInviteBusy(false);
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
            <button className="gb-modal-x" onClick={leave}>✕</button>
          </div>
          <div className="gb-modal-body">
            <p className="gb-field-hint">
              This room has closed. Leave to clear your membership so you can join another.
            </p>
          </div>
          <div className="gb-modal-foot">
            <button className="gb-modal-btn gb-modal-btn-start" onClick={leave}>Leave</button>
          </div>
        </div>
      </div>
    );
  }

  const membersBySlot = new Map<number, typeof session.members[number]>();
  for (const member of session.members) {
    membersBySlot.set(member.slotIndex, member);
  }

  const slots: Array<{ key: string; member?: typeof session.members[number] }> = [];
  for (let i = 0; i < room.capacity; i += 1) {
    slots.push({ key: `slot-${i}`, member: membersBySlot.get(i) });
  }

  const everyoneReady =
    session.members.length === room.capacity &&
    session.members.every((m) => m.isReady && m.mobileType !== undefined);
  const startEnabled = session.isHost && everyoneReady && !startBusy;
  const youAreReady = session.self?.isReady === true;
  const currentSettings = getRoomSettings({
    mapType: parseMapType(session.room.mapType),
    targetScore: session.room.targetScore,
    roundLimit: session.room.roundLimit,
  });
  const settingsChanged =
    settingsDraft.mapType !== currentSettings.mapType ||
    settingsDraft.targetScore !== currentSettings.targetScore ||
    settingsDraft.roundLimit !== currentSettings.roundLimit;
  const settingsLocked = session.room.status !== ROOM_STATUS.WAITING;
  const selectedMap = getMapPresentation(settingsDraft.mapType);

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
            <span>Status: <b>{session.room.status === ROOM_STATUS.IN_MATCH ? "Playing" : "Waiting"}</b></span>
          </div>

          <form className="gb-room-invite" onSubmit={sendInvite}>
            <input
              value={inviteDraft}
              onChange={(e) => setInviteDraft(e.target.value)}
              placeholder="Invite username"
              maxLength={20}
              disabled={inviteBusy || session.room.status !== ROOM_STATUS.WAITING}
            />
            <button
              type="submit"
              disabled={inviteDraft.trim().length === 0 || inviteBusy || session.room.status !== ROOM_STATUS.WAITING}
            >
              {inviteBusy ? "Sending..." : "Invite"}
            </button>
          </form>

          <div className="gb-room-settings">
            <div className="gb-room-settings-head">
              <span>Room Settings</span>
              {!session.isHost && <b>{getMapPresentation(currentSettings.mapType).label}</b>}
            </div>
            {session.isHost ? (
              <>
                <div className="gb-room-settings-grid">
                  <label className="gb-field">
                    <span>Map</span>
                    <select
                      value={settingsDraft.mapType}
                      onChange={(e) => setSettingsDraft({
                        ...settingsDraft,
                        mapType: e.target.value as MapType,
                      })}
                      disabled={settingsBusy || settingsLocked}
                    >
                      {mapPresentationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="gb-field">
                    <span>Target Score</span>
                    <select
                      value={settingsDraft.targetScore}
                      onChange={(e) => setSettingsDraft({
                        ...settingsDraft,
                        targetScore: Number(e.target.value),
                      })}
                      disabled={settingsBusy || settingsLocked}
                    >
                      {TARGET_SCORE_OPTIONS.map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="gb-field">
                    <span>Round Limit</span>
                    <select
                      value={settingsDraft.roundLimit}
                      onChange={(e) => setSettingsDraft({
                        ...settingsDraft,
                        roundLimit: Number(e.target.value),
                      })}
                      disabled={settingsBusy || settingsLocked}
                    >
                      {ROUND_LIMIT_OPTIONS.map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="gb-room-settings-copy">
                  <span>{selectedMap.description}</span>
                  <button
                    type="button"
                    className="gb-pill"
                    onClick={saveSettings}
                    disabled={!settingsChanged || settingsBusy || settingsLocked}
                  >
                    {settingsBusy ? "Saving…" : "Apply"}
                  </button>
                </div>
              </>
            ) : (
              <div className="gb-room-settings-readonly">
                <span>Target <b>{currentSettings.targetScore}</b></span>
                <span>Rounds <b>{currentSettings.roundLimit}</b></span>
                <span>{getMapPresentation(currentSettings.mapType).description}</span>
              </div>
            )}
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

const TARGET_SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ROUND_LIMIT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

function getRoomSettings(settings: LobbyRoomSettings | undefined): LobbyRoomSettings {
  return {
    mapType: settings?.mapType ?? mapPresentationOptions[0].value,
    targetScore: settings?.targetScore ?? 2,
    roundLimit: settings?.roundLimit ?? 5,
  };
}

function settingsEqual(a: LobbyRoomSettings, b: LobbyRoomSettings): boolean {
  return a.mapType === b.mapType && a.targetScore === b.targetScore && a.roundLimit === b.roundLimit;
}
