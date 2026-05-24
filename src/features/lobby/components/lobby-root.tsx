"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";
import { playTrack, registerTrack, LOBBY_BGM_SRC, useMenuClickSound } from "@/lib/music-bus";
import { getLobbyEmptyStateAnimated, subscribeDisplaySettings } from "@/lib/display-settings";
import { LOBBY_TOP_ICONS } from "../config/top-icons";
import { LobbyActionRow } from "./lobby-action-row";
import { LobbyBody } from "./lobby-body";
import { LobbyBottom } from "./lobby-bottom";
import { LobbyRoomModal } from "./lobby-room-modal";
import { LobbyCreateModal } from "./lobby-create-modal";
import { LobbyInboxModal } from "./lobby-inbox-modal";
import { LobbyMyInfoModal } from "./lobby-my-info-modal";
import { LobbyRoomSearchModal } from "./lobby-room-search-modal";
import { LobbyLeaderboardModal } from "./lobby-leaderboard-modal";
import { LobbyOptionsModal } from "./lobby-options-modal";
import { LobbyToastStack } from "./lobby-toast-stack";
import { useMatchmakingQueue } from "../spacetime/use-matchmaking-queue";
import { useYourTurnInRoom } from "../spacetime/use-your-turn-in-room";
import { useLobbyState } from "../hooks/use-lobby-state";
import { useLobbyChat } from "../spacetime/use-lobby-chat";
import { useLobbyFriends, type IncomingRoomInviteView } from "../spacetime/use-lobby-friends";
import { useLobbyRooms, type LobbyRoomView } from "../spacetime/use-lobby-rooms";
import { ROOM_STATUS, useCurrentPlayer, useCurrentRoom, useEmptyDataMode, usePlayerCountrySync } from "@/features/game/spacetime";
import type { LobbyChatMsg } from "../types";
import type { LobbyRoom } from "../types";

type Props = {
  username?: string | null;
  pendingRoomCode?: string | null;
  onPendingRoomConsumed?: () => void;
  onReplay: () => void;
  onLogout?: () => void;
  onEnterBattle?: (roomId: bigint) => void;
};

// Lobby background music is randomized from music-bus

function toLobbyRoom(view: LobbyRoomView, mineRoomId?: bigint, yourTurn?: boolean): LobbyRoom {
  const mine = mineRoomId !== undefined && view.id === mineRoomId;
  return {
    id: view.id,
    code: view.code,
    status: view.status === ROOM_STATUS.IN_MATCH ? "Playing" : "Waiting",
    hostName: view.hostName,
    memberCount: view.memberCount,
    capacity: view.capacity,
    settings: view.settings,
    mine,
    yourTurn: mine ? yourTurn : undefined,
  };
}

export function LobbyRoot({
  username,
  pendingRoomCode,
  onPendingRoomConsumed,
  onReplay,
  onLogout,
  onEnterBattle,
}: Props) {
  useMenuClickSound();
  const connection = useSpacetimeDB();
  const [inboxOpen, setInboxOpen] = useState(false);
  const [myInfoOpen, setMyInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [createMinimized, setCreateMinimized] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const roomModalDismissedRef = useRef(false);
  const [emptyStateAnimated, setEmptyStateAnimated] = useState(() => getLobbyEmptyStateAnimated());
  const { player } = useCurrentPlayer();
  usePlayerCountrySync();
  const emptyDataMode = useEmptyDataMode();
  const selfName = player?.name?.trim() || username || null;
  const s = useLobbyState(selfName, emptyDataMode.enabled);
  const { rooms: roomViews, joinRoomByCode, quickJoin } = useLobbyRooms();
  const matchmaking = useMatchmakingQueue();
  const { room: currentDbRoom, isReady: currentRoomReady } = useCurrentRoom();
  const selfIdentityHex = player?.identity.toHexString();
  const isYourTurn = useYourTurnInRoom(currentDbRoom?.id, selfIdentityHex);
  const wasSearchingRef = useRef(false);
  const lobbyChat = useLobbyChat(1);
  const lobbyFriends = useLobbyFriends();

  const rooms = useMemo(
    () => roomViews.map((view) => toLobbyRoom(view, currentDbRoom?.id, isYourTurn)),
    [roomViews, currentDbRoom, isYourTurn],
  );
  const inboxCount = lobbyFriends.incomingRequests.length + lobbyFriends.incomingRoomInvites.length;
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

  const openRoomModal = useCallback(
    (room: LobbyRoom) => {
      roomModalDismissedRef.current = false;
      s.setActiveRoom(room);
      setRoomModalOpen(true);
    },
    [s],
  );

  const dismissRoomModal = useCallback(() => {
    roomModalDismissedRef.current = true;
    setRoomModalOpen(false);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    roomModalDismissedRef.current = false;
    s.setActiveRoom(null);
    setRoomModalOpen(false);
  }, [s]);

  useEffect(() => {
    registerTrack("lobby", LOBBY_BGM_SRC, 0.45);
    playTrack("lobby");
  }, []);

  useEffect(() => {
    return subscribeDisplaySettings(function syncDisplaySettings(): void {
      setEmptyStateAnimated(getLobbyEmptyStateAnimated());
    });
  }, []);

  const connectionRef = useRef(connection);
  connectionRef.current = connection;
  const presenceActiveRef = useRef(false);
  useEffect(() => {
    if (presenceActiveRef.current) return;
    const conn = connection.getConnection();
    if (!conn) return;
    presenceActiveRef.current = true;
    try {
      conn.reducers.setLobbyPresence({ active: true });
    } catch {
      presenceActiveRef.current = false;
    }
  }, [connection]);
  useEffect(() => {
    return () => {
      if (!presenceActiveRef.current) return;
      presenceActiveRef.current = false;
      const conn = connectionRef.current.getConnection();
      if (!conn) return;
      try {
        conn.reducers.setLobbyPresence({ active: false });
      } catch {
        // ignore — disconnect will mark offline anyway
      }
    };
  }, []);

  const restoredRoomRef = useRef(false);
  useEffect(() => {
    if (restoredRoomRef.current) return;
    if (s.activeRoom) return;
    if (!currentDbRoom) return;
    if (currentDbRoom.status === ROOM_STATUS.IN_MATCH) return;
    const view = roomViews.find((r) => r.id === currentDbRoom.id);
    if (!view) return;
    restoredRoomRef.current = true;
    openRoomModal(toLobbyRoom(view, currentDbRoom.id, isYourTurn));
  }, [currentDbRoom, openRoomModal, roomViews, s, isYourTurn]);

  const joinAttemptedCodeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingRoomCode) return;
    if (joinAttemptedCodeRef.current === pendingRoomCode) return;
    if (!currentRoomReady) return;
    if (currentDbRoom) {
      const view = roomViews.find((r) => r.id === currentDbRoom.id);
      if (view && view.code === pendingRoomCode) {
        joinAttemptedCodeRef.current = pendingRoomCode;
        openRoomModal(toLobbyRoom(view, currentDbRoom.id, isYourTurn));
        onPendingRoomConsumed?.();
        return;
      }
      joinAttemptedCodeRef.current = pendingRoomCode;
      s.pushToast(`Already in a room — leave it first to join ${pendingRoomCode}`);
      onPendingRoomConsumed?.();
      return;
    }
    const conn = connection.getConnection();
    if (!conn) return;
    joinAttemptedCodeRef.current = pendingRoomCode;
    (async () => {
      try {
        await joinRoomByCode(pendingRoomCode);
      } catch (e) {
        s.pushToast(messageFromError(e));
        onPendingRoomConsumed?.();
      }
    })();
  }, [pendingRoomCode, currentDbRoom, currentRoomReady, roomViews, connection, joinRoomByCode, openRoomModal, isYourTurn, s, onPendingRoomConsumed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (s.activeRoom) {
      url.searchParams.set("room", s.activeRoom.code);
    } else {
      url.searchParams.delete("room");
    }
    if (url.toString() !== window.location.href) {
      window.history.replaceState({}, "", url.toString());
    }
  }, [s.activeRoom]);

  useEffect(() => {
    if (!s.activeRoom) return;
    if (!pendingRoomCode) return;
    if (s.activeRoom.code !== pendingRoomCode) return;
    onPendingRoomConsumed?.();
  }, [s.activeRoom, pendingRoomCode, onPendingRoomConsumed]);

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

  useEffect(() => {
    if (matchmaking.inQueue) {
      wasSearchingRef.current = true;
      return;
    }
    if (!wasSearchingRef.current) return;
    wasSearchingRef.current = false;
    if (!currentDbRoom || roomModalDismissedRef.current) return;
    const view = roomViews.find(r => r.id === currentDbRoom.id);
    if (view) {
      openRoomModal(toLobbyRoom(view, currentDbRoom.id, isYourTurn));
    }
  }, [matchmaking.inQueue, currentDbRoom, openRoomModal, roomViews, isYourTurn]);

  const handleWaiting = useCallback(async () => {
    try {
      if (matchmaking.inQueue) {
        await matchmaking.leaveQueue();
        s.pushToast("Left the matchmaking queue");
      } else {
        wasSearchingRef.current = true;
        await matchmaking.joinQueue();
        if (!matchmaking.inQueue) {
          s.pushToast("Match found! Opening room…");
        } else {
          s.pushToast("Looking for an opponent…");
        }
      }
    } catch (e) {
      s.pushToast(messageFromError(e));
    }
  }, [matchmaking, s]);

  const handleRoomClick = useCallback(async (r: LobbyRoom) => {
    if (r.mine && r.status === "Playing") {
      onEnterBattle?.(r.id);
      return;
    }
    if (r.mine) {
      openRoomModal(r);
      return;
    }
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
      openRoomModal(r);
    } catch (e) {
      s.pushToast(messageFromError(e));
    }
  }, [joinRoomByCode, onEnterBattle, openRoomModal, s]);

  const handleQuickjoin = useCallback(async () => {
    try {
      const target = await quickJoin();
      if (!target) {
        s.pushToast("No rooms to join");
        return;
      }
      openRoomModal(toLobbyRoom(target));
    } catch (e) {
      s.pushToast(messageFromError(e));
    }
  }, [quickJoin, openRoomModal, s]);

  const handleCreated = useCallback(async (code: string) => {
    // The newly created room will arrive via subscription; reflect immediately.
    const created = roomViews.find(r => r.code === code);
    if (created) {
      openRoomModal(toLobbyRoom(created));
    } else {
      // Subscription may not have flushed yet — push a toast and rely on the
      // re-render to surface the modal once the row lands.
      s.pushToast(`Created room ${code}`);
    }
  }, [roomViews, openRoomModal, s]);

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
    setRoomModalOpen(false);
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
        if (target) openRoomModal(toLobbyRoom(target, currentDbRoom?.id, isYourTurn));
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
        <LobbyActionRow
          onBack={onLogout ?? onReplay}
          onWaiting={handleWaiting}
          inQueue={matchmaking.inQueue}
          onQuickjoin={handleQuickjoin}
          onCreate={() => {
            if (createMinimized) {
              setCreateMinimized(false);
            } else {
              s.setCreating(true);
            }
          }}
          onFriend={() => setInboxOpen(true)}
          inboxCount={inboxCount}
          onSearch={() => setSearchOpen(true)}
          onIconClick={(label) => {
            const icon = LOBBY_TOP_ICONS.find((i) => i.label === label);
            if (!icon?.implemented) {
              s.pushToast(`${label} is not available yet`);
              return;
            }
            if (label === "My Info") {
              setMyInfoOpen(true);
              return;
            }
            if (label === "Rankings") {
              setLeaderboardOpen(true);
              return;
            }
          }}
          canToggleEmptyData={player?.isAdmin === true}
          emptyDataEnabled={emptyDataMode.enabled}
          onToggleEmptyData={handleToggleEmptyData}
        />
        <LobbyBody
          rooms={rooms}
          emptyStateAnimated={emptyStateAnimated}
          onRoomClick={handleRoomClick}
          onBuddyClick={(name) => { s.setWhisperTo(name); s.pushToast(`Whisper to ${name}`); }}
          onFriendRequestResponse={handleFriendRequestResponse}
          onOpenInbox={() => setInboxOpen(true)}
        />
        <LobbyBottom
          onBack={onReplay}
          onOptions={() => setOptionsOpen(true)}
          messages={messages}
          onSend={handleChatSend}
          whisperTo={s.whisperTo}
          onClearWhisper={() => s.setWhisperTo(null)}
          onFriendRequestResponse={handleFriendRequestResponse}
        />
      </div>

      {s.activeRoom && roomModalOpen && (
        <LobbyRoomModal
          room={s.activeRoom}
          onDismiss={dismissRoomModal}
          onLeave={handleLeaveRoom}
          onStarted={handleStarted}
          onInvite={handleSendRoomInvite}
        />
      )}
      {s.activeRoom && !roomModalOpen && (
        <button
          type="button"
          className="gb-create-restore"
          onClick={() => {
            const room = s.activeRoom;
            if (room) openRoomModal(room);
          }}
        >
          <span>Room</span>
          <span className="gb-create-restore-code">{s.activeRoom.code}</span>
        </button>
      )}
      {s.creating && (
        <LobbyCreateModal
          minimized={createMinimized}
          onMinimize={() => setCreateMinimized(true)}
          onClose={() => { s.setCreating(false); setCreateMinimized(false); }}
          onCreated={handleCreated}
        />
      )}
      {createMinimized && (
        <button className="gb-create-restore" onClick={() => setCreateMinimized(false)}>
          <span>Create Room</span>
        </button>
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
      {myInfoOpen && player && (
        <LobbyMyInfoModal player={player} onClose={() => setMyInfoOpen(false)} />
      )}
      {leaderboardOpen && (
        <LobbyLeaderboardModal
          selfIdentityHex={player?.identity.toHexString()}
          onClose={() => setLeaderboardOpen(false)}
        />
      )}
      {searchOpen && (
        <LobbyRoomSearchModal
          onClose={() => setSearchOpen(false)}
          onJoin={async (code) => {
            await joinRoomByCode(code);
            const target = roomViews.find(r => r.code === code.toUpperCase());
            if (target) openRoomModal(toLobbyRoom(target, currentDbRoom?.id, isYourTurn));
          }}
        />
      )}
      {optionsOpen && (
        <LobbyOptionsModal onClose={() => setOptionsOpen(false)} />
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
