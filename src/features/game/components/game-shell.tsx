"use client";

import { useEffect, useRef, useState } from "react";
import { getMapPresentation, mapPresentationOptions, parseMapType } from "@/features/game/constants/map-presentation";
import { getMobilePresentation, mobilePresentationOptions } from "@/features/game/constants/mobile-presentation";
import { getMobileSpriteSource, shouldFlipMobileSprite } from "@/features/game/engine/mobile-sprites";
import { DEFAULT_MOBILE, parseMobileType } from "@/features/game/mobiles/mobile-factory";
import { AimIndicator } from "@/features/game/components/aim-indicator";
import { GameCanvas } from "@/features/game/components/game-canvas";
import { HistoryPanel } from "@/features/game/components/history-panel";
import { Hud } from "@/features/game/components/hud";
import { RoomPanel } from "@/features/game/components/room-panel";
import { TurnBanner } from "@/features/game/components/turn-banner";
import { useGameState } from "@/features/game/hooks/use-game-state";
import {
    lobbyAudioBlockedEvent,
    lobbyAudioStartedEvent,
    lobbyMatchStartAudioEvent,
    useGunboundSfx,
} from "@/features/game/hooks/use-gunbound-sfx";
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
    selectWinner,
} from "@/features/game/store/selectors/match-selectors";
import { selectHistory } from "@/features/game/store/selectors/history-selectors";
import type { MatchConfig } from "@/features/game/types/state";
import type { MapType, MobileType, PlayerAccent, PlayerTitle } from "@/features/game/types/shared";
import { useRoomSession } from "@/features/lobby/spacetime/use-room-session";
import { getBattleImmersive, subscribeDisplaySettings } from "@/lib/display-settings";
import { registerTrack, playTrack, stopAll } from "@/lib/music-bus";

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
const MATCH_START_DELAY_MS = 850;
const LOBBY_ENTRY_DELAY_MS = 2200;

type StartView = "channel" | "room-setup";

type LiveRoom = {
    title: string;
    host: string;
    mapType: MapType;
    seedText: string;
    players: string;
    status: string;
};

type FriendPresence = {
    name: string;
    mobile: MobileType;
    status: string;
    activity: string;
};

type ChannelChatMessage = {
    author: string;
    accent: PlayerAccent;
    text: string;
    time: string;
};

const LIVE_ROOMS: LiveRoom[] = [
    {
        title: "Avatar High Arc",
        host: "Remco",
        mapType: "ridge",
        seedText: "miramo-skyline",
        players: "2/2",
        status: "In Match",
    },
    {
        title: "Dragon Storm",
        host: "Mika",
        mapType: "canyon",
        seedText: "dragon-trade",
        players: "1/2",
        status: "Waiting",
    },
    {
        title: "Boomer Night",
        host: "Tariq",
        mapType: "crater",
        seedText: "wind-lab",
        players: "2/2",
        status: "Round 3",
    },
];

const FRIENDS_LIST: FriendPresence[] = [
    {
        name: "Nina",
        mobile: "knight",
        status: "Online",
        activity: "Browsing Channel 1",
    },
    {
        name: "Jasper",
        mobile: "armor",
        status: "In Room",
        activity: "Waiting in Dragon Storm",
    },
    {
        name: "Lotte",
        mobile: "dragon",
        status: "In Match",
        activity: "Round 2 on Nirvana",
    },
    {
        name: "Milan",
        mobile: "snow",
        status: "Away",
        activity: "Last seen 12m ago",
    },
];

const CHANNEL_CHAT: ChannelChatMessage[] = [
    {
        author: "System",
        accent: "gold",
        text: "Channel 1 is open. Wind conditions are dynamic tonight.",
        time: "19:42",
    },
    {
        author: "Nina",
        accent: "sky",
        text: "Who is up for a fast 1v1 after this round?",
        time: "19:43",
    },
    {
        author: "Tariq",
        accent: "coral",
        text: "Boomer Night is full, but spectators can clone the map seed.",
        time: "19:44",
    },
    {
        author: "Lotte",
        accent: "mint",
        text: "Dragon on Nirvana still feels unfair with that tailwind.",
        time: "19:45",
    },
];

type GameShellProps = {
    spacetimeRoomId?: bigint;
    onExitToLobby?: () => void;
};

export function GameShell({ spacetimeRoomId, onExitToLobby }: GameShellProps) {
    const scene = useGameState(selectScene);
    const players = useGameState(selectPlayers);
    const winner = useGameState(selectWinner);
    const message = useGameState(selectMessage);
    const history = useGameState(selectHistory);
    const setup = useGameState(selectSetup);
    const startMatch = useGameStore(selectStartMatch);
    const restartMatch = useGameStore(selectRestartMatch);
    const returnToSetup = useGameStore(selectReturnToSetup);
    const roomSession = useRoomSession(spacetimeRoomId);
    const battleSync = useBattleEventSync(roomSession);
    const [formState, setFormState] = useState<MatchConfig>(
        setup || defaultSetup,
    );
    const [startView, setStartView] = useState<StartView>("channel");
    const [showLobbyEntry, setShowLobbyEntry] = useState(true);
    const [matchStarting, setMatchStarting] = useState(false);
    const [showLobbyAudioNotice, setShowLobbyAudioNotice] = useState(false);
    const [battleImmersive, setBattleImmersiveState] = useState(function initialBattleImmersive(): boolean {
        return getBattleImmersive();
    });
    const matchStartTimeoutRef = useRef<number | null>(null);
    const lobbyEntryTimeoutRef = useRef<number | null>(null);
    const hasShownLobbyEntryRef = useRef(false);
    const startedSpacetimeRoomRef = useRef<string | null>(null);
    useGunboundSfx();

    useEffect(function manageBattleBgm(): void {
        BATTLE_TRACKS.forEach((t) => registerTrack(t.id, t.src, 0.45));
    }, []);

    useEffect(function syncBattleBgm(): void {
        if (scene === "playing") {
            const pick = BATTLE_TRACKS[Math.floor(Math.random() * BATTLE_TRACKS.length)];
            playTrack(pick.id);
        } else {
            stopAll();
        }
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

    useEffect(function stageLobbyEntry(): () => void {
        if (scene !== "start") {
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
    }, [scene]);

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

    useEffect(function resetStartViewForScene(): void {
        if (scene === "start") {
            setStartView("channel");
        }
    }, [scene]);

    useEffect(function bindBattleImmersiveSetting(): () => void {
        function syncBattleImmersive(): void {
            setBattleImmersiveState(getBattleImmersive());
        }

        return subscribeDisplaySettings(syncBattleImmersive);
    }, []);

    useEffect(function startSpacetimeRoomMatch(): void {
        if (spacetimeRoomId === undefined) return;
        if (scene !== "start" || matchStarting) return;
        if (!roomSession.room || roomSession.members.length < 2) return;

        const roomKey = roomSession.room.id.toString();
        if (startedSpacetimeRoomRef.current === roomKey) return;

        const config = createMatchConfigFromRoom(roomSession);
        startedSpacetimeRoomRef.current = roomKey;
        setFormState(config);
        queueMatchStart(config);
    }, [spacetimeRoomId, scene, matchStarting, roomSession.room, roomSession.members]);

    return (
        <main className={battleImmersive ? "game-shell game-shell--immersive" : "game-shell"}>
            <GameCanvas />
            {spacetimeRoomId !== undefined && onExitToLobby ? (
                <button
                    type="button"
                    className="game-shell-exit"
                    onClick={onExitToLobby}
                    title="Back to lobby — the match keeps running"
                >
                    ← Lobby
                </button>
            ) : null}
            {scene === "playing" ? <Hud /> : null}
            {scene === "playing" ? <HistoryPanel /> : null}
            {scene === "playing" ? <TurnBanner /> : null}
            {scene === "playing" ? (
                <div className="status-line">
                    {spacetimeRoomId !== undefined && !battleSync.canControl
                        ? message + " Waiting for " + battleSync.activePlayerName + "."
                        : message}
                </div>
            ) : null}
            {scene === "playing" ? (
                <div className="hud-bottom-wrapper">
                    <AimIndicator />
                </div>
            ) : null}
            {scene === "start"
                ? showLobbyEntry
                    ? renderLobbyEntryScreen(handleLobbyEntryComplete)
                    : startView === "channel"
                      ? renderChannelScreen(
                            formState,
                            openCreateRoom,
                            cloneRoomSetup,
                            showLobbyAudioNotice,
                        )
                      : renderStartScreen(
                            formState,
                            setFormState,
                            queueMatchStart,
                            openChannelLobby,
                            matchStarting,
                            showLobbyAudioNotice,
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

    function openCreateRoom(): void {
        setStartView("room-setup");
    }

    function openChannelLobby(): void {
        setStartView("channel");
    }

    function cloneRoomSetup(room: LiveRoom): void {
        setFormState({
            ...formState,
            seedText: room.seedText,
            mapType: room.mapType,
        });
        setStartView("room-setup");
    }
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
                    <div className="lobby-entry-badge">Channel Gate</div>
                    <div className="lobby-entry-copy">
                        <span className="lobby-entry-kicker">
                            Gunbound Network
                        </span>
                        <h1 className="lobby-entry-title">
                            Entering Channel 1
                        </h1>
                        <p className="lobby-entry-text">
                            Syncing room board, loading mobiles, and warming up
                            the wind map for a local artillery duel.
                        </p>
                    </div>
                    <div className="lobby-entry-status">
                        <div className="lobby-entry-progress">
                            <span className="lobby-entry-progress-bar" />
                        </div>
                        <div className="lobby-entry-steps" aria-hidden="true">
                            <span>Room registry online</span>
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
    openChannelLobby: {
        (): void;
    },
    matchStarting: boolean,
    showLobbyAudioNotice: boolean,
): React.JSX.Element {
    return (
        <div className="screen">
            <div className="lobby-bg-particles" />
            <div className="lobby-bg-clouds" />
            <div className="lobby">
                <div className="lobby-header">
                    <span className="lobby-channel-badge">Channel 1</span>
                    <div className="lobby-title-group">
                        <span className="lobby-kicker">Room Creation</span>
                        <h1 className="lobby-title">Create Lobby</h1>
                        <span className="lobby-subtitle">Stage The Duel</span>
                    </div>
                    <div className="lobby-room-info">
                        <span className="lobby-room-tag">Flow</span>
                        <span className="lobby-room-name">
                            Channel 1 / New Room
                        </span>
                        <span className="lobby-room-status">Draft</span>
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
                    )}
                </div>

                <div className="lobby-controls">
                    <div className="lobby-options">
                        <div className="lobby-option">
                            <span className="lobby-option-label">Map</span>
                            <select
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
                                {getMapPresentation(formState.mapType).description}
                            </span>
                        </div>
                        <div className="lobby-option">
                            <span className="lobby-option-label">Seed Variant</span>
                            <input
                                className="lobby-option-input"
                                value={formState.seedText}
                                onChange={handleSeedChange}
                                maxLength={32}
                                placeholder="gunbound-local"
                            />
                        </div>
                        <div className="lobby-option">
                            <span className="lobby-option-label">Target Score</span>
                            <select
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
                            <span className="lobby-option-label">Round Limit</span>
                            <select
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
                        <RoomPanel formState={formState} />
                    </div>
                    <div className="lobby-actions">
                        <button
                            type="button"
                            className="lobby-btn lobby-btn-secondary"
                            onClick={openChannelLobby}
                        >
                            <span className="lobby-btn-label">Back To Channel</span>
                        </button>
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

    function handleStartClick(): void {
        queueMatchStart({
            ...formState,
            playerOneName: formState.playerOneName.trim() || "Player 1",
            playerTwoName: formState.playerTwoName.trim() || "Player 2",
            seedText: formState.seedText.trim() || "gunbound-local",
        });
    }
}

function renderChannelScreen(
    formState: MatchConfig,
    openCreateRoom: {
        (): void;
    },
    cloneRoomSetup: {
        (room: LiveRoom): void;
    },
    showLobbyAudioNotice: boolean,
): React.JSX.Element {
    return (
        <div className="screen">
            <div className="lobby-bg-particles" />
            <div className="lobby-bg-clouds" />
            <div className="channel-shell">
                <div className="channel-topbar">
                    <div className="channel-title-group">
                        <span className="channel-kicker">Post Login Lobby</span>
                        <h1 className="channel-title">Channel 1</h1>
                        <span className="channel-subtitle">
                            Rooms, friends, and chat before the match starts
                        </span>
                    </div>
                    <div className="channel-actions">
                        <button
                            type="button"
                            className="lobby-btn lobby-btn-secondary"
                        >
                            <span className="lobby-btn-label">Quick Match</span>
                        </button>
                        <button
                            type="button"
                            className="lobby-btn lobby-btn-primary"
                            onClick={openCreateRoom}
                        >
                            <span className="lobby-btn-icon">&#9654;</span>
                            <span className="lobby-btn-label">Create Room</span>
                        </button>
                    </div>
                </div>
                {showLobbyAudioNotice ? (
                    <div className="lobby-audio-notice" role="status">
                        Browser autoplay blocked the lobby music. Click or press
                        any key to enable it.
                    </div>
                ) : null}
                <div className="channel-grid">
                    <section className="channel-panel channel-room-panel">
                        <div className="channel-panel-head">
                            <div>
                                <span className="channel-panel-kicker">
                                    Room Browser
                                </span>
                                <h2>Active Matches</h2>
                            </div>
                            <span className="channel-panel-badge">
                                {String(LIVE_ROOMS.length)} Rooms
                            </span>
                        </div>
                        <div className="channel-room-list">
                            {LIVE_ROOMS.map((room) => (
                                <button
                                    key={room.title}
                                    type="button"
                                    className="channel-room-card"
                                    onClick={function handleCloneRoom(): void {
                                        cloneRoomSetup(room);
                                    }}
                                >
                                    <div className="channel-room-row">
                                        <span className="channel-room-title">
                                            {room.title}
                                        </span>
                                        <span className="channel-room-state">
                                            {room.status}
                                        </span>
                                    </div>
                                    <div className="channel-room-row">
                                        <span className="channel-room-copy">
                                            Host {room.host} /{" "}
                                            {
                                                getMapPresentation(room.mapType)
                                                    .label
                                            }
                                        </span>
                                        <span className="channel-room-copy">
                                            {room.players}
                                        </span>
                                    </div>
                                    <div className="channel-room-seed">
                                        Seed {room.seedText}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                    <section className="channel-panel channel-chat-panel">
                        <div className="channel-panel-head">
                            <div>
                                <span className="channel-panel-kicker">
                                    Public Feed
                                </span>
                                <h2>Channel Chat</h2>
                            </div>
                            <span className="channel-panel-badge">
                                Generic
                            </span>
                        </div>
                        <div className="channel-chat-log">
                            {CHANNEL_CHAT.map((message) => (
                                <div
                                    key={message.author + message.time}
                                    className="channel-chat-row"
                                >
                                    <div className="channel-chat-meta">
                                        <img
                                            className="channel-chat-accent"
                                            src={"/badges/accent-" + message.accent + ".svg"}
                                            alt=""
                                            width={8}
                                            height={8}
                                        />
                                        <span className="channel-chat-author">
                                            {message.author}
                                        </span>
                                        <span className="channel-chat-time">
                                            {message.time}
                                        </span>
                                    </div>
                                    <p className="channel-chat-text">
                                        {message.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="channel-chat-compose">
                            <input
                                value={
                                    (formState.playerOneName || "Player 1") +
                                    " says hello..."
                                }
                                readOnly
                            />
                            <button
                                type="button"
                                className="lobby-btn lobby-btn-secondary"
                            >
                                <span className="lobby-btn-label">Send</span>
                            </button>
                        </div>
                    </section>
                    <section className="channel-panel channel-side-panel">
                        <div className="channel-panel-head">
                            <div>
                                <span className="channel-panel-kicker">
                                    Friend List
                                </span>
                                <h2>Online Friends</h2>
                            </div>
                            <span className="channel-panel-badge">
                                {String(FRIENDS_LIST.length)} Online
                            </span>
                        </div>
                        <div className="channel-friend-list">
                            {FRIENDS_LIST.map((friend) => (
                                <div
                                    key={friend.name}
                                    className="channel-friend-row"
                                >
                                    <div
                                        className="channel-friend-sprite"
                                        style={getFriendSpriteStyle(friend.mobile)}
                                    />
                                    <div className="channel-friend-copy">
                                        <span className="channel-friend-name">
                                            {friend.name}
                                        </span>
                                        <span className="channel-friend-state">
                                            {friend.status}
                                        </span>
                                        <span className="channel-friend-activity">
                                            {friend.activity}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="channel-create-card">
                            <span className="channel-create-kicker">
                                Ready To Host
                            </span>
                            <strong className="channel-create-title">
                                Open your own room
                            </strong>
                            <span className="channel-create-copy">
                                Current setup uses{" "}
                                {getMapPresentation(formState.mapType).label} on
                                seed {formState.seedText || "gunbound-local"}.
                            </span>
                            <button
                                type="button"
                                className="lobby-btn lobby-btn-primary"
                                onClick={openCreateRoom}
                            >
                                <span className="lobby-btn-label">
                                    Configure Duel
                                </span>
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
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

function getFriendSpriteStyle(mobileType: MobileType): React.CSSProperties {
    const spriteSource = getMobileSpriteSource(mobileType);
    const scaleX = shouldFlipMobileSprite(mobileType, 1)
        ? -0.72
        : 0.72;

    return {
        backgroundImage: 'url("' + spriteSource.path + '")',
        backgroundPosition: "0 0",
        backgroundRepeat: "no-repeat",
        backgroundSize: String(spriteSource.frameCount * 100) + "% 100%",
        transform:
            "scale(" +
            String(scaleX) +
            ", 0.72) translate(" +
            String(spriteSource.previewTranslateX * 0.42) +
            "px, " +
            String(spriteSource.previewTranslateY * 0.42) +
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
        seedText: roomSession.room
            ? "room-" + roomSession.room.code + "-" + roomSession.room.seed.toString()
            : defaultSetup.seedText,
    };
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
