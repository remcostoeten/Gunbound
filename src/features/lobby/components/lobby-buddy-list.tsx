"use client";

import { Facehash } from "facehash";
import { MessageCircle, UserMinus, UserPlus, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useSpacetimeDB, useTable } from "spacetimedb/react";
import { useLobbyFriends, type LobbyFriendView } from "../spacetime/use-lobby-friends";
import { LobbyMyInfoModal } from "./lobby-my-info-modal";
import { resolveFlagAsset } from "../config/flags";
import { AppContextMenu, type AppContextMenuItem } from "@/components/context/app-context-menu";
import { tables } from "@/features/game/spacetime";
import type { Player } from "@/features/game/spacetime/module_bindings/types";

type Props = {
  onBuddyClick: (name: string) => void;
  onFriendRequestResponse: (requestId: bigint, accept: boolean) => void;
  onOpenInbox: () => void;
};

type BuddyView = "online" | "buddies" | "all";

export function LobbyBuddyList({ onBuddyClick, onFriendRequestResponse, onOpenInbox }: Props) {
  const connection = useSpacetimeDB();
  const selfIdentityHex = connection.identity?.toHexString() ?? null;
  const [players, isReady] = useTable(tables.player);
  const [view, setView] = useState<BuddyView>("online");
  const [draftName, setDraftName] = useState("");
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  const {
    friends,
    incomingRequests,
    requestFriend,
    removeFriend,
    hasFriendIdentity,
    hasPendingRequestForIdentity,
  } = useLobbyFriends();
  const onlinePlayers = useMemo(
    () => getOnlinePlayers(players, selfIdentityHex),
    [players, selfIdentityHex],
  );
  const allPlayers = useMemo(
    () => getAllPlayers(players, selfIdentityHex),
    [players, selfIdentityHex],
  );

  const playerByHex = useMemo(() => {
    const map = new Map<string, Player>();
    for (const player of players) {
      map.set(player.identity.toHexString(), player);
    }
    return map;
  }, [players]);
  const visibleCount = view === "online"
    ? onlinePlayers.length
    : view === "all"
      ? allPlayers.length
      : friends.length;
  const trimmedDraftName = draftName.trim();
  const pendingRequestCount = incomingRequests.length;

  const submitBuddyForm = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    requestFriend(trimmedDraftName)
      .then(() => setDraftName(""))
      .catch(() => {
        // Root chat command path surfaces errors; keep this compact side panel quiet.
      });
  };

  const saveOnlineBuddy = (name: string): void => {
    requestFriend(name)
      .then(() => setView("buddies"))
      .catch(() => {
        // Root chat command path surfaces errors; keep this compact side panel quiet.
      });
  };

  const deleteBuddy = (identity: LobbyFriendView["identity"]): void => {
    removeFriend(identity).catch(() => {
      // Root chat command path surfaces errors; keep this compact side panel quiet.
    });
  };

  return (
    <>
      <div className="gb-buddy">
        <div className="gb-buddy-head">
          <div className="gb-buddy-switch" role="tablist" aria-label="User list filter">
            <button
              type="button"
              className={`gb-buddy-tab ${view === "online" ? "gb-buddy-tab-on" : ""}`}
              onClick={() => setView("online")}
              aria-pressed={view === "online"}
            >
              Online
            </button>
            <button
              type="button"
              className={`gb-buddy-tab ${view === "all" ? "gb-buddy-tab-on" : ""}`}
              onClick={() => setView("all")}
              aria-pressed={view === "all"}
            >
              All
            </button>
            <button
              type="button"
              className={`gb-buddy-tab ${view === "buddies" ? "gb-buddy-tab-on" : ""}${pendingRequestCount > 0 ? " gb-buddy-tab-alert" : ""}`}
              onClick={() => setView("buddies")}
              aria-pressed={view === "buddies"}
            >
              Buddies
              {pendingRequestCount > 0 && (
                <span className="gb-buddy-tab-badge" aria-label={`${String(pendingRequestCount)} pending friend requests`}>
                  {String(pendingRequestCount)}
                </span>
              )}
            </button>
          </div>
          <span className="gb-buddy-head-title">
            {view === "online" ? "Live Users" : view === "all" ? "All Users" : "Buddy List"} ({String(visibleCount)})
          </span>
        </div>
        {view === "buddies" && pendingRequestCount > 0 && (
          <section className="gb-buddy-requests" aria-label="Pending friend requests">
            <div className="gb-buddy-requests-head">
              <span>Friend Requests</span>
              <button type="button" className="gb-buddy-requests-inbox" onClick={onOpenInbox}>
                Open inbox
              </button>
            </div>
            <ul className="gb-buddy-request-list">
              {incomingRequests.map((request) => (
                <li className="gb-buddy-request-row" key={request.id.toString()}>
                  <div className="gb-buddy-request-copy">
                    <b>{request.requesterName}</b>
                    <span>wants to add you.</span>
                  </div>
                  <div className="gb-buddy-request-actions">
                    <button type="button" onClick={() => onFriendRequestResponse(request.id, true)}>Accept</button>
                    <button type="button" onClick={() => onFriendRequestResponse(request.id, false)}>Decline</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {view === "buddies" && (
          <form className="gb-buddy-add" onSubmit={submitBuddyForm}>
            <input
              className="gb-buddy-input"
              value={draftName}
              onChange={(event) => setDraftName(event.currentTarget.value)}
              maxLength={32}
              placeholder="Add buddy"
              aria-label="Buddy name"
            />
            <button className="gb-buddy-add-btn" type="submit" disabled={trimmedDraftName.length === 0}>
              Add
            </button>
          </form>
        )}
        {(view === "online" || view === "all") && !isReady ? (
          <div className="gb-empty gb-empty-buddy">
            <span className="gb-empty-glyph">👥</span>
            <span className="gb-empty-title">Loading users</span>
            <span className="gb-empty-sub">Connecting to the channel roster.</span>
          </div>
        ) : view === "online" && onlinePlayers.length === 0 ? (
          <div className="gb-empty gb-empty-buddy">
            <span className="gb-empty-glyph">👥</span>
            <span className="gb-empty-title">No online users</span>
            <span className="gb-empty-sub">Online players will appear here.</span>
          </div>
        ) : view === "all" && allPlayers.length === 0 ? (
          <div className="gb-empty gb-empty-buddy">
            <span className="gb-empty-glyph">👥</span>
            <span className="gb-empty-title">No users yet</span>
            <span className="gb-empty-sub">Registered players will appear here.</span>
          </div>
        ) : view === "buddies" && friends.length === 0 && pendingRequestCount === 0 ? (
          <div className="gb-empty gb-empty-buddy">
            <span className="gb-empty-glyph">👥</span>
            <span className="gb-empty-title">No buddies yet</span>
            <span className="gb-empty-sub">Add friends to see them here.</span>
          </div>
        ) : (
          <ul className="gb-buddy-list">
            {view === "buddies"
              ? friends.map((friend) =>
                  renderBuddy(
                    friend,
                    playerByHex.get(friend.identityHex) ?? null,
                    onBuddyClick,
                    setProfilePlayer,
                    deleteBuddy,
                  ),
                )
              : (view === "online" ? onlinePlayers : allPlayers).map((player) =>
                  renderPlayer(
                    player,
                    onBuddyClick,
                    setProfilePlayer,
                    saveOnlineBuddy,
                    deleteBuddy,
                    hasFriendIdentity(player.identity),
                    hasPendingRequestForIdentity(player.identity),
                    player.identity.toHexString() === selfIdentityHex,
                  ),
                )}
          </ul>
        )}
      </div>
      {profilePlayer && (
        <LobbyMyInfoModal
          player={profilePlayer}
          title="Player Info"
          onClose={() => setProfilePlayer(null)}
        />
      )}
    </>
  );
}

function renderPlayer(
  player: Player,
  onBuddyClick: (name: string) => void,
  onOpenProfile: (player: Player) => void,
  onSaveBuddy: (name: string) => void,
  onRemoveBuddy: (identity: LobbyFriendView["identity"]) => void,
  isBuddy: boolean,
  isPending: boolean,
  isSelf: boolean,
): React.JSX.Element {
  const actionLabel = isBuddy ? "Added" : isPending ? "Sent" : "Add";
  const contextItems: AppContextMenuItem[] = [
    { id: "profile", label: "View profile", icon: UserRound, onSelect: () => onOpenProfile(player) },
    ...(isSelf
      ? []
      : [
          { id: "chat", label: "Start chat", icon: MessageCircle, onSelect: () => onBuddyClick(player.name) },
          isBuddy
            ? {
                id: "delete-friend",
                label: "Delete friend",
                icon: UserMinus,
                destructive: true,
                onSelect: () => onRemoveBuddy(player.identity),
              }
            : {
                id: "add-friend",
                label: isPending ? "Friend request sent" : "Add friend",
                icon: UserPlus,
                disabled: isPending,
                onSelect: () => onSaveBuddy(player.name),
              },
        ]),
  ];
  return (
    <li key={player.identity.toHexString()}>
      <AppContextMenu label={player.name} items={contextItems}>
        <div className="gb-buddy-row">
          <button
            className="gb-buddy-main gb-buddy-btn"
            type="button"
            onClick={() => {
              if (isSelf) {
                onOpenProfile(player);
              } else {
                onBuddyClick(player.name);
              }
            }}
          >
            <Facehash name={player.name} size={24} variant="gradient" showInitial={false} className="gb-buddy-face" />
            <PlayerFlag country={player.country ?? null} name={player.name} />
            <span className="gb-buddy-name">{player.name}</span>
            <span className="gb-buddy-tag">
              {player.isOnline ? "Online" : "Offline"} - Lv {String(player.level)}
            </span>
            <span className={`gb-buddy-dot${player.isOnline ? "" : " gb-buddy-dot-offline"}`} />
          </button>
          {!isSelf && (
            <button
              className="gb-buddy-action"
              type="button"
              onClick={() => onSaveBuddy(player.name)}
              disabled={isBuddy || isPending}
              aria-label={isBuddy ? `${player.name} is already a buddy` : `Add ${player.name} as buddy`}
              title={isBuddy ? "Saved" : isPending ? "Request sent" : "Add buddy"}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </AppContextMenu>
    </li>
  );
}

function renderBuddy(
  buddy: LobbyFriendView,
  profilePlayer: Player | null,
  onBuddyClick: (name: string) => void,
  onOpenProfile: (player: Player) => void,
  onRemoveBuddy: (identity: LobbyFriendView["identity"]) => void,
): React.JSX.Element {
  const statusText = buddy.presence === "offline" ? buddy.lastSeenLabel : buddy.statusLabel;
  const contextItems: AppContextMenuItem[] = [
    {
      id: "profile",
      label: "View profile",
      icon: UserRound,
      disabled: !profilePlayer,
      onSelect: () => {
        if (profilePlayer) onOpenProfile(profilePlayer);
      },
    },
    { id: "chat", label: "Start chat", icon: MessageCircle, onSelect: () => onBuddyClick(buddy.name) },
    {
      id: "delete-friend",
      label: "Delete friend",
      icon: UserMinus,
      destructive: true,
      onSelect: () => onRemoveBuddy(buddy.identity),
    },
  ];
  return (
    <li key={buddy.identityHex}>
      <AppContextMenu label={buddy.name} items={contextItems}>
        <div className="gb-buddy-row">
          <button className="gb-buddy-main gb-buddy-btn" type="button" onClick={() => onBuddyClick(buddy.name)}>
            <Facehash name={buddy.name} size={24} variant="gradient" showInitial={false} className="gb-buddy-face" />
            <PlayerFlag country={buddy.country} name={buddy.name} />
            <span className="gb-buddy-name">{buddy.name}</span>
            <span className="gb-buddy-tag" title={buddy.lastSeenLabel}>
              {statusText}
            </span>
            <span className={`gb-buddy-dot gb-buddy-dot-${buddy.presence}`} />
          </button>
          <button
            className="gb-buddy-action gb-buddy-action-danger"
            type="button"
            onClick={() => onRemoveBuddy(buddy.identity)}
            aria-label={`Remove ${buddy.name} from buddies`}
            title="Remove buddy"
          >
            Del
          </button>
        </div>
      </AppContextMenu>
    </li>
  );
}

function PlayerFlag({ country, name }: { country: string | null; name: string }): React.JSX.Element {
  const asset = resolveFlagAsset(country);
  if (!asset) {
    return (
      <span className="gb-flag gb-flag-unknown" aria-hidden="true" title={`${name} — country unknown`}>
        <span className="gb-flag-glyph">🌐</span>
      </span>
    );
  }
  const code = (country ?? "").toUpperCase();
  return (
    <span className="gb-flag" title={`${name} — ${code}`}>
      <img src={asset} alt={code} width={20} height={14} className="gb-flag-img" />
    </span>
  );
}

function getOnlinePlayers(players: readonly Player[], _selfIdentityHex: string | null): Player[] {
  return players
    .filter((player) => player.isOnline && player.name.trim().length > 0)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getAllPlayers(players: readonly Player[], _selfIdentityHex: string | null): Player[] {
  return players
    .filter((player) => player.name.trim().length > 0)
    .slice()
    .sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}
