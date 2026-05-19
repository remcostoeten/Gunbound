"use client";

import { useEffect, useRef, useState } from "react";
import { getMobilePresentation, mobilePresentationOptions } from "@/features/game/constants/mobile-presentation";
import { getMobileSpriteSource, shouldFlipMobileSprite } from "@/features/game/engine/mobile-sprites";
import { AimIndicator } from "@/features/game/components/aim-indicator";
import { GameCanvas } from "@/features/game/components/game-canvas";
import { HistoryPanel } from "@/features/game/components/history-panel";
import { Hud } from "@/features/game/components/hud";
import { RoomPanel } from "@/features/game/components/room-panel";
import { TurnBanner } from "@/features/game/components/turn-banner";
import { useGameState } from "@/features/game/hooks/use-game-state";
import {
    lobbyMatchStartAudioEvent,
    useGunboundSfx,
} from "@/features/game/hooks/use-gunbound-sfx";
import { defaultSetup, useGameStore } from "@/features/game/store/game-store";
import {
    selectMessage,
    selectPlayers,
    selectRestartMatch,
    selectReturnToSetup,
    selectScene,
    selectSetup,
    selectStartMatch,
    selectWinner,
} from "@/features/game/store/selectors/match-selectors";
import { selectHistory } from "@/features/game/store/selectors/history-selectors";
import type { MatchConfig } from "@/features/game/types/state";
import type { MobileType, PlayerAccent, PlayerTitle } from "@/features/game/types/shared";

const TITLE_OPTIONS: PlayerTitle[] = ["Captain", "Raider", "Engineer", "Oracle"];
const ACCENT_OPTIONS: PlayerAccent[] = ["sky", "coral", "mint", "gold"];
const MATCH_START_DELAY_MS = 850;

export function GameShell() {
    const scene = useGameState(selectScene);
    const players = useGameState(selectPlayers);
    const winner = useGameState(selectWinner);
    const message = useGameState(selectMessage);
    const history = useGameState(selectHistory);
    const setup = useGameState(selectSetup);
    const startMatch = useGameStore(selectStartMatch);
    const restartMatch = useGameStore(selectRestartMatch);
    const returnToSetup = useGameStore(selectReturnToSetup);
    const [formState, setFormState] = useState<MatchConfig>(
        setup || defaultSetup,
    );
    const [matchStarting, setMatchStarting] = useState(false);
    const matchStartTimeoutRef = useRef<number | null>(null);
    useGunboundSfx();

    useEffect(function resetPendingMatchStart(): void {
        if (scene !== "start") {
            setMatchStarting(false);
        }
    }, [scene]);

    useEffect(function clearPendingMatchStart(): () => void {
        return function cleanupPendingMatchStart(): void {
            if (matchStartTimeoutRef.current !== null) {
                window.clearTimeout(matchStartTimeoutRef.current);
            }
        };
    }, []);

    return (
        <main className="game-shell">
            <GameCanvas />
            {scene === "playing" ? <Hud /> : null}
            {scene === "playing" ? <HistoryPanel /> : null}
            {scene === "playing" ? <TurnBanner /> : null}
            {scene === "playing" ? (
                <div className="status-line">{message}</div>
            ) : null}
            {scene === "playing" ? (
                <div className="hud-bottom-wrapper">
                    <AimIndicator />
                </div>
            ) : null}
            {scene === "start"
                ? renderStartScreen(
                      formState,
                      setFormState,
                      queueMatchStart,
                      matchStarting,
                  )
                : null}
            {scene === "end"
                ? renderEndScreen(
                      players[winner === null ? 0 : winner - 1].name,
                      players,
                      history,
                      restartMatch,
                      returnToSetup,
                  )
                : null}
        </main>
    );

    function queueMatchStart(config: MatchConfig): void {
        if (matchStarting) return;

        window.dispatchEvent(new Event(lobbyMatchStartAudioEvent));
        setMatchStarting(true);

        if (matchStartTimeoutRef.current !== null) {
            window.clearTimeout(matchStartTimeoutRef.current);
        }

        matchStartTimeoutRef.current = window.setTimeout(
            function startQueuedMatch(): void {
                matchStartTimeoutRef.current = null;
                startMatch(config);
            },
            MATCH_START_DELAY_MS,
        );
    }
}

function renderStartScreen(
    formState: MatchConfig,
    setFormState: React.Dispatch<React.SetStateAction<MatchConfig>>,
    queueMatchStart: {
        (config: MatchConfig): void;
    },
    matchStarting: boolean,
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
                        <span className="lobby-room-name">
                            Gunbound Local Room
                        </span>
                        <span className="lobby-room-status">Waiting</span>
                    </div>
                </div>

                <div className="lobby-players">
                    {renderLobbyPlayer(
                        1,
                        formState,
                        "Blue",
                        handlePlayerOneNameChange,
                        handlePlayerOneMobileChange,
                        handlePlayerOneTitleChange,
                        handlePlayerOneAccentChange,
                    )}
                    <div className="lobby-vs">
                        <span className="lobby-vs-text">VS</span>
                        <div className="lobby-vs-line" />
                    </div>
                    {renderLobbyPlayer(
                        2,
                        formState,
                        "Red",
                        handlePlayerTwoNameChange,
                        handlePlayerTwoMobileChange,
                        handlePlayerTwoTitleChange,
                        handlePlayerTwoAccentChange,
                    )}
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
                        <button
                            type="button"
                            className="lobby-btn lobby-btn-primary"
                            disabled={matchStarting}
                            onClick={handleStartClick}
                        >
                            <span className="lobby-btn-icon">&#9654;</span>
                            <span className="lobby-btn-label">
                                {matchStarting ? "Starting" : "Start Match"}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    function handlePlayerOneNameChange(
        event: React.ChangeEvent<HTMLInputElement>,
    ): void {
        setFormState({
            ...formState,
            playerOneName: event.target.value,
        });
    }

    function handlePlayerTwoNameChange(
        event: React.ChangeEvent<HTMLInputElement>,
    ): void {
        setFormState({
            ...formState,
            playerTwoName: event.target.value,
        });
    }

    function handlePlayerOneMobileChange(
        event: React.ChangeEvent<HTMLSelectElement>,
    ): void {
        setFormState({
            ...formState,
            playerOneMobile: event.target.value as MobileType,
        });
    }

    function handlePlayerTwoMobileChange(
        event: React.ChangeEvent<HTMLSelectElement>,
    ): void {
        setFormState({
            ...formState,
            playerTwoMobile: event.target.value as MobileType,
        });
    }

    function handlePlayerOneTitleChange(
        event: React.ChangeEvent<HTMLSelectElement>,
    ): void {
        setFormState({
            ...formState,
            playerOneTitle: event.target.value as PlayerTitle,
        });
    }

    function handlePlayerTwoTitleChange(
        event: React.ChangeEvent<HTMLSelectElement>,
    ): void {
        setFormState({
            ...formState,
            playerTwoTitle: event.target.value as PlayerTitle,
        });
    }

    function handlePlayerOneAccentChange(
        event: React.ChangeEvent<HTMLSelectElement>,
    ): void {
        setFormState({
            ...formState,
            playerOneAccent: event.target.value as PlayerAccent,
        });
    }

    function handlePlayerTwoAccentChange(
        event: React.ChangeEvent<HTMLSelectElement>,
    ): void {
        setFormState({
            ...formState,
            playerTwoAccent: event.target.value as PlayerAccent,
        });
    }

    function handleSeedChange(
        event: React.ChangeEvent<HTMLInputElement>,
    ): void {
        setFormState({
            ...formState,
            seedText: event.target.value,
        });
    }

    function handleStartClick(): void {
        queueMatchStart({
            ...formState,
            playerOneName: formState.playerOneName.trim() || "Player 1",
            playerTwoName: formState.playerTwoName.trim() || "Player 2",
            seedText: formState.seedText.trim() || "gunbound-local",
        });
    }
}

function renderLobbyPlayer(
    slot: 1 | 2,
    formState: MatchConfig,
    team: string,
    onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onMobileChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
    onTitleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
    onAccentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
): React.JSX.Element {
    const name = slot === 1 ? formState.playerOneName : formState.playerTwoName;
    const mobile =
        slot === 1 ? formState.playerOneMobile : formState.playerTwoMobile;
    const title =
        slot === 1 ? formState.playerOneTitle : formState.playerTwoTitle;
    const accent =
        slot === 1 ? formState.playerOneAccent : formState.playerTwoAccent;
    const isBlue = slot === 1;
    const spriteSource = getMobileSpriteSource(mobile);
    const presentation = getMobilePresentation(mobile);

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
                        style={getLobbySpriteStyle(mobile, spriteSource)}
                    />
                </div>
            </div>
            <div className="lobby-player-fields">
                <div className="lobby-field">
                    <label htmlFor={"name-" + String(slot)}>Name</label>
                    <input
                        id={"name-" + String(slot)}
                        value={name}
                        onChange={onNameChange}
                        maxLength={18}
                        placeholder={"Player " + String(slot)}
                    />
                </div>
                <div className="lobby-field">
                    <label htmlFor={"mobile-" + String(slot)}>Mobile</label>
                    <select
                        id={"mobile-" + String(slot)}
                        value={mobile}
                        onChange={onMobileChange}
                    >
                        {mobilePresentationOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="lobby-field">
                    <label htmlFor={"title-" + String(slot)}>Title</label>
                    <select
                        id={"title-" + String(slot)}
                        value={title}
                        onChange={onTitleChange}
                    >
                        {TITLE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="lobby-field">
                    <label htmlFor={"accent-" + String(slot)}>Accent</label>
                    <select
                        id={"accent-" + String(slot)}
                        value={accent}
                        onChange={onAccentChange}
                    >
                        {ACCENT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {capitalizeLabel(option)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="lobby-player-identity">
                <span className={"lobby-player-accent-chip accent-" + accent} />
                <span className="lobby-player-title-preview">
                    {title} {name.trim() || "Player " + String(slot)}
                </span>
            </div>
            <div className="lobby-player-profile">
                <span className="lobby-player-profile-role">
                    {presentation.role}
                </span>
                <span className="lobby-player-profile-copy">
                    {presentation.profile}
                </span>
            </div>
            <div className="lobby-player-stats">
                <div className="lobby-stat">
                    <span className="lobby-stat-val">{presentation.hp}</span>
                    <span className="lobby-stat-label">HP</span>
                </div>
                <div className="lobby-stat">
                    <span className="lobby-stat-val">{presentation.move}</span>
                    <span className="lobby-stat-label">Move</span>
                </div>
                <div className="lobby-stat">
                    <span className="lobby-stat-val">{presentation.shot}</span>
                    <span className="lobby-stat-label">Shot</span>
                </div>
            </div>
        </div>
    );
}

function getLobbySpriteStyle(
    mobileType: MobileType,
    spriteSource: ReturnType<typeof getMobileSpriteSource>,
): React.CSSProperties {
    const scaleX = shouldFlipMobileSprite(mobileType, 1)
        ? -spriteSource.previewScale
        : spriteSource.previewScale;
    return {
        backgroundImage: 'url("' + spriteSource.path + '")',
        backgroundPosition: "0 0",
        backgroundRepeat: "no-repeat",
        backgroundSize: String(spriteSource.frameCount * 100) + "% 100%",
        transform:
            "scale(" +
            String(scaleX) +
            ", " +
            String(spriteSource.previewScale) +
            ") translate(" +
            String(spriteSource.previewTranslateX) +
            "px, " +
            String(spriteSource.previewTranslateY) +
            "px)"
    };
}

function capitalizeLabel(value: string): string {
    return value.slice(0, 1).toUpperCase() + value.slice(1);
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
    },
): React.JSX.Element {
    const winnerId = players[0].name === winnerName ? 1 : 2;
    return (
        <div className="screen">
            <div className="result">
                <div className="result-glow" />
                <div className="result-card">
                    <div
                        className={
                            "result-badge " + (winnerId === 1 ? "blue" : "red")
                        }
                    >
                        <span className="result-badge-label">Winner</span>
                        <span className="result-badge-name">{winnerName}</span>
                    </div>
                    <div className="result-players">
                        <div
                            className={
                                "result-player" +
                                (winnerId === 1 ? " winner" : "")
                            }
                        >
                            <span className="result-player-index">1</span>
                            <div className="result-player-copy">
                                <span className="result-player-name">
                                    {players[0].name}
                                </span>
                                <span className="result-player-score">
                                    {players[0].score} rounds
                                </span>
                            </div>
                        </div>
                        <span className="result-vs">vs</span>
                        <div
                            className={
                                "result-player" +
                                (winnerId === 2 ? " winner" : "")
                            }
                        >
                            <span className="result-player-index">2</span>
                            <div className="result-player-copy">
                                <span className="result-player-name">
                                    {players[1].name}
                                </span>
                                <span className="result-player-score">
                                    {players[1].score} rounds
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="result-actions">
                        <button
                            type="button"
                            className="lobby-btn lobby-btn-primary"
                            onClick={restartMatch}
                        >
                            <span className="lobby-btn-icon">&#8635;</span>
                            <span className="lobby-btn-label">Play Again</span>
                        </button>
                        <button
                            type="button"
                            className="lobby-btn lobby-btn-secondary"
                            onClick={returnToSetup}
                        >
                            <span className="lobby-btn-label">Lobby</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
