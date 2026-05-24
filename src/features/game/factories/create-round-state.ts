import { defaultSuddenDeathTurn, getPhaseDuration } from "@/features/game/constants/gameplay";
import { worldHeight, worldWidth } from "@/features/game/constants/world";
import { createBattleItemInventories } from "@/features/game/engine/battle-items";
import { createInitialTurnDelays } from "@/features/game/engine/delay";
import { normalizeSeed } from "@/features/game/engine/random";
import { createTerrain } from "@/features/game/engine/terrain";
import { rollWind } from "@/features/game/engine/wind";
import { appendMatchEventEntries } from "@/features/game/factories/create-match-event";
import { createPlayers, createPlayersForRound } from "@/features/game/factories/create-player";
import { createTurnAnnouncement } from "@/features/game/factories/create-turn-announcement";
import type { Player } from "@/features/game/types/entities";
import type { MatchEvent } from "@/features/game/types/events";
import type { GameState, MatchConfig } from "@/features/game/types/state";
import type { PlayerId } from "@/features/game/types/shared";

export type StartedMatchState = GameState & {
  randomState: number;
  resolveTimer: number;
};

export type NextRoundState = Partial<GameState> & {
  randomState: number;
  resolveTimer: number;
};

export function createStartedMatchState(config: MatchConfig): StartedMatchState {
  const seed = normalizeSeed(config.seedText);
  const terrainRoll = createTerrain(seed, worldWidth, worldHeight, config.mapType);
  const players = createPlayers(config, terrainRoll.terrain);
  const windRoll = rollWind(terrainRoll.state);

  return {
    scene: "playing",
    phase: "move",
    turn: 1,
    wind: windRoll.wind,
    players,
    tick: 0,
    seed,
    terrain: terrainRoll.terrain,
    projectile: null,
    winner: null,
    round: 1,
    targetScore: config.targetScore,
    suddenDeathTurn: defaultSuddenDeathTurn,
    suddenDeathActive: false,
    power: 0,
    charging: false,
    turnCount: 1,
    turnElapsed: 0,
    turnDelays: createInitialTurnDelays(),
    turnMoveRemaining: players[0].mobile.moveRange,
    battleItemInventories: createBattleItemInventories(),
    selectedBattleItems: [null, null],
    phaseTimer: getPhaseDuration("move", config.turnDurationMode),
    phaseDuration: getPhaseDuration("move", config.turnDurationMode),
    bonusBoxes: [],
    explosionVisual: null,
    explosionVisuals: [],
    damagePopups: [],
    turnAnnouncement: createTurnAnnouncement(1, players[0].name),
    history: createRoundHistory([], players, 1, 1, "Round 1 started.", players[0].name + " turn."),
    message: "Player 1 turn. Move or fire.",
    randomState: windRoll.state,
    resolveTimer: 0
  };
}

export function createNextRoundState(
  setup: MatchConfig,
  previousPlayers: [Player, Player],
  round: number,
  previousHistory: MatchEvent[]
): NextRoundState {
  const seed = normalizeSeed(setup.seedText + "-round-" + String(round));
  const terrainRoll = createTerrain(seed, worldWidth, worldHeight, setup.mapType);
  const players = createPlayersForRound(setup, terrainRoll.terrain, previousPlayers);
  const windRoll = rollWind(terrainRoll.state);
  const starter: PlayerId = round % 2 === 0 ? 2 : 1;
  const message = players[starter - 1].name + " starts round " + String(round) + ".";

  return {
    scene: "playing",
    phase: "move",
    turn: starter,
    wind: windRoll.wind,
    players,
    seed,
    terrain: terrainRoll.terrain,
    projectile: null,
    winner: null,
    round,
    suddenDeathActive: false,
    power: 0,
    charging: false,
    turnCount: 1,
    turnElapsed: 0,
    turnDelays: createInitialTurnDelays(),
    turnMoveRemaining: players[starter - 1].mobile.moveRange,
    battleItemInventories: createBattleItemInventories(),
    selectedBattleItems: [null, null],
    phaseTimer: getPhaseDuration("move", setup.turnDurationMode),
    phaseDuration: getPhaseDuration("move", setup.turnDurationMode),
    bonusBoxes: [],
    explosionVisual: null,
    explosionVisuals: [],
    damagePopups: [],
    turnAnnouncement: createTurnAnnouncement(starter, "Round " + String(round)),
    history: createRoundHistory(
      previousHistory,
      players,
      round,
      starter,
      "Round " + String(round) + " started.",
      players[starter - 1].name + " opens the round."
    ),
    message,
    randomState: windRoll.state,
    resolveTimer: 0
  };
}

function createRoundHistory(
  history: MatchEvent[],
  players: [Player, Player],
  round: number,
  turn: PlayerId,
  roundText: string,
  turnText: string
): MatchEvent[] {
  return appendMatchEventEntries(history, [
    {
      round,
      turn,
      kind: "round-start",
      text: roundText
    },
    {
      round,
      turn,
      kind: "turn-start",
      text: turnText || players[turn - 1].name + " turn."
    }
  ]);
}
