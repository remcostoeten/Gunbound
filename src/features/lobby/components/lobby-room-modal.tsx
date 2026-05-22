"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomSession } from "../spacetime/use-room-session";
import { ROOM_STATUS } from "@/features/game/spacetime/room-status";
import { getMapPresentation, mapPresentationOptions, parseMapType } from "@/features/game/constants/map-presentation";
import { getMobilePresentation, mobilePresentationOptions } from "@/features/game/constants/mobile-presentation";
import { getMobileSpriteSource, shouldFlipMobileSprite } from "@/features/game/engine/mobile-sprites";
import type { MapType, MobileType, TurnDurationMode } from "@/features/game/types/shared";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { LobbyRoom, LobbyRoomSettings } from "../types";

type Props = {
  room: LobbyRoom;
  onDismiss: () => void;
  onLeave: () => void;
  onStarted: (roomId: bigint) => void;
  onInvite: (roomId: bigint, username: string) => Promise<void>;
};

export function LobbyRoomModal({ room, onDismiss, onLeave, onStarted, onInvite }: Props) {
  const session = useRoomSession(room.id);
  const [chatDraft, setChatDraft] = useState("");
  const [inviteDraft, setInviteDraft] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<LobbyRoomSettings>(() => getRoomSettings(room.settings));
  const [readyBusy, setReadyBusy] = useState(false);
  const [mobileBusy, setMobileBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const syncedSettingsRef = useRef<LobbyRoomSettings>(getRoomSettings(room.settings));

  useEffect(() => {
    chatBodyRef.current?.scrollTo({
      top: chatBodyRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [session.chat.length]);

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
      turnDurationMode: parseTurnDurationMode(session.room.turnDurationMode),
    });
    setSettingsDraft((currentDraft) => {
      const previousSynced = syncedSettingsRef.current;
      syncedSettingsRef.current = nextSettings;
      return settingsEqual(currentDraft, previousSynced) ? nextSettings : currentDraft;
    });
  }, [session.room]);

  async function toggleReady() {
    if (!session.self || readyBusy) return;
    if (!session.self.isReady && session.self.mobileType === undefined) {
      setError("Choose a character before readying up.");
      return;
    }
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
    onLeave();
  }

  async function chooseMobile(mobileType: MobileType) {
    if (!session.self || mobileBusy || session.self.isReady) return;
    if (session.room && session.room.status !== ROOM_STATUS.WAITING) return;
    if (session.self.mobileType === mobileType) return;
    setMobileBusy(true);
    setError(null);
    try {
      await session.selectMobile(mobileType);
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setMobileBusy(false);
    }
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
      <div className="gb-modal-back" onClick={onDismiss}>
        <div className="gb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gb-modal-head">
          <span className="gb-modal-name">Joining {room.code}…</span>
          <div className="gb-modal-head-actions">
            <button type="button" className="gb-modal-min" onClick={onDismiss} aria-label="Minimize">−</button>
          </div>
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
      <div className="gb-modal-back" onClick={onDismiss}>
        <div className="gb-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gb-modal-head">
            <span className="gb-modal-name">Room not available</span>
            <div className="gb-modal-head-actions">
              <button type="button" className="gb-modal-min" onClick={onDismiss} aria-label="Minimize">−</button>
              <button type="button" className="gb-modal-x" onClick={leave} aria-label="Leave room">✕</button>
            </div>
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
  const yourMobile = session.self?.mobileType;
  const yourMobilePresentation = yourMobile ? getMobilePresentation(yourMobile) : null;
  const settingsLocked = session.room.status !== ROOM_STATUS.WAITING;
  const mobileSelectionLocked = settingsLocked || youAreReady;
  const currentSettings = getRoomSettings({
    mapType: parseMapType(session.room.mapType),
    targetScore: session.room.targetScore,
    roundLimit: session.room.roundLimit,
    turnDurationMode: parseTurnDurationMode(session.room.turnDurationMode),
  });
  const settingsChanged =
    settingsDraft.mapType !== currentSettings.mapType ||
    settingsDraft.targetScore !== currentSettings.targetScore ||
    settingsDraft.roundLimit !== currentSettings.roundLimit ||
    settingsDraft.turnDurationMode !== currentSettings.turnDurationMode;
  const selectedMap = getMapPresentation(settingsDraft.mapType);

  return (
    <div className="gb-modal-back" onClick={onDismiss}>
      <div className="gb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gb-modal-head">
          <span className="gb-modal-no">{session.room.code}</span>
          <span className="gb-modal-name">Host: {session.members.find(m => m.isHost)?.name ?? "—"}</span>
          <div className="gb-modal-head-actions">
            <button type="button" className="gb-modal-min" onClick={onDismiss} aria-label="Minimize">−</button>
            <button type="button" className="gb-modal-x" onClick={leave} aria-label="Leave room">✕</button>
          </div>
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
                {m.mobileType ? (
                  <div
                    className="gb-slot-mobile-sprite"
                    aria-hidden="true"
                    style={getMobileSpriteStyle(m.mobileType)}
                  />
                ) : (
                  <div className="gb-slot-mobile-sprite gb-slot-mobile-sprite-empty" aria-hidden="true" />
                )}
                <span className="gb-slot-tag">{m.isHost ? "HOST" : `P${index + 1}`}</span>
                <div className="gb-slot-copy">
                  <span className="gb-slot-name">
                    {m.name}{m.isSelf ? " (You)" : ""}
                  </span>
                  <span className="gb-slot-mobile-label">
                    {m.mobileType ? getMobilePresentation(m.mobileType).label : "No character selected"}
                  </span>
                </div>
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

          <div className="gb-mobile-picker">
            <div className="gb-mobile-picker-head">
              <span>Choose Character</span>
              {yourMobilePresentation ? (
                <b>{yourMobilePresentation.label}</b>
              ) : (
                <span className="gb-mobile-picker-hint">Pick one before ready</span>
              )}
            </div>
            <div className="gb-mobile-grid" role="listbox" aria-label="Character selection">
              {mobilePresentationOptions.map((option) => {
                const selected = yourMobile === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`gb-mobile-option${selected ? " gb-mobile-option-on" : ""}`}
                    disabled={mobileBusy || mobileSelectionLocked}
                    onClick={() => chooseMobile(option.value)}
                    title={option.profile}
                  >
                    <div
                      className="gb-mobile-option-sprite"
                      aria-hidden="true"
                      style={getMobileSpriteStyle(option.value)}
                    />
                    <span className="gb-mobile-option-name">{option.label}</span>
                    <span className="gb-mobile-option-meta">{option.role}</span>
                  </button>
                );
              })}
            </div>
            {yourMobilePresentation ? (
              <p className="gb-mobile-picker-detail">
                {yourMobilePresentation.profile} HP {yourMobilePresentation.hp} · Move {yourMobilePresentation.move} · Shot {yourMobilePresentation.shot}
              </p>
            ) : (
              <p className="gb-mobile-picker-detail">
                Select your mobile. Both players need a character before the host can start.
              </p>
            )}
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
                    <Select
                      value={settingsDraft.mapType}
                      onValueChange={(value) => setSettingsDraft({
                        ...settingsDraft,
                        mapType: value as MapType,
                      })}
                      disabled={settingsBusy || settingsLocked}
                    >
                      <SelectTrigger className="gb-map-select-trigger" aria-label="Select map">
                        <span className="gb-map-select-current">
                          <img src={selectedMap.previewImage} alt="" aria-hidden="true" />
                          <span>{selectedMap.label}</span>
                        </span>
                      </SelectTrigger>
                      <SelectContent className="gb-map-select-content" align="start">
                        {mapPresentationOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="gb-map-select-item">
                            <span className="gb-map-select-option">
                              <img src={option.previewImage} alt="" aria-hidden="true" />
                              <span>
                                <b>{option.label}</b>
                                <small>{option.description}</small>
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <label className="gb-field">
                    <span>Turn Duration</span>
                    <select
                      value={settingsDraft.turnDurationMode}
                      onChange={(e) => setSettingsDraft({
                        ...settingsDraft,
                        turnDurationMode: e.target.value as TurnDurationMode,
                      })}
                      disabled={settingsBusy || settingsLocked}
                    >
                      {TURN_DURATION_MODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="gb-room-settings-copy">
                  <span>{selectedMap.description} {getTurnDurationModeDescription(settingsDraft.turnDurationMode)}</span>
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
                <span>Turns <b>{getTurnDurationModeLabel(currentSettings.turnDurationMode)}</b></span>
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
            disabled={readyBusy || !session.self || (!youAreReady && yourMobile === undefined)}
            title={yourMobile === undefined ? "Choose a character first" : undefined}
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
                  ? session.members.some((member) => member.mobileType === undefined)
                    ? "Both players must choose a character and ready up"
                    : "Both players must be ready"
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
const TURN_DURATION_MODE_OPTIONS: Array<{ value: TurnDurationMode; label: string; description: string }> = [
  {
    value: "timed",
    label: "Timed",
    description: "Current flow: reposition or take the shot before time expires.",
  },
  {
    value: "infinite",
    label: "Infinite",
    description: "Async flow: players can close and resume later on their turn.",
  },
];

function getRoomSettings(settings: LobbyRoomSettings | undefined): LobbyRoomSettings {
  return {
    mapType: settings?.mapType ?? mapPresentationOptions[0].value,
    targetScore: settings?.targetScore ?? 2,
    roundLimit: settings?.roundLimit ?? 5,
    turnDurationMode: settings?.turnDurationMode ?? "timed",
  };
}

function settingsEqual(a: LobbyRoomSettings, b: LobbyRoomSettings): boolean {
  return (
    a.mapType === b.mapType &&
    a.targetScore === b.targetScore &&
    a.roundLimit === b.roundLimit &&
    a.turnDurationMode === b.turnDurationMode
  );
}

function parseTurnDurationMode(value: string | undefined): TurnDurationMode {
  return value === "infinite" || value === "timed" ? value : "timed";
}

function getTurnDurationModeLabel(value: TurnDurationMode): string {
  return TURN_DURATION_MODE_OPTIONS.find((option) => option.value === value)?.label ?? TURN_DURATION_MODE_OPTIONS[0].label;
}

function getTurnDurationModeDescription(value: TurnDurationMode): string {
  return TURN_DURATION_MODE_OPTIONS.find((option) => option.value === value)?.description ?? TURN_DURATION_MODE_OPTIONS[0].description;
}

function getMobileSpriteStyle(mobileType: MobileType): React.CSSProperties {
  const spriteSource = getMobileSpriteSource(mobileType);
  const scaleX = shouldFlipMobileSprite(mobileType, 1) ? -spriteSource.roomScale : spriteSource.roomScale;

  return {
    backgroundImage: `url("${spriteSource.path}")`,
    backgroundPosition: "0 0",
    backgroundRepeat: "no-repeat",
    backgroundSize: `${String(spriteSource.frameCount * 100)}% 100%`,
    transform:
      `scale(${String(scaleX)}, ${String(spriteSource.roomScale)}) translate(${String(spriteSource.roomTranslateX)}px, ${String(spriteSource.roomTranslateY)}px)`,
  };
}
