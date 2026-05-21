"use client";

import { Facehash } from "facehash";
import { useMemo, useState } from "react";
import { useTable } from "spacetimedb/react";
import { useLobbyFriends, type LobbyFriendView } from "../spacetime/use-lobby-friends";
import { resolveFlagAsset } from "../config/flags";
import { tables } from "@/features/game/spacetime";
import type { Player } from "@/features/game/spacetime/module_bindings/types";

type Props = { onBuddyClick: (name: string) => void };

type BuddyView = "online" | "buddies";

export function LobbyBuddyList({ onBuddyClick }: Props) {
  const [players, isReady] = useTable(tables.player);
  const [view, setView] = useState<BuddyView>("online");
  const [draftName, setDraftName] = useState("");
  const {
    friends,
    requestFriend,
    removeFriend,
    hasFriendIdentity,
    hasPendingRequestForIdentity,
  } = useLobbyFriends();
  const onlinePlayers = useMemo(() => getOnlinePlayers(players), [players]);
  const visibleCount = view === "online" ? onlinePlayers.length : friends.length;
  const trimmedDraftName = draftName.trim();

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

  return (
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
            className={`gb-buddy-tab ${view === "buddies" ? "gb-buddy-tab-on" : ""}`}
            onClick={() => setView("buddies")}
            aria-pressed={view === "buddies"}
          >
            Buddies
          </button>
        </div>
        <span className="gb-buddy-head-title">
          {view === "online" ? "Live Users" : "Buddy List"} ({String(visibleCount)})
        </span>
      </div>
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
      {view === "online" && !isReady ? (
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
      ) : view === "buddies" && friends.length === 0 ? (
        <div className="gb-empty gb-empty-buddy">
          <span className="gb-empty-glyph">👥</span>
          <span className="gb-empty-title">No buddies yet</span>
          <span className="gb-empty-sub">Add friends to see them here.</span>
        </div>
      ) : (
        <ul className="gb-buddy-list">
          {view === "online"
            ? onlinePlayers.map((player) =>
                renderOnlinePlayer(
                  player,
                  onBuddyClick,
                  saveOnlineBuddy,
                  hasFriendIdentity(player.identity),
                  hasPendingRequestForIdentity(player.identity),
                ),
              )
            : friends.map((friend) => renderBuddy(friend, onBuddyClick, removeFriend))}
        </ul>
      )}
    </div>
  );
}

function renderOnlinePlayer(
  player: Player,
  onBuddyClick: (name: string) => void,
  onSaveBuddy: (name: string) => void,
  isBuddy: boolean,
  isPending: boolean,
): React.JSX.Element {
  const actionLabel = isBuddy ? "Added" : isPending ? "Sent" : "Add";
  return (
    <li key={player.identity.toHexString()}>
      <div className="gb-buddy-row">
        <button className="gb-buddy-main gb-buddy-btn" type="button" onClick={() => onBuddyClick(player.name)}>
          <Facehash name={player.name} size={24} variant="gradient" showInitial={false} className="gb-buddy-face" />
          <PlayerFlag country={player.country ?? null} name={player.name} />
          <span className="gb-buddy-name">{player.name}</span>
          <span className="gb-buddy-tag">Lv {String(player.level)}</span>
          <span className="gb-buddy-dot" />
        </button>
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
      </div>
    </li>
  );
}

function renderBuddy(
  buddy: LobbyFriendView,
  onBuddyClick: (name: string) => void,
  onRemoveBuddy: (identity: LobbyFriendView["identity"]) => void,
): React.JSX.Element {
  const statusText = buddy.presence === "offline" ? buddy.lastSeenLabel : buddy.statusLabel;
  return (
    <li key={buddy.identityHex}>
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

function getOnlinePlayers(players: readonly Player[]): Player[] {
  return players
    .filter((player) => player.isOnline && player.name.trim().length > 0)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}
