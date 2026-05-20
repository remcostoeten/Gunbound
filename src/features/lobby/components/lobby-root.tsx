"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useSpacetimeDB } from "spacetimedb/react";
import { playTrack } from "@/lib/music-bus";
import { LobbyTopbar } from "./lobby-topbar";
import { LobbyActionRow } from "./lobby-action-row";
import { LobbyBody } from "./lobby-body";
import { LobbyChannelBar } from "./lobby-channel-bar";
import { LobbyBottom } from "./lobby-bottom";
import { LobbyRoomModal } from "./lobby-room-modal";
import { LobbyCreateModal } from "./lobby-create-modal";
import { LobbyToastStack } from "./lobby-toast-stack";
import { useLobbyState } from "../hooks/use-lobby-state";
import { useLobbyRooms, type LobbyRoomView } from "../spacetime/use-lobby-rooms";
import { useCurrentPlayer } from "@/features/game/spacetime";
import type { LobbyRoom } from "../types";

type Props = {
  username?: string | null;
  onReplay: () => void;
  onEnterBattle?: (roomId: bigint) => void;
};

function toLobbyRoom(view: LobbyRoomView): LobbyRoom {
  return {
    id: view.id,
    code: view.code,
    status: view.status === "in_round" ? "Playing" : "Waiting",
    hostName: view.hostName,
    memberCount: view.memberCount,
    capacity: view.capacity
  };
}

export function LobbyRoot({ username, onReplay, onEnterBattle }: Props) {
  const connection = useSpacetimeDB();
  const { player } = useCurrentPlayer();
  const selfName = player?.name?.trim() || username || null;
  const s = useLobbyState(selfName);
  const { rooms: roomViews, joinRoomByCode, quickJoin } = useLobbyRooms();

  const rooms = useMemo(() => roomViews.map(toLobbyRoom), [roomViews]);

  useEffect(() => {
    playTrack("lobby");
  }, []);

  useEffect(() => {
    if (!username) return;
    const desired = username.trim();
    if (desired.length === 0) return;
    if (player && player.name === desired) return;
    const conn = connection.getConnection();
    if (!conn) return;
    conn.reducers.setPlayerName({ name: desired }).catch(() => {
      // ignore — display falls back to Player-<hex>
    });
  }, [username, player, connection]);

  const handleRoomClick = useCallback(async (r: LobbyRoom) => {
    if (r.status === "Playing") {
      s.pushToast(`Room ${r.code} is already playing`);
      return;
    }
    if (r.memberCount >= r.capacity) {
      s.pushToast(`Room ${r.code} is full`);
      return;
    }
    try {
      await joinRoomByCode(r.code);
      s.setActiveRoom(r);
    } catch (e) {
      s.pushToast(messageFromError(e));
    }
  }, [joinRoomByCode, s]);

  const handleQuickjoin = useCallback(async () => {
    try {
      const target = await quickJoin();
      if (!target) {
        s.pushToast("No rooms to join");
        return;
      }
      s.setActiveRoom(toLobbyRoom(target));
    } catch (e) {
      s.pushToast(messageFromError(e));
    }
  }, [quickJoin, s]);

  const handleCreated = useCallback(async (code: string) => {
    // The newly created room will arrive via subscription; reflect immediately.
    const created = roomViews.find(r => r.code === code);
    if (created) {
      s.setActiveRoom(toLobbyRoom(created));
    } else {
      // Subscription may not have flushed yet — push a toast and rely on the
      // re-render to surface the modal once the row lands.
      s.pushToast(`Created room ${code}`);
    }
  }, [roomViews, s]);

  const handleStarted = useCallback((roomId: bigint) => {
    s.setActiveRoom(null);
    if (onEnterBattle) onEnterBattle(roomId);
  }, [onEnterBattle, s]);

  return (
    <div className="gb-root">
      <div className="gb-sky" />
      <div className="gb-clouds" />

      <div className="gb-frame">
        <LobbyTopbar
          onExit={onReplay}
          onIconClick={(label) => s.pushToast(`${label} is not available yet`)}
        />
        <LobbyActionRow
          onWaiting={() => s.pushToast("You are now waiting for an invite")}
          onQuickjoin={handleQuickjoin}
          onCreate={() => s.setCreating(true)}
          onFriend={() => s.pushToast("Friend list coming soon")}
          onSearch={() => s.pushToast("Enter a room number…")}
        />
        <LobbyBody
          rooms={rooms}
          onRoomClick={handleRoomClick}
          onBuddyClick={(name) => { s.setWhisperTo(name); s.pushToast(`Whisper to ${name}`); }}
        />
        <LobbyChannelBar channel={s.channel} onSelect={s.selectChannel} />
        <LobbyBottom
          onBack={onReplay}
          messages={s.messages}
          onSend={s.sendChat}
          whisperTo={s.whisperTo}
          onClearWhisper={() => s.setWhisperTo(null)}
        />
      </div>

      {s.activeRoom && (
        <LobbyRoomModal
          room={s.activeRoom}
          onClose={() => s.setActiveRoom(null)}
          onStarted={handleStarted}
        />
      )}
      {s.creating && (
        <LobbyCreateModal
          onClose={() => s.setCreating(false)}
          onCreated={handleCreated}
        />
      )}

      <LobbyToastStack toasts={s.toasts} />
    </div>
  );
}

function messageFromError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
