"use client";

import { useState } from "react";
import { getMobileSpriteSource } from "@/features/game/engine/mobile-sprites";
import { AimIndicator } from "@/features/game/components/aim-indicator";
import { GameCanvas } from "@/features/game/components/game-canvas";
import { HistoryPanel } from "@/features/game/components/history-panel";
import { Hud } from "@/features/game/components/hud";
import { RoomPanel } from "@/features/game/components/room-panel";
import { TurnBanner } from "@/features/game/components/turn-banner";
import { useGameState } from "@/features/game/hooks/use-game-state";
import { useGunboundSfx } from "@/features/game/hooks/use-gunbound-sfx";
import { defaultSetup, useGameStore } from "@/features/game/store/game-store";
import type { MatchConfig, MobileType } from "@/features/game/types/game";

export function GameShell(): React.JSX.Element {
  const scene = useGameState(selectScene);
  const players = useGameState(selectPlayers);
  const winner = useGameState(selectWinner);
  const message = useGameState(selectMessage);
  const history = useGameState(selectHistory);
  const setup = useGameState(selectSetup);
  const startMatch = useGameStore(selectStartMatch);
  const restartMatch = useGameStore(selectRestartMatch);
  const returnToSetup = useGameStore(selectReturnToSetup);
  const [formState, setFormState] = useState<MatchConfig>(setup || defaultSetup);
  useGunboundSfx();

  return (
    <main className="game-shell">
      <GameCanvas />
      {scene === "playing" ? <Hud /> : null}
      {scene === "playing" ? <HistoryPanel /> : null}
      {scene === "playing" ? <TurnBanner /> : null}
      {scene === "playing" ? <div className="status-line">{message}</div> : null}
      {scene === "playing" ? <div className="hud-bottom-wrapper"><AimIndicator /></div> : null}
      {scene === "start" ? renderStartScreen(formState, setFormState, startMatch) : null}
      {scene === "end" ? renderEndScreen(players[winner === null ? 0 : winner - 1].name, players, history, restartMatch, returnToSetup) : null}
    </main>
  );
}

function renderStartScreen(
  formState: MatchConfig,
  setFormState: React.Dispatch<React.SetStateAction<MatchConfig>>,
  startMatch: {
    (config: MatchConfig): void;
  }
): React.JSX.Element {
  return (
    <div className="screen">
      <div className="lobby-bg-particles" />
      <div className="lobby-bg-clouds" />
      <div className="lobby">
        <div className="lobby-header">
          <span className="lobby-channel-badge">Channel 1</span>
          <div className="lobby-title-group">
            <span className="lobby-kicker">Local Hot-Seat</span>
            <h1 className="lobby-title">Gunbound</h1>
            <span className="lobby-subtitle">Artillery Duel</span>
          </div>
          <div className="lobby-room-info">
            <span className="lobby-room-tag">Room</span>
            <span className="lobby-room-name">Gunbound Local Room</span>
            <span className="lobby-room-status">Waiting</span>
          </div>
        </div>

        <div className="lobby-players">
          {renderLobbyPlayer(1, formState, "Blue", handlePlayerOneNameChange, handlePlayerOneMobileChange)}
          <div className="lobby-vs">
            <span className="lobby-vs-text">VS</span>
            <div className="lobby-vs-line" />
          </div>
          {renderLobbyPlayer(2, formState, "Red", handlePlayerTwoNameChange, handlePlayerTwoMobileChange)}
        </div>

        <div className="lobby-controls">
          <div className="lobby-options">
            <div className="lobby-option">
              <span className="lobby-option-label">Seed</span>
              <input
                className="lobby-option-input"
                value={formState.seedText}
                onChange={handleSeedChange}
                maxLength={32}
                placeholder="gunbound-local"
              />
            </div>
            <RoomPanel formState={formState} />
          </div>
          <div className="lobby-actions">
            <button type="button" className="lobby-btn lobby-btn-primary" onClick={handleStartClick}>
              <span className="lobby-btn-icon">&#9654;</span>
              <span className="lobby-btn-label">Start Match</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function handlePlayerOneNameChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setFormState({
      playerOneName: event.target.value,
      playerTwoName: formState.playerTwoName,
      playerOneMobile: formState.playerOneMobile,
      playerTwoMobile: formState.playerTwoMobile,
      seedText: formState.seedText
    });
  }

  function handlePlayerTwoNameChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setFormState({
      playerOneName: formState.playerOneName,
      playerTwoName: event.target.value,
      playerOneMobile: formState.playerOneMobile,
      playerTwoMobile: formState.playerTwoMobile,
      seedText: formState.seedText
    });
  }

  function handlePlayerOneMobileChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    setFormState({
      playerOneName: formState.playerOneName,
      playerTwoName: formState.playerTwoName,
      playerOneMobile: event.target.value as MobileType,
      playerTwoMobile: formState.playerTwoMobile,
      seedText: formState.seedText
    });
  }

  function handlePlayerTwoMobileChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    setFormState({
      playerOneName: formState.playerOneName,
      playerTwoName: formState.playerTwoName,
      playerOneMobile: formState.playerOneMobile,
      playerTwoMobile: event.target.value as MobileType,
      seedText: formState.seedText
    });
  }

  function handleSeedChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setFormState({
      playerOneName: formState.playerOneName,
      playerTwoName: formState.playerTwoName,
      playerOneMobile: formState.playerOneMobile,
      playerTwoMobile: formState.playerTwoMobile,
      seedText: event.target.value
    });
  }

  function handleStartClick(): void {
    startMatch({
      playerOneName: formState.playerOneName.trim() || "Player 1",
      playerTwoName: formState.playerTwoName.trim() || "Player 2",
      playerOneMobile: formState.playerOneMobile,
      playerTwoMobile: formState.playerTwoMobile,
      seedText: formState.seedText.trim() || "gunbound-local"
    });
  }
}

function renderLobbyPlayer(
  slot: 1 | 2,
  formState: MatchConfig,
  team: string,
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onMobileChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
): React.JSX.Element {
  const name = slot === 1 ? formState.playerOneName : formState.playerTwoName;
  const mobile = slot === 1 ? formState.playerOneMobile : formState.playerTwoMobile;
  const isBlue = slot === 1;
  const spriteSource = getMobileSpriteSource(mobile);

  return (
    <div className={"lobby-player-card" + (isBlue ? " blue" : " red")}>
      <div className="lobby-player-head">
        <span className="lobby-player-team">{team} Team</span>
        <span className="lobby-player-slot">Player {slot}</span>
      </div>
      <div className="lobby-player-sprite-wrap">
        <div className="lobby-player-sprite-bg">
          <div
            className="lobby-player-sprite"
            aria-label={mobile}
            style={{
              backgroundImage: 'url("' + spriteSource.path + '")',
              backgroundPosition: "0 0",
              backgroundRepeat: "no-repeat",
              backgroundSize: String(spriteSource.width * 4) + "px " + String(spriteSource.height) + "px"
            }}
          />
        </div>
      </div>
      <div className="lobby-player-fields">
        <div className="lobby-field">
          <label htmlFor={"name-" + String(slot)}>Name</label>
          <input id={"name-" + String(slot)} value={name} onChange={onNameChange} maxLength={18} placeholder={"Player " + String(slot)} />
        </div>
        <div className="lobby-field">
          <label htmlFor={"mobile-" + String(slot)}>Mobile</label>
          <select id={"mobile-" + String(slot)} value={mobile} onChange={onMobileChange}>
            <option value="armor">Armor</option>
            <option value="knight">Knight</option>
          </select>
        </div>
      </div>
      <div className="lobby-player-stats">
        <div className="lobby-stat">
          <span className="lobby-stat-val">{mobile === "armor" ? "118" : "92"}</span>
          <span className="lobby-stat-label">HP</span>
        </div>
        <div className="lobby-stat">
          <span className="lobby-stat-val">{mobile === "armor" ? "Short" : "Long"}</span>
          <span className="lobby-stat-label">Move</span>
        </div>
        <div className="lobby-stat">
          <span className="lobby-stat-val">{mobile === "armor" ? "Heavy" : "Arc"}</span>
          <span className="lobby-stat-label">Shot</span>
        </div>
      </div>
    </div>
  );
}

function renderEndScreen(
  winnerName: string,
  players: ReturnType<typeof useGameStore.getState>["players"],
  history: ReturnType<typeof useGameStore.getState>["history"],
  restartMatch: {
    (): void;
  },
  returnToSetup: {
    (): void;
  }
): React.JSX.Element {
  const winnerId = players[0].name === winnerName ? 1 : 2;
  return (
    <div className="screen">
      <div className="result">
        <div className="result-glow" />
        <div className="result-card">
          <div className={"result-badge " + (winnerId === 1 ? "blue" : "red")}>
            <span className="result-badge-label">Winner</span>
            <span className="result-badge-name">{winnerName}</span>
          </div>
          <div className="result-players">
            <div className={"result-player" + (winnerId === 1 ? " winner" : "")}>
              <span className="result-player-index">1</span>
              <div className="result-player-copy">
                <span className="result-player-name">{players[0].name}</span>
                <span className="result-player-score">{players[0].score} rounds</span>
              </div>
            </div>
            <span className="result-vs">vs</span>
            <div className={"result-player" + (winnerId === 2 ? " winner" : "")}>
              <span className="result-player-index">2</span>
              <div className="result-player-copy">
                <span className="result-player-name">{players[1].name}</span>
                <span className="result-player-score">{players[1].score} rounds</span>
              </div>
            </div>
          </div>
          <div className="result-actions">
            <button type="button" className="lobby-btn lobby-btn-primary" onClick={restartMatch}>
              <span className="lobby-btn-icon">&#8635;</span>
              <span className="lobby-btn-label">Play Again</span>
            </button>
            <button type="button" className="lobby-btn lobby-btn-secondary" onClick={returnToSetup}>
              <span className="lobby-btn-label">Lobby</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function selectScene(state: ReturnType<typeof useGameStore.getState>) {
  return state.scene;
}

function selectPlayers(state: ReturnType<typeof useGameStore.getState>) {
  return state.players;
}

function selectWinner(state: ReturnType<typeof useGameStore.getState>) {
  return state.winner;
}

function selectMessage(state: ReturnType<typeof useGameStore.getState>) {
  return state.message;
}

function selectSetup(state: ReturnType<typeof useGameStore.getState>) {
  return state.setup;
}

function selectHistory(state: ReturnType<typeof useGameStore.getState>) {
  return state.history;
}

function selectStartMatch(state: ReturnType<typeof useGameStore.getState>) {
  return state.startMatch;
}

function selectRestartMatch(state: ReturnType<typeof useGameStore.getState>) {
  return state.restartMatch;
}

function selectReturnToSetup(state: ReturnType<typeof useGameStore.getState>) {
  return state.returnToSetup;
}


