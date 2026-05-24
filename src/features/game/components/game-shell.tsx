"use client";

import { useEffect, useRef, useState } from "react";
import { getMapPresentation, mapPresentationOptions, parseMapType } from "@/features/game/constants/map-presentation";
import { getMobilePresentation, mobilePresentationOptions } from "@/features/game/constants/mobile-presentation";
import { getMobileSpriteSource, shouldFlipMobileSprite } from "@/features/game/engine/mobile-sprites";
import { DEFAULT_MOBILE, parseMobileType } from "@/features/game/mobiles/mobile-factory";
import { AimIndicator } from "@/features/game/components/aim-indicator";
import { BattleChrome } from "@/features/game/components/battle-chrome";
import { GameCanvas } from "@/features/game/components/game-canvas";
import { HistoryPanel } from "@/features/game/components/history-panel";
import { Hud } from "@/features/game/components/hud";
import { TurnBanner } from "@/features/game/components/turn-banner";
import { useGameState } from "@/features/game/hooks/use-game-state";
import { lobbyMatchStartAudioEvent, useGunboundSfx } from "@/features/game/hooks/use-gunbound-sfx";
import { useSoloBot } from "@/features/game/hooks/use-solo-bot";
import { defaultSetup, useGameStore } from "@/features/game/store/game-store";
import { useBattleEventSync } from "@/features/game/multiplayer/use-battle-event-sync";
import {
    selectMessage,
    selectPlayers,
    selectRestartMatch,
    selectReturnToSetup,
    selectScene,
    selectSetup,
    selectStartMatch,
    selectSurrenderMatch,
    selectWinner,
} from "@/features/game/store/selectors/match-selectors";
import { selectPhase, selectTurn, selectWind } from "@/features/game/store/selectors/hud-selectors";
import type { MatchConfig } from "@/features/game/types/state";
import type { MapType, MobileType, PlayerAccent, PlayerTitle, TurnDurationMode } from "@/features/game/types/shared";
import { useRoomSession } from "@/features/lobby/spacetime/use-room-session";
import { ROOM_STATUS } from "@/features/game/spacetime/room-status";
import { getBattleImmersive, setBrowserFullscreen, subscribeDisplaySettings } from "@/lib/display-settings";
import {
    LOBBY_BGM_SRC,
    lobbyAudioBlockedEvent,
    lobbyAudioStartedEvent,
    playTrack,
    registerTrack,
    stopAll,
    useMenuClickSound,
} from "@/lib/music-bus";

const BATTLE_TRACKS = [
    { id: "battle-01", src: "/audio/battle/01-Waterfall.mp3" },
    { id: "battle-02", src: "/audio/battle/02-Dual fight.mp3" },
    { id: "battle-03", src: "/audio/battle/03-Spirit's dance.mp3" },
    { id: "battle-04", src: "/audio/battle/04-Space odyssey.mp3" },
    { id: "battle-05", src: "/audio/battle/05-Waiting room.mp3" },
    { id: "battle-06", src: "/audio/battle/06-Machin factory.mp3" },
    { id: "battle-07", src: "/audio/battle/07-Chatting room.mp3" },
    { id: "battle-08", src: "/audio/battle/08-Reggae party.mp3" },
];

const TITLE_OPTIONS: PlayerTitle[] = ["Captain", "Raider", "Engineer", "Oracle"];
const ACCENT_OPTIONS: PlayerAccent[] = ["sky", "coral", "mint", "gold"];
const TARGET_SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ROUND_LIMIT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const TURN_DURATION_OPTIONS: Array<{ value: TurnDurationMode; label: string; description: string }> = [
    {
        value: "timed",
        label: "Timed turns",
        description: "Current flow: reposition or take the shot before the timer expires.",
    },
    {
        value: "infinite",
        label: "Infinite turns",
        description: "Async flow: a player can close and resume later on their turn.",
    },
];
const MATCH_START_DELAY_MS = 180;
const LOBBY_ENTRY_DELAY_MS = 2200;

function isDocumentFullscreen(): boolean {
    return typeof document !== "undefined" && document.fullscreenElement !== null;
}

type GameShellProps = {
    spacetimeRoomId?: bigint;
    soloPractice?: boolean;
    soloPlayerName?: string | null;
    onExitToLobby?: () => void;
};

export function GameShell({ spacetimeRoomId, soloPractice = false, soloPlayerName, onExitToLobby }: GameShellProps) {
    useMenuClickSound();
    const scene = useGameState(selectScene);
    const players = useGameState(selectPlayers);
    const winner = useGameState(selectWinner);
    const message = useGameState(selectMessage);
    const setup = useGameState(selectSetup);
    const turn = useGameState(selectTurn);
    const startMatch = useGameStore(selectStartMatch);
    const restartMatch = useGameStore(selectRestartMatch);
    const returnToSetup = useGameStore(selectReturnToSetup);
    const surrenderMatch = useGameStore(selectSurrenderMatch);
    const roomSession = useRoomSession(spacetimeRoomId);
    const isSpacetimeMatch = spacetimeRoomId !== undefined;
    const battleSync = useBattleEventSync(roomSession);
    const [formState, setFormState] = useState<MatchConfig>(
        setup || defaultSetup,
    );
    const [showLobbyEntry, setShowLobbyEntry] = useState(true);
    const [matchStarting, setMatchStarting] = useState(false);
    const [surrenderBusy, setSurrenderBusy] = useState(false);
    const [showLobbyAudioNotice, setShowLobbyAudioNotice] = useState(false);
    const [battleImmersive, setBattleImmersiveState] = useState(function initialBattleImmersive(): boolean {
        return getBattleImmersive();
    });
    const [fullscreen, setFullscreenState] = useState(function initialFullscreen(): boolean {
        return isDocumentFullscreen();
    });
    const matchStartTimeoutRef = useRef<number | null>(null);
    const lobbyEntryTimeoutRef = useRef<number | null>(null);
    const hasShownLobbyEntryRef = useRef(false);
    const initializedLocalSessionRef = useRef(false);
    const startedSpacetimeRoomRef = useRef<string | null>(null);
    useGunboundSfx();
    useSoloBot(!isSpacetimeMatch && setup?.soloBot === true);

    useEffect(function manageBattleBgm(): void {
        BATTLE_TRACKS.forEach((t) => registerTrack(t.id, t.src, 0.45));
        registerTrack("lobby", LOBBY_BGM_SRC, 0.45);
    }, []);

    useEffect(function syncBattleBgm(): void {
        if (scene === "playing") {
            const pick = BATTLE_TRACKS[Math.floor(Math.random() * BATTLE_TRACKS.length)];
            playTrack(pick.id);
            return;
        }
        if (scene === "start") {
            playTrack("lobby");
            return;
        }
        stopAll();
    }, [scene]);

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
            if (lobbyEntryTimeoutRef.current !== null) {
                window.clearTimeout(lobbyEntryTimeoutRef.current);
            }
        };
    }, []);

    useEffect(function stopBattleBgmOnExit(): () => void {
        return function cleanupBattleBgm(): void {
            stopAll();
        };
    }, []);

    useEffect(function stageLobbyEntry(): () => void {
        if (isSpacetimeMatch || scene !== "start") {
            setShowLobbyEntry(false);
            return function noopCleanup(): void {};
        }

        if (soloPractice) {
            setShowLobbyEntry(false);
            return function noopCleanup(): void {};
        }

        if (hasShownLobbyEntryRef.current) {
            setShowLobbyEntry(false);
            return function noopCleanup(): void {};
        }

        setShowLobbyEntry(true);
        lobbyEntryTimeoutRef.current = window.setTimeout(
            function finishLobbyEntry(): void {
                lobbyEntryTimeoutRef.current = null;
                hasShownLobbyEntryRef.current = true;
                setShowLobbyEntry(false);
            },
            LOBBY_ENTRY_DELAY_MS,
        );

        return function cleanupLobbyEntry(): void {
            if (lobbyEntryTimeoutRef.current !== null) {
                window.clearTimeout(lobbyEntryTimeoutRef.current);
                lobbyEntryTimeoutRef.current = null;
            }
        };
    }, [scene, isSpacetimeMatch, soloPractice]);

    useEffect(function bindLobbyAudioNotice(): () => void {
        function handleLobbyAudioBlocked(): void {
            setShowLobbyAudioNotice(true);
        }

        function handleLobbyAudioStarted(): void {
            setShowLobbyAudioNotice(false);
        }

        window.addEventListener(
            lobbyAudioBlockedEvent,
            handleLobbyAudioBlocked,
        );
        window.addEventListener(
            lobbyAudioStartedEvent,
            handleLobbyAudioStarted,
        );

        return function cleanupLobbyAudioNotice(): void {
            window.removeEventListener(
                lobbyAudioBlockedEvent,
                handleLobbyAudioBlocked,
            );
            window.removeEventListener(
                lobbyAudioStartedEvent,
                handleLobbyAudioStarted,
            );
        };
    }, []);

    useEffect(function resetLobbyAudioNoticeForScene(): void {
        if (scene !== "start") {
            setShowLobbyAudioNotice(false);
        }
    }, [scene]);

    useEffect(function bindBattleImmersiveSetting(): () => void {
        function syncBattleImmersive(): void {
            setBattleImmersiveState(getBattleImmersive());
        }

        return subscribeDisplaySettings(syncBattleImmersive);
    }, []);

    useEffect(function bindFullscreenChangeListener(): () => void {
        function onFullscreenChange(): void {
            setFullscreenState(isDocumentFullscreen());
        }
        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    useEffect(function resetLocalSessionOnEntry(): void {
        if (isSpacetimeMatch || initializedLocalSessionRef.current) return;
        initializedLocalSessionRef.current = true;
        if (scene !== "start") {
            returnToSetup();
        }
    }, [isSpacetimeMatch, returnToSetup, scene]);

    useEffect(function startSpacetimeRoomMatch(): void {
        if (!isSpacetimeMatch) return;
        if (scene !== "start" || matchStarting) return;
        if (!roomSession.isLoaded || !roomSession.room) return;
        if (roomSession.room.status !== ROOM_STATUS.IN_MATCH) return;
        if (roomSession.members.length < 2) return;

        const roomKey = roomSession.room.id.toString();
        if (startedSpacetimeRoomRef.current === roomKey) return;

        const config = createMatchConfigFromRoom(roomSession);
        startedSpacetimeRoomRef.current = roomKey;
        setFormState(config);
        queueMatchStart(config);
    }, [
        isSpacetimeMatch,
        scene,
        matchStarting,
        roomSession.isLoaded,
        roomSession.room,
        roomSession.members,
    ]);

    useEffect(function prepareLocalSoloPractice(): void {
        if (!soloPractice || isSpacetimeMatch) return;

        setFormState((current) => ({
            ...current,
            playerOneName: soloPlayerName?.trim() || current.playerOneName.trim() || "Player 1",
            playerTwoName: "Practice Bot",
            playerTwoTitle: "Oracle",
            playerTwoAccent: "coral",
            seedText: current.seedText.trim() || "solo-practice",
            soloBot: true,
        }));
    }, [soloPractice, isSpacetimeMatch, soloPlayerName]);

    return (
        <main className={battleImmersive ? "game-shell game-shell--immersive" : "game-shell"}>
            <GameCanvas />
             {spacetimeRoomId !== undefined && onExitToLobby && scene !== "end" ? (
                 <button
                     type="button"
                     className="game-shell-exit"
                     onClick={onExitToLobby}
                     title="Back to lobby — the match keeps running"
                 >
                     ← Lobby
                 </button>
             ) : null}
             <button
                 type="button"
                 className="game-shell-fullscreen"
                 aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                 onClick={function handleFullscreenToggle(): void {
                     setBrowserFullscreen(!fullscreen);
                 }}
                 title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
             >
                 {fullscreen ? "⤢" : "⛶"}
             </button>
             {scene === "playing" ? (
                 <button
                     type="button"
                     className="game-shell-surrender"
                     onClick={handleSurrender}
                     disabled={surrenderBusy || (isSpacetimeMatch && !roomSession.self)}
                     title="Forfeit this match"
                 >
                     {surrenderBusy ? "Surrendering" : "Surrender"}
                 </button>
            ) : null}
           {scene === "playing" ? (
                <>
                    <BattleChrome
                        hud={<Hud />}
                        turnBanner={<TurnBanner />}
                        aimControls={<AimIndicator />}
                        statusLine={
                            <div className="status-line" role="status" aria-live="polite">
                                {spacetimeRoomId !== undefined && !battleSync.canControl
                                    ? message + " Waiting for " + battleSync.activePlayerName + "."
                                    : message}
                            </div>
                        }
                        historyPanel={<HistoryPanel />}
                    />
                    <BattleA11yStatus />
                </>
            ) : null}
            {scene === "start"
                ? isSpacetimeMatch
                    ? renderSpacetimeMatchLoadingScreen(
                          roomSession,
                          matchStarting,
                          showLobbyAudioNotice,
                      )
                    : showLobbyEntry
                      ? renderLobbyEntryScreen(handleLobbyEntryComplete)
                      : renderStartScreen(
                            formState,
                            setFormState,
                            queueMatchStart,
                            onExitToLobby,
                            matchStarting,
                            showLobbyAudioNotice,
                            soloPractice,
                        )
                : null}
            {scene === "end"
                ? renderEndScreen(
                      players[winner === null ? 0 : winner - 1].name,
                      players,
                      restartMatch,
                      isSpacetimeMatch && onExitToLobby
                          ? onExitToLobby
                          : returnToSetup,
                  )
                : null}
        </main>
    );

    async function handleSurrender(): Promise<void> {
        if (surrenderBusy || scene !== "playing") return;
        const loser = isSpacetimeMatch && roomSession.self
            ? ((roomSession.self.slotIndex + 1) as 1 | 2)
            : turn;
        const winnerPlayer = players[loser === 1 ? 1 : 0];
        const loserPlayer = players[loser - 1];
        const confirmed = window.confirm(
            loserPlayer.name + " will surrender the match. " + winnerPlayer.name + " wins. Continue?",
        );
        if (!confirmed) return;

        setSurrenderBusy(true);
        try {
            if (isSpacetimeMatch) {
                await battleSync.surrender();
                return;
            }
            surrenderMatch(loser);
        } finally {
            setSurrenderBusy(false);
        }
    }

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
                try {
                    startMatch(config);
                } finally {
                    setMatchStarting(false);
                }
            },
            MATCH_START_DELAY_MS,
        );
    }

    function handleLobbyEntryComplete(): void {
        if (scene !== "start") {
            return;
        }

        hasShownLobbyEntryRef.current = true;
        if (lobbyEntryTimeoutRef.current !== null) {
            window.clearTimeout(lobbyEntryTimeoutRef.current);
            lobbyEntryTimeoutRef.current = null;
        }
        setShowLobbyEntry(false);
    }

}

function BattleA11yStatus(): React.JSX.Element {
    const players = useGameState(selectPlayers);
    const turn = useGameState(selectTurn);
    const phase = useGameState(selectPhase);
    const wind = useGameState(selectWind);
    const message = useGameState(selectMessage);
    const activePlayer = players[turn - 1];
    const otherPlayer = players[turn === 1 ? 1 : 0];

    return (
        <div className="game-a11y-status" role="status" aria-live="polite" aria-atomic="true">
            {message} {activePlayer.name} turn, {phase} phase. {activePlayer.name} has {activePlayer.mobile.hp} HP. {otherPlayer.name} has {otherPlayer.mobile.hp} HP. Wind {Math.round(wind.x * 10) / 10} horizontal, {Math.round(wind.y * 10) / 10} vertical.
        </div>
    );
}

function renderSpacetimeMatchLoadingScreen(
    roomSession: ReturnType<typeof useRoomSession>,
    matchStarting: boolean,
    showLobbyAudioNotice: boolean,
): React.JSX.Element {
    const room = roomSession.room;
    const members = roomSession.members;
    const mapLabel = room
        ? getMapPresentation(parseMapType(room.mapType, defaultSetup.mapType)).label
        : "Loading map";
    const roomCode = room?.code ?? "----";
    const playerCopy = members.length >= 2
        ? members[0].name + " vs " + members[1].name
        : members.length === 1
          ? members[0].name + " is waiting for opponent sync"
          : "Waiting for room roster";
    const statusCopy = !roomSession.isLoaded
        ? "Syncing room state from the server."
        : matchStarting
          ? "Both players are ready. Launching the duel."
          : room?.status === ROOM_STATUS.IN_MATCH
            ? "Preparing the battlefield."
            : "Waiting for the room to enter match status.";

    return (
        <div className="screen">
            <div className="lobby-entry">
                <div className="lobby-entry-glow" />
                <div className="lobby-entry-card">
                    <div className="lobby-entry-badge">Room {roomCode}</div>
                    <div className="lobby-entry-copy">
                        <span className="lobby-entry-kicker">Match Starting</span>
                        <h1 className="lobby-entry-title">{mapLabel}</h1>
                        <p className="lobby-entry-text">{statusCopy}</p>
                        <p className="lobby-entry-text lobby-entry-players">{playerCopy}</p>
                    </div>
                    <div className="lobby-entry-status">
                        <div className="lobby-entry-progress">
                            <span className="lobby-entry-progress-bar" />
                        </div>
                        <div className="lobby-entry-steps" aria-hidden="true">
                            <span>{roomSession.isLoaded ? "Room synced" : "Syncing room"}</span>
                            <span>{members.length >= 2 ? "Players ready" : "Loading players"}</span>
                            <span>{matchStarting ? "Launching match" : "Preparing launch"}</span>
                        </div>
                    </div>
                    {showLobbyAudioNotice ? (
                        <div className="lobby-audio-notice" role="status">
                            Browser autoplay blocked the lobby music. Click or press
                            any key to enable it.
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function renderLobbyEntryScreen(
    onComplete: {
        (): void;
    },
): React.JSX.Element {
    return (
        <div className="screen">
            <div className="lobby-entry">
                <div className="lobby-entry-glow" />
                <div className="lobby-entry-card">
                    <div className="lobby-entry-badge">Setup Gate</div>
                    <div className="lobby-entry-copy">
                        <span className="lobby-entry-kicker">
                            Local Match
                        </span>
                        <h1 className="lobby-entry-title">
                            Preparing Setup
                        </h1>
                        <p className="lobby-entry-text">
                            Loading mobiles and warming up the wind map for a
                            local artillery duel.
                        </p>
                    </div>
                    <div className="lobby-entry-status">
                        <div className="lobby-entry-progress">
                            <span className="lobby-entry-progress-bar" />
                        </div>
                        <div className="lobby-entry-steps" aria-hidden="true">
                            <span>Setup ready</span>
                            <span>Mobiles checked in</span>
                            <span>Lobby ready</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="lobby-btn lobby-btn-primary"
                        onClick={onComplete}
                    >
                        <span className="lobby-btn-icon">&#9654;</span>
                        <span className="lobby-btn-label">Enter Lobby</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function renderStartScreen(
    formState: MatchConfig,
    setFormState: React.Dispatch<React.SetStateAction<MatchConfig>>,
    queueMatchStart: {
        (config: MatchConfig): void;
    },
    onExitToLobby: (() => void) | undefined,
    matchStarting: boolean,
    showLobbyAudioNotice: boolean,
    vsBotMode: boolean,
): React.JSX.Element {
    const selectedMap = getMapPresentation(formState.mapType);

    return (
        <div className="screen">
            <div className="lobby-bg-particles" />
            <div className="lobby-bg-clouds" />
            <div className="lobby">
                <div className="lobby-header">
                    <span className="lobby-channel-badge">{vsBotMode ? "Vs Bot" : "Local Duel"}</span>
                    <div className="lobby-title-group">
                        <span className="lobby-kicker">Match Setup</span>
                        <h1 className="lobby-title">{vsBotMode ? "Practice Room" : "Create Match"}</h1>
                        <span className="lobby-subtitle">
                            {vsBotMode ? "Tune the arena, pick your mobile, and start against the bot." : "Configure a local two-player match."}
                        </span>
                    </div>
                    <div className="lobby-room-info">
                        <span className="lobby-room-tag">{selectedMap.label}</span>
                        <span className="lobby-room-name">{formState.targetScore} target / {formState.roundLimit} rounds</span>
                        <span className="lobby-room-status">{formState.turnDurationMode}</span>
                    </div>
                </div>
                {showLobbyAudioNotice ? (
                    <div className="lobby-audio-notice" role="status">
                        Browser autoplay blocked the lobby music. Click or press
                        any key to enable it.
                    </div>
                ) : null}

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
                        vsBotMode ? { nameLocked: true, personaLocked: true, slotLabel: "Bot" } : undefined,
                    )}
                </div>

                <div className="lobby-controls">
                    <div className="lobby-options">
                        <div className="lobby-option lobby-option-map">
                            <label className="lobby-option-label" htmlFor="match-map">Map</label>
                            <img
                                className="lobby-map-preview"
                                src={selectedMap.previewImage}
                                alt=""
                                aria-hidden="true"
                            />
                            <select
                                id="match-map"
                                name="match-map"
                                className="lobby-option-input"
                                value={formState.mapType}
                                onChange={handleMapTypeChange}
                            >
                                {mapPresentationOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <span className="lobby-option-copy">
                                {selectedMap.description}
                            </span>
                        </div>
                        <div className="lobby-option">
                            <label className="lobby-option-label" htmlFor="match-seed">Seed Variant</label>
                            <input
                                id="match-seed"
                                name="match-seed"
                                className="lobby-option-input"
                                value={formState.seedText}
                                onChange={handleSeedChange}
                                maxLength={32}
                                autoComplete="off"
                                placeholder="gunbound-local"
                            />
                        </div>
                        <div className="lobby-option">
                            <label className="lobby-option-label" htmlFor="match-target-score">Target Score</label>
                            <select
                                id="match-target-score"
                                name="match-target-score"
                                className="lobby-option-input"
                                value={formState.targetScore}
                                onChange={handleTargetScoreChange}
                            >
                                {TARGET_SCORE_OPTIONS.map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="lobby-option">
                            <label className="lobby-option-label" htmlFor="match-round-limit">Round Limit</label>
                            <select
                                id="match-round-limit"
                                name="match-round-limit"
                                className="lobby-option-input"
                                value={formState.roundLimit}
                                onChange={handleRoundLimitChange}
                            >
                                {ROUND_LIMIT_OPTIONS.map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="lobby-option">
                            <label className="lobby-option-label" htmlFor="match-turn-duration">Turn Duration</label>
                            <select
                                id="match-turn-duration"
                                name="match-turn-duration"
                                className="lobby-option-input"
                                value={formState.turnDurationMode}
                                onChange={handleTurnDurationModeChange}
                            >
                                {TURN_DURATION_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <span className="lobby-option-copy">
                                {getTurnDurationModeDescription(formState.turnDurationMode)}
                            </span>
                        </div>
                    </div>
                    <div className="lobby-actions">
                        {onExitToLobby ? (
                            <button
                                type="button"
                                className="lobby-btn lobby-btn-secondary"
                                onClick={onExitToLobby}
                            >
                                <span className="lobby-btn-label">Back To Lobby</span>
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="lobby-btn lobby-btn-primary"
                            disabled={matchStarting}
                            onClick={handleStartClick}
                        >
                            <span className="lobby-btn-icon">&#9654;</span>
                            <span className="lobby-btn-label">
                                {matchStarting ? "Starting" : vsBotMode ? "Start Bot Match" : "Start Match"}
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

    function handleMapTypeChange(
        event: React.ChangeEvent<HTMLSelectElement>,
    ): void {
        setFormState({
            ...formState,
            mapType: event.target.value as MapType,
        });
    }

    function handleTargetScoreChange(
        event: React.ChangeEvent<HTMLSelectElement>,
    ): void {
        setFormState({
            ...formState,
            targetScore: Number(event.target.value),
        });
    }

    function handleRoundLimitChange(
        event: React.ChangeEvent<HTMLSelectElement>,
    ): void {
        setFormState({
            ...formState,
            roundLimit: Number(event.target.value),
        });
    }

    function handleTurnDurationModeChange(
        event: React.ChangeEvent<HTMLSelectElement>,
    ): void {
        setFormState({
            ...formState,
            turnDurationMode: event.target.value as TurnDurationMode,
        });
    }

    function handleStartClick(): void {
        queueMatchStart({
            ...formState,
            playerOneName: formState.playerOneName.trim() || "Player 1",
            playerTwoName: vsBotMode ? "Practice Bot" : formState.playerTwoName.trim() || "Player 2",
            playerTwoTitle: vsBotMode ? "Oracle" : formState.playerTwoTitle,
            playerTwoAccent: vsBotMode ? "coral" : formState.playerTwoAccent,
            seedText: formState.seedText.trim() || (vsBotMode ? "solo-practice" : "gunbound-local"),
            soloBot: vsBotMode,
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
    options?: { nameLocked?: boolean; personaLocked?: boolean; slotLabel?: string },
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
                <span className="lobby-player-slot">{options?.slotLabel ?? "Player " + String(slot)}</span>
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
                        name={"player-" + String(slot) + "-name"}
                        autoComplete="off"
                        placeholder={"Player " + String(slot)}
                        disabled={options?.nameLocked === true}
                    />
                </div>
                <div className="lobby-field">
                    <label htmlFor={"mobile-" + String(slot)}>Mobile</label>
                    <select
                        id={"mobile-" + String(slot)}
                        name={"player-" + String(slot) + "-mobile"}
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
                        name={"player-" + String(slot) + "-title"}
                        value={title}
                        onChange={onTitleChange}
                        disabled={options?.personaLocked === true}
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
                        name={"player-" + String(slot) + "-accent"}
                        value={accent}
                        onChange={onAccentChange}
                        disabled={options?.personaLocked === true}
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
                <img className="lobby-player-accent-chip" src={"/badges/accent-" + accent + ".svg"} alt="" width={12} height={12} />
                <img className="lobby-title-badge" src={"/badges/badge-" + title.toLowerCase() + ".svg"} alt="" width={16} height={16} />
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

function createMatchConfigFromRoom(
    roomSession: ReturnType<typeof useRoomSession>,
): MatchConfig {
    const members = [...roomSession.members].sort(
        (a, b) => a.slotIndex - b.slotIndex,
    );
    const playerOne = members[0];
    const playerTwo = members[1];

    return {
        ...defaultSetup,
        playerOneName: playerOne?.name || defaultSetup.playerOneName,
        playerTwoName: playerTwo?.name || defaultSetup.playerTwoName,
        playerOneMobile:
            parseMobileType(playerOne?.mobileType ?? "") ?? DEFAULT_MOBILE,
        playerTwoMobile:
            parseMobileType(playerTwo?.mobileType ?? "") ?? DEFAULT_MOBILE,
        playerOneTitle: TITLE_OPTIONS[0],
        playerTwoTitle: TITLE_OPTIONS[1],
        playerOneAccent: ACCENT_OPTIONS[0],
        playerTwoAccent: ACCENT_OPTIONS[1],
        mapType: parseMapType(roomSession.room?.mapType, defaultSetup.mapType),
        targetScore:
            roomSession.room?.targetScore ?? defaultSetup.targetScore,
        roundLimit:
            roomSession.room?.roundLimit ?? defaultSetup.roundLimit,
        turnDurationMode:
            parseTurnDurationMode(roomSession.room?.turnDurationMode, defaultSetup.turnDurationMode),
        seedText: roomSession.room
            ? "room-" + roomSession.room.code + "-" + roomSession.room.seed.toString()
            : defaultSetup.seedText,
    };
}

function parseTurnDurationMode(value: string | undefined, fallback: TurnDurationMode): TurnDurationMode {
    return value === "infinite" || value === "timed" ? value : fallback;
}

function getTurnDurationModeDescription(value: TurnDurationMode): string {
    return TURN_DURATION_OPTIONS.find((option) => option.value === value)?.description ?? TURN_DURATION_OPTIONS[0].description;
}

function renderEndScreen(
    winnerName: string,
    players: ReturnType<typeof useGameStore.getState>["players"],
    restartMatch: {
        (): void;
    },
    onLobby: {
        (): void;
    },
): React.JSX.Element {
    const winnerId = players[0].name === winnerName ? 1 : 2;
    const winner = players[winnerId - 1];
    const loser = players[winnerId === 1 ? 1 : 0];

    return (
        <div className="screen screen--result">
            <div className="result">
                <div className="result-glow" aria-hidden="true" />
                <div className="result-card">
                    <div className="result-header">
                        <span className="screen-kicker">Match Complete</span>
                        <h2 className="result-title">Victory</h2>
                    </div>

                    <div
                        className={
                            "result-badge " + (winnerId === 1 ? "blue" : "red")
                        }
                    >
                        <span className="result-badge-label">Winner</span>
                        <span className="result-badge-name">{winnerName}</span>
                        <span className="result-badge-meta">
                            {winner.score} round{winner.score === 1 ? "" : "s"} won
                        </span>
                    </div>

                    <div className="result-players">
                        <div
                            className={
                                "result-player accent-" +
                                players[0].accent +
                                (winnerId === 1 ? " winner" : "")
                            }
                        >
                            <span className="result-player-index">P1</span>
                            <div className="result-player-copy">
                                <span className="result-player-name">
                                    {players[0].name}
                                </span>
                                <span className="result-player-score">
                                    {players[0].score} round
                                    {players[0].score === 1 ? "" : "s"}
                                </span>
                            </div>
                        </div>
                        <span className="result-vs">vs</span>
                        <div
                            className={
                                "result-player accent-" +
                                players[1].accent +
                                (winnerId === 2 ? " winner" : "")
                            }
                        >
                            <span className="result-player-index">P2</span>
                            <div className="result-player-copy">
                                <span className="result-player-name">
                                    {players[1].name}
                                </span>
                                <span className="result-player-score">
                                    {players[1].score} round
                                    {players[1].score === 1 ? "" : "s"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <p className="result-summary">
                        {winner.name} defeated {loser.name} with a final score of{" "}
                        {winner.score}–{loser.score}.
                    </p>

                    <div className="result-actions">
                        <button
                            type="button"
                            className="result-btn result-btn-primary"
                            onClick={restartMatch}
                        >
                            <span className="result-btn-icon" aria-hidden="true">
                                ↺
                            </span>
                            <span className="result-btn-label">Play Again</span>
                        </button>
                        <button
                            type="button"
                            className="result-btn result-btn-secondary"
                            onClick={onLobby}
                        >
                            <span className="result-btn-label">Back to Lobby</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
