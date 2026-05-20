"use client";

import { useEffect, useState } from "react";
import { IntroRoot } from "@/features/intro";
import { AuthRoot } from "@/features/auth";
import { LobbyRoot } from "@/features/lobby";
import { GameShell } from "@/features/game/components/game-shell";
import { GunboundSpacetimeProvider } from "@/features/game/spacetime";

type Stage = "intro" | "auth" | "lobby" | "battle";

const POST_LOGIN_KEY = "gunbound:post-login";

export function HomeScreen() {
  const [stage, setStage] = useState<Stage>("intro");
  const [replayKey, setReplayKey] = useState(0);
  const [fading, setFading] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // After a "login" flow, the page reloads so the SpacetimeDB connection is
  // rebuilt with the recovered token. Pick up the username and skip
  // intro+auth so the user lands directly in the lobby they just signed into.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pending = window.sessionStorage.getItem(POST_LOGIN_KEY);
    if (!pending) return;
    window.sessionStorage.removeItem(POST_LOGIN_KEY);
    setUsername(pending);
    setStage("lobby");
    setFading(true);
  }, []);

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
    setStage("intro");
    setReplayKey((k) => k + 1);
  }

  return (
    <GunboundSpacetimeProvider>
      {stage === "battle" ? (
        <div className="home-stack">
          <div className="home-layer home-battle-layer">
            <GameShell />
          </div>
        </div>
      ) : (
        <div className="home-stack">
          {stage === "lobby" && (
            <div className="home-layer home-lobby-layer">
              <LobbyRoot
                username={username}
                onReplay={handleReplay}
                onEnterBattle={() => setStage("battle")}
              />
            </div>
          )}
          {stage === "auth" && (
            <div className="home-layer home-lobby-layer">
              <AuthRoot
                onAuthed={(u) => {
                  setUsername(u);
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
