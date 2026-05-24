"use client";

import { useEffect, useRef, useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";
import { IntroRoot } from "@/features/intro";
import { AuthRoot, SpacetimeAuthProvider } from "@/features/auth";
import { LobbyRoot } from "@/features/lobby";
import { GameShell } from "@/features/game/components/game-shell";
import {
  GunboundSpacetimeProvider,
  ROOM_STATUS,
  useCurrentPlayer,
  useCurrentRoom,
} from "@/features/game/spacetime";
import {
  clearStoredToken,
  clearStoredUsername,
  readStoredToken,
  readStoredUsername,
} from "@/features/game/spacetime/token-storage";

type Stage = "checking" | "intro" | "auth" | "lobby" | "battle";

const ROOM_CODE_PATTERN = /^[A-Z2-9]{4,8}$/;
const RESUME_TIMEOUT_MS = 4000;

export function HomeScreen() {
  const [spacetimeSessionKey, setSpacetimeSessionKey] = useState(0);

  return (
    <SpacetimeAuthProvider>
      <GunboundSpacetimeProvider sessionKey={spacetimeSessionKey}>
        <HomeScreenInner
          bumpSession={() => setSpacetimeSessionKey((value) => value + 1)}
        />
      </GunboundSpacetimeProvider>
    </SpacetimeAuthProvider>
  );
}

function HomeScreenInner({ bumpSession }: { bumpSession: () => void }) {
  const connection = useSpacetimeDB();
  const { player, isReady: playerReady } = useCurrentPlayer();
  const { room: currentDbRoom, isReady: currentRoomReady } = useCurrentRoom();

  const [stage, setStage] = useState<Stage>("checking");
  const [replayKey, setReplayKey] = useState(0);
  const [username, setUsername] = useState<string | null>(() => readStoredUsername() ?? null);
  const [battleRoomId, setBattleRoomId] = useState<bigint | undefined>(undefined);
  const [soloPractice, setSoloPractice] = useState(false);
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);
  const resumedRef = useRef(false);
  const syncedProfileRef = useRef<string | null>(null);

  useEffect(() => {
    setPendingRoomCode(readRoomCodeFromUrl());
    const token = readStoredToken();
    const storedName = readStoredUsername();
    if (!token) {
      resumedRef.current = true;
      setStage("intro");
    } else if (storedName) {
      // Token + username already in storage — skip the checking wait and go straight to lobby.
      resumedRef.current = true;
      setUsername(storedName);
      setStage("lobby");
    }
  }, []);

  useEffect(() => {
    if (resumedRef.current) return;
    if (stage !== "checking") return;
    if (!connection.identity) return;
    if (!playerReady) return;
    if (!currentRoomReady) return;
    resumedRef.current = true;
    if (player && player.name.trim().length > 0) {
      setUsername(player.name);
      if (currentDbRoom && currentDbRoom.status === ROOM_STATUS.IN_MATCH) {
        setBattleRoomId(currentDbRoom.id);
        setStage("battle");
      } else {
        setStage("lobby");
      }
    } else {
      setStage("auth");
    }
  }, [stage, connection.identity, playerReady, player, currentRoomReady, currentDbRoom]);

  useEffect(() => {
    if (stage !== "checking") return;
    const timer = window.setTimeout(() => {
      if (resumedRef.current) return;
      resumedRef.current = true;
      setStage("auth");
    }, RESUME_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "checking") return;
    if (!connection.connectionError) return;
    if (resumedRef.current) return;
    resumedRef.current = true;
    setStage("auth");
  }, [stage, connection.connectionError]);

  useEffect(() => {
    const conn = connection.getConnection();
    if (!conn || !connection.identity || !username) return;
    if (playerReady && player?.name === username) return;

    const syncKey = `${connection.identity.toHexString()}:${username}`;
    if (syncedProfileRef.current === syncKey) return;
    syncedProfileRef.current = syncKey;

    conn.reducers.setPlayerProfile({ name: username }).catch(() => {
      syncedProfileRef.current = null;
    });
  }, [connection, player, playerReady, username]);

  function handleReplay() {
    const conn = connection.getConnection();
    if (conn) {
      conn.reducers.setLobbyPresence({ active: false });
    }
    setUsername(null);
    syncedProfileRef.current = null;
    setBattleRoomId(undefined);
    setSoloPractice(false);
    setPendingRoomCode(null);
    clearRoomCodeFromUrl();
    resumedRef.current = true;
    bumpSession();
    setStage("intro");
    setReplayKey((k) => k + 1);
  }

  function handleLogout() {
    const conn = connection.getConnection();
    if (conn) {
      conn.reducers.setLobbyPresence({ active: false });
    }
    clearStoredToken();
    clearStoredUsername();
    clearRoomCodeFromUrl();
    setUsername(null);
    syncedProfileRef.current = null;
    setBattleRoomId(undefined);
    setSoloPractice(false);
    setPendingRoomCode(null);
    resumedRef.current = true;
    bumpSession();
    setStage("auth");
  }

  return (
    <>
      {stage === "battle" ? (
        <div className="home-stack">
          <div className="home-layer home-battle-layer">
            <GameShell
              spacetimeRoomId={battleRoomId}
              soloPractice={soloPractice}
              soloPlayerName={username}
              onExitToLobby={() => setStage("lobby")}
            />
          </div>
        </div>
      ) : (
        <div className="home-stack">
          {stage === "lobby" && (
            <div className="home-layer home-lobby-layer">
              <LobbyRoot
                username={username}
                pendingRoomCode={pendingRoomCode}
                onPendingRoomConsumed={() => setPendingRoomCode(null)}
                onReplay={handleReplay}
                onLogout={handleLogout}
                onEnterBattle={(roomId) => {
                  setBattleRoomId(roomId);
                  setSoloPractice(false);
                  setStage("battle");
                }}
                onEnterSoloPractice={() => {
                  setBattleRoomId(undefined);
                  setSoloPractice(true);
                  setStage("battle");
                }}
              />
            </div>
          )}
          {stage === "auth" && (
            <div className="home-layer home-lobby-layer">
              <AuthRoot
                onAuthed={(u) => {
                  setUsername(u);
                  bumpSession();
                  setStage("lobby");
                }}
              />
            </div>
          )}
          {stage === "intro" || stage === "checking" ? (
            <div className="home-layer home-intro-layer">
              {stage === "intro" && (
                <IntroRoot
                  key={replayKey}
                  replayKey={replayKey}
                  onComplete={() => setStage("auth")}
                />
              )}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}



function readRoomCodeFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("room");
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return ROOM_CODE_PATTERN.test(normalized) ? normalized : null;
}

function clearRoomCodeFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("room")) return;
  url.searchParams.delete("room");
  window.history.replaceState({}, "", url.toString());
}
