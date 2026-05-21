"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";
import { playTrack, registerTrack } from "@/lib/music-bus";
import { LobbyTopbar } from "./lobby-topbar";
import { LobbyActionRow } from "./lobby-action-row";
import { LobbyBody } from "./lobby-body";
import { LobbyBottom } from "./lobby-bottom";
import { LobbyRoomModal } from "./lobby-room-modal";
import { LobbyCreateModal } from "./lobby-create-modal";
import { LobbyInboxModal } from "./lobby-inbox-modal";
import { LobbyToastStack } from "./lobby-toast-stack";
import { useLobbyState } from "../hooks/use-lobby-state";
import { useLobbyChat } from "../spacetime/use-lobby-chat";
import { useLobbyFriends, type IncomingRoomInviteView } from "../spacetime/use-lobby-friends";
import { useLobbyRooms, type LobbyRoomView } from "../spacetime/use-lobby-rooms";
import { ROOM_STATUS, useCurrentPlayer, useEmptyDataMode, usePlayerCountrySync } from "@/features/game/spacetime";
import type { LobbyChatMsg } from "../types";
import type { LobbyRoom } from "../types";

type Props = {
  username?: string | null;
  onReplay: () => void;
  onEnterBattle?: (roomId: bigint) => void;
};

const lobbyMp3 = "/audio/lobby.mp3";

function toLobbyRoom(view: LobbyRoomView): LobbyRoom {
  return {
    id: view.id,
    code: view.code,
    status: view.status === ROOM_STATUS.IN_MATCH ? "Playing" : "Waiting",
    hostName: view.hostName,
    memberCount: view.memberCount,
    capacity: view.capacity,
    settings: view.settings
  };
}

export function LobbyRoot({ username, onReplay, onEnterBattle }: Props) {
  const connection = useSpacetimeDB();
  const [inboxOpen, setInboxOpen] = useState(false);
  const { player } = useCurrentPlayer();
  usePlayerCountrySync();
  const emptyDataMode = useEmptyDataMode();
  const selfName = player?.name?.trim() || username || null;
  const s = useLobbyState(selfName, emptyDataMode.enabled);
  const { rooms: roomViews, joinRoomByCode, quickJoin } = useLobbyRooms();
  const lobbyChat = useLobbyChat(1);
  const lobbyFriends = useLobbyFriends();

  const rooms = useMemo(() => roomViews.map(toLobbyRoom), [roomViews]);
  const messages = useMemo<LobbyChatMsg[]>(() => {
    const requestMessages = lobbyFriends.incomingRequests.map<LobbyChatMsg>((request) => ({
      id: `friend-request-${request.id.toString()}`,
      author: "SYSTEM",
      text: `${request.requesterName} wants to add you as a friend.`,
      tone: "system",
      createdAtMicros: request.createdAtMicros,
      friendRequest: {
        id: request.id,
        requesterName: request.requesterName,
      },
    }));
    const roomInviteMessages = lobbyFriends.incomingRoomInvites.map<LobbyChatMsg>((invite) => ({
      id: `room-invite-${invite.id.toString()}`,
      author: "SYSTEM",
      text: `${invite.requesterName} invited you to room ${invite.roomCode}.`,
      tone: "system",
      createdAtMicros: invite.createdAtMicros,
    }));
    return [...lobbyChat.messages, ...requestMessages, ...roomInviteMessages].sort(compareLobbyMessages);
  }, [lobbyChat.messages, lobbyFriends.incomingRequests, lobbyFriends.incomingRoomInvites]);

  useEffect(() => {
    registerTrack("lobby", lobbyMp3, 0.45);
    playTrack("lobby");
  }, []);

  useEffect(() => {
    if (!username) return;
    const desired = username.trim();
    if (desired.length === 0) return;
    if (player && player.name === desired) return;
    const conn = connection.getConnection();
    if (!conn) return;
    conn.reducers.setPlayerProfile({ name: desired }).catch(() => {
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

  const handleToggleEmptyData = useCallback(async () => {
    try {
      await emptyDataMode.setEnabled(!emptyDataMode.enabled);
      s.pushToast(emptyDataMode.enabled ? "Fixture data enabled" : "Empty data enabled");
    } catch (e) {
      s.pushToast(messageFromError(e));
    }
  }, [emptyDataMode, s]);

  const handleStarted = useCallback((roomId: bigint) => {
    s.setActiveRoom(null);
    if (onEnterBattle) onEnterBattle(roomId);
  }, [onEnterBattle, s]);

  const handleChatSend = useCallback(async (text: string) => {
    try {
      await lobbyChat.sendChat(text);
      if (text.trim().startsWith("/add ")) {
        s.pushToast("Friend request sent");
      }
    } catch (e) {
      s.pushToast(messageFromError(e));
    }
  }, [lobbyChat, s]);

  const handleFriendRequestResponse = useCallback(async (requestId: bigint, accept: boolean) => {
    try {
      await lobbyFriends.respondToFriendRequest(requestId, accept);
      s.pushToast(accept ? "Friend request accepted" : "Friend request declined");
    } catch (e) {
      s.pushToast(messageFromError(e));
    }
  }, [lobbyFriends, s]);

  const handleRoomInviteResponse = useCallback(async (invite: IncomingRoomInviteView, accept: boolean) => {
    try {
      await lobbyFriends.respondToRoomInvite(invite.id, accept);
      if (accept) {
        const target = roomViews.find((room) => room.id === invite.roomId);
        if (target) s.setActiveRoom(toLobbyRoom(target));
      }
      s.pushToast(accept ? `Joined room ${invite.roomCode}` : "Room invite declined");
      if (accept) setInboxOpen(false);
    } catch (e) {
      s.pushToast(messageFromError(e));
    }
  }, [lobbyFriends, roomViews, s]);

  const handleSendRoomInvite = useCallback(async (roomId: bigint, username: string) => {
    await lobbyFriends.sendRoomInvite(roomId, username);
    s.pushToast(`Room invite sent to ${username.trim()}`);
  }, [lobbyFriends, s]);

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
          onFriend={() => setInboxOpen(true)}
          onSearch={() => s.pushToast("Enter a room number…")}
          canToggleEmptyData={player?.isAdmin === true}
          emptyDataEnabled={emptyDataMode.enabled}
          onToggleEmptyData={handleToggleEmptyData}
        />
        <LobbyBody
          rooms={rooms}
          onRoomClick={handleRoomClick}
          onBuddyClick={(name) => { s.setWhisperTo(name); s.pushToast(`Whisper to ${name}`); }}
        />
        <LobbyBottom
          onBack={onReplay}
          messages={messages}
          onSend={handleChatSend}
          whisperTo={s.whisperTo}
          onClearWhisper={() => s.setWhisperTo(null)}
          onFriendRequestResponse={handleFriendRequestResponse}
        />
      </div>

      {s.activeRoom && (
        <LobbyRoomModal
          room={s.activeRoom}
          onClose={() => s.setActiveRoom(null)}
          onStarted={handleStarted}
          onInvite={handleSendRoomInvite}
        />
      )}
      {s.creating && (
        <LobbyCreateModal
          onClose={() => s.setCreating(false)}
          onCreated={handleCreated}
        />
      )}
      {inboxOpen && (
        <LobbyInboxModal
          friendRequests={lobbyFriends.incomingRequests}
          roomInvites={lobbyFriends.incomingRoomInvites}
          onClose={() => setInboxOpen(false)}
          onFriendResponse={handleFriendRequestResponse}
          onRoomInviteResponse={handleRoomInviteResponse}
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

function compareLobbyMessages(a: LobbyChatMsg, b: LobbyChatMsg): number {
  const ax = a.createdAtMicros ?? BigInt(0);
  const bx = b.createdAtMicros ?? BigInt(0);
  if (ax > bx) return 1;
  if (ax < bx) return -1;
  return 0;
}
