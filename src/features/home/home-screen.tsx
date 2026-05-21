"use client";

import { useEffect, useRef, useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";
import { IntroRoot } from "@/features/intro";
import { AuthRoot } from "@/features/auth";
import { LobbyRoot } from "@/features/lobby";
import { GameShell } from "@/features/game/components/game-shell";
import {
  GunboundSpacetimeProvider,
  useCurrentPlayer,
} from "@/features/game/spacetime";
import { readStoredToken } from "@/features/game/spacetime/token-storage";

type Stage = "checking" | "intro" | "auth" | "lobby" | "battle";

const ROOM_CODE_PATTERN = /^[A-Z2-9]{4,8}$/;
const RESUME_TIMEOUT_MS = 4000;

export function HomeScreen() {
  const [spacetimeSessionKey, setSpacetimeSessionKey] = useState(0);

  return (
    <GunboundSpacetimeProvider sessionKey={spacetimeSessionKey}>
      <HomeScreenInner
        bumpSession={() => setSpacetimeSessionKey((value) => value + 1)}
      />
    </GunboundSpacetimeProvider>
  );
}

function HomeScreenInner({ bumpSession }: { bumpSession: () => void }) {
  const connection = useSpacetimeDB();
  const { player, isReady: playerReady } = useCurrentPlayer();

  const [stage, setStage] = useState<Stage>("checking");
  const [replayKey, setReplayKey] = useState(0);
  const [fading, setFading] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [battleRoomId, setBattleRoomId] = useState<bigint | undefined>(undefined);
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);
  const resumedRef = useRef(false);

  useEffect(() => {
    setPendingRoomCode(readRoomCodeFromUrl());
    if (!readStoredToken()) {
      resumedRef.current = true;
      setStage("intro");
    }
  }, []);

  useEffect(() => {
    if (resumedRef.current) return;
    if (stage !== "checking") return;
    if (!connection.identity) return;
    if (!playerReady) return;
    resumedRef.current = true;
    if (player && player.name.trim().length > 0) {
      setUsername(player.name);
      setStage("lobby");
    } else {
      setStage("auth");
    }
  }, [stage, connection.identity, playerReady, player]);

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
    if (stage === "intro" || stage === "checking") {
      setFading(false);
      return;
    }
    const t = window.setTimeout(() => setFading(true), 30);
    return () => clearTimeout(t);
  }, [stage]);

  function handleReplay() {
    const conn = connection.getConnection();
    if (conn) {
      conn.reducers.setLobbyPresence({ active: false });
    }
    setFading(false);
    setUsername(null);
    setBattleRoomId(undefined);
    setPendingRoomCode(null);
    clearRoomCodeFromUrl();
    resumedRef.current = true;
    bumpSession();
    setStage("intro");
    setReplayKey((k) => k + 1);
  }

  return (
    <>
      {stage === "battle" ? (
        <div className="home-stack">
          <div className="home-layer home-battle-layer">
            <GameShell spacetimeRoomId={battleRoomId} />
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
                onEnterBattle={(roomId) => {
                  setBattleRoomId(roomId);
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
                  setFading(false);
                  setStage("lobby");
                }}
              />
            </div>
          )}
          {stage === "intro" || stage === "checking" || !fading ? (
            <div
              className={`home-layer home-intro-layer ${
                stage !== "intro" && stage !== "checking" ? "home-fade-out" : ""
              }`}
            >
              {stage === "intro" ? (
                <IntroRoot
                  key={replayKey}
                  replayKey={replayKey}
                  onComplete={() => setStage("auth")}
                />
              ) : null}
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
