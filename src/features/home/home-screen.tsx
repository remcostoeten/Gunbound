"use client";

import { useEffect, useState } from "react";
import { IntroRoot } from "@/features/intro";
import { AuthRoot } from "@/features/auth";
import { LobbyRoot } from "@/features/lobby";
import { GameShell } from "@/features/game/components/game-shell";
import { GunboundSpacetimeProvider } from "@/features/game/spacetime";

type Stage = "intro" | "auth" | "lobby" | "battle";

export function HomeScreen() {
  const [stage, setStage] = useState<Stage>("intro");
  const [replayKey, setReplayKey] = useState(0);
  const [fading, setFading] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [battleRoomId, setBattleRoomId] = useState<bigint | undefined>(undefined);
  const [spacetimeSessionKey, setSpacetimeSessionKey] = useState(0);

  useEffect(() => {
    if (stage === "intro") {
      setFading(false);
      return;
    }
    const t = window.setTimeout(() => setFading(true), 30);
    return () => clearTimeout(t);
  }, [stage]);

  function handleReplay() {
    setFading(false);
    setUsername(null);
    setBattleRoomId(undefined);
    setStage("intro");
    setReplayKey((k) => k + 1);
  }

  return (
    <GunboundSpacetimeProvider sessionKey={spacetimeSessionKey}>
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
                  setSpacetimeSessionKey((value) => value + 1);
                  setFading(false);
                  setStage("lobby");
                }}
              />
            </div>
          )}
          {stage === "intro" || !fading ? (
            <div
              className={`home-layer home-intro-layer ${stage !== "intro" ? "home-fade-out" : ""}`}
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
    </GunboundSpacetimeProvider>
  );
}
