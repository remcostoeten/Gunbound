import { getWeatherDetail, getWeatherLabel, rollWeather } from "@/features/game/engine/weather";
import { worldWidth } from "@/features/game/constants/world";
import { selectNextTurn, type TurnDelayQueue } from "@/features/game/engine/delay";
import { randomInt } from "@/features/game/engine/random";
import { getWindLabel, rollWind } from "@/features/game/engine/wind";
import { createBonusBox } from "@/features/game/factories/create-bonus-box";
import { appendHistory, appendMatchEventEntries } from "@/features/game/factories/create-match-event";
import { createNextRoundState } from "@/features/game/factories/create-round-state";
import type { BonusBox, Mobile, Player, TerrainState } from "@/features/game/types/entities";
import type { DamagePopup } from "@/features/game/types/effects";
import type { MatchEvent } from "@/features/game/types/events";
import type { MatchConfig } from "@/features/game/types/state";
import type { BonusType, PlayerId, WeatherState } from "@/features/game/types/shared";

export type TurnAdvanceResult = {
  players: [Player, Player];
  turn: PlayerId;
  turnDelays: TurnDelayQueue;
  wind: { x: number; y: number };
  weather: WeatherState;
  turnCount: number;
  bonusBoxes: BonusBox[];
  message: string;
  randomState: number;
  suddenDeathActive: boolean;
  history: MatchEvent[];
  damagePopups: DamagePopup[];
  winner: PlayerId | null;
};

export type RoundResolution = {
  players: [Player, Player];
  winner: PlayerId;
  history: MatchEvent[];
  message: string;
};

export type MatchContinuation =
  | {
      type: "next-round";
      state: ReturnType<typeof createNextRoundState>;
    }
  | {
      type: "match-end";
    };

export function getRoundWinner(players: [Player, Player]): PlayerId | null {
  if (players[0].mobile.hp <= 0 && players[1].mobile.hp <= 0) {
    return 1;
  }

  if (players[0].mobile.hp <= 0) {
    return 2;
  }

  if (players[1].mobile.hp <= 0) {
    return 1;
  }

  return null;
}

export function resolveRoundWinner(
  players: [Player, Player],
  winner: PlayerId,
  round: number,
  turn: PlayerId,
  history: MatchEvent[]
): RoundResolution {
  const scoredPlayers = awardRoundScore(players, winner);
  const nextHistory = appendMatchEventEntries(history, [
    {
      round,
      turn,
      kind: "round-end",
      text:
        scoredPlayers[winner - 1].name +
        " won round " +
        String(round) +
        ". Score " +
        String(scoredPlayers[0].score) +
        "-" +
        String(scoredPlayers[1].score) +
        "."
    }
  ]);

  return {
    players: scoredPlayers,
    winner,
    history: nextHistory,
    message: createWinnerMessage(scoredPlayers, winner)
  };
}

export function resolveMatchContinuation(
  setup: MatchConfig,
  players: [Player, Player],
  round: number,
  targetScore: number,
  history: MatchEvent[]
): MatchContinuation {
  const winner = getRoundWinnerByScore(players, targetScore);

  if (winner !== null || round >= setup.roundLimit) {
    return {
      type: "match-end"
    };
  }

  return {
    type: "next-round",
    state: createNextRoundState(setup, players, round + 1, history)
  };
}

export function advanceRoundTurn(
  players: [Player, Player],
  terrain: TerrainState,
  round: number,
  turn: PlayerId,
  randomState: number,
  turnCount: number,
  suddenDeathTurn: number,
  bonusBoxes: BonusBox[],
  turnDelays: TurnDelayQueue
): TurnAdvanceResult {
  const turnSelection = selectNextTurn(turnDelays, turn, players);
  const nextTurn = turnSelection.turn;
  const nextTurnCount = turnCount + 1;
  const windRoll = rollWind(randomState);
  const weatherRoll = rollWeather(windRoll.state, terrain.width, terrain.height);
  const nextPlayers = clonePlayers(players);
  const suddenDeathState = getSuddenDeathState(nextTurnCount, suddenDeathTurn);
  const bonusRoll = maybeSpawnBonusBoxes(weatherRoll.state, bonusBoxes, nextTurnCount, terrain);
  let history = appendMatchEventEntries([], [
    {
      round,
      turn: nextTurn,
      kind: "turn-start",
      text: nextPlayers[nextTurn - 1].name + " turn."
    }
  ]);
  let damagePopups: DamagePopup[] = [];

  nextPlayers[nextTurn - 1].mobile.weapon = "primary";

  if (suddenDeathState.started) {
    history = appendMatchEventEntries(history, [
      {
        round,
        turn: nextTurn,
        kind: "sudden-death",
        text: "Sudden death started."
      }
    ]);
  }

  if (suddenDeathState.active) {
    const suddenDeathResult = applySuddenDeathTick(nextPlayers, round, nextTurn);
    history = appendHistory(history, suddenDeathResult.history);
    damagePopups = suddenDeathResult.damagePopups;
  }

  if (weatherRoll.weather.kind === "moon") {
    const currentMobile = nextPlayers[nextTurn - 1].mobile;
    const healed = Math.min(currentMobile.maxHp, currentMobile.hp + weatherRoll.weather.heal) - currentMobile.hp;
    if (healed > 0) {
      currentMobile.hp += healed;
      history = appendMatchEventEntries(history, [
        {
          round,
          turn: nextTurn,
          kind: "bonus",
          text: nextPlayers[nextTurn - 1].name + " recovered " + String(healed) + " HP under Moon."
        }
      ]);
    }
  }

  const winner = getRoundWinner(nextPlayers);
  const message =
    winner === null
      ? nextPlayers[nextTurn - 1].name + " turn. Wind " + getWindLabel(windRoll.wind) + ". " + getWeatherLabel(weatherRoll.weather) + ": " + getWeatherDetail(weatherRoll.weather) + "."
      : createWinnerMessage(nextPlayers, winner);

  return {
    players: nextPlayers,
    turn: nextTurn,
    turnDelays: turnSelection.queue,
    wind: windRoll.wind,
    weather: weatherRoll.weather,
    turnCount: nextTurnCount,
    bonusBoxes: bonusRoll.bonusBoxes,
    message,
    randomState: bonusRoll.randomState,
    suddenDeathActive: suddenDeathState.active,
    history,
    damagePopups,
    winner
  };
}

export function getSuddenDeathState(turnCount: number, suddenDeathTurn: number): {
  active: boolean;
  started: boolean;
} {
  return {
    active: turnCount >= suddenDeathTurn,
    started: turnCount === suddenDeathTurn
  };
}

function applySuddenDeathTick(
  players: [Player, Player],
  round: number,
  turn: PlayerId
): {
  damagePopups: DamagePopup[];
  history: MatchEvent[];
} {
  const damagePopups: DamagePopup[] = [];
  let history: MatchEvent[] = [];
  let index = 0;

  while (index < players.length) {
    const player = players[index];
    const damage = 8;
    player.mobile.hp = Math.max(0, player.mobile.hp - damage);
    damagePopups.push(createDamagePopup(player, damage));
    history = appendMatchEventEntries(history, [
      {
        round,
        turn,
        kind: "sudden-death",
        text: player.name + " took " + String(damage) + " storm damage."
      }
    ]);
    index += 1;
  }

  return {
    damagePopups,
    history
  };
}

function maybeSpawnBonusBoxes(
  randomState: number,
  bonusBoxes: BonusBox[],
  turnCount: number,
  terrain: TerrainState
): {
  bonusBoxes: BonusBox[];
  randomState: number;
} {
  if (turnCount % 3 !== 0 || bonusBoxes.length >= 3 || terrain.width <= 0) {
    return {
      bonusBoxes,
      randomState
    };
  }

  const typeRoll = randomInt(randomState, 0, 2);
  const xRoll = randomInt(typeRoll.state, 120, worldWidth - 120);
  const bonusType = getBonusType(typeRoll.value);
  const nextBoxes = bonusBoxes.slice();

  nextBoxes.push(createBonusBox("box-" + String(turnCount) + "-" + String(typeRoll.state), bonusType, xRoll.value));

  return {
    bonusBoxes: nextBoxes,
    randomState: xRoll.state
  };
}

function getBonusType(value: number): BonusType {
  if (value === 0) {
    return "weapon";
  }

  if (value === 1) {
    return "repair";
  }

  return "double";
}

function awardRoundScore(players: [Player, Player], winner: PlayerId): [Player, Player] {
  const nextPlayers = clonePlayers(players);
  nextPlayers[winner - 1].score += 1;
  return nextPlayers;
}

function getRoundWinnerByScore(players: [Player, Player], targetScore: number): PlayerId | null {
  if (players[0].score >= targetScore) {
    return 1;
  }

  if (players[1].score >= targetScore) {
    return 2;
  }

  return null;
}

function createWinnerMessage(players: [Player, Player], winner: PlayerId): string {
  return players[winner - 1].name + " wins.";
}

function clonePlayers(players: [Player, Player]): [Player, Player] {
  return [
    {
      id: players[0].id,
      name: players[0].name,
      title: players[0].title,
      accent: players[0].accent,
      score: players[0].score,
      mobile: cloneMobile(players[0].mobile)
    },
    {
      id: players[1].id,
      name: players[1].name,
      title: players[1].title,
      accent: players[1].accent,
      score: players[1].score,
      mobile: cloneMobile(players[1].mobile)
    }
  ];
}

function cloneMobile(mobile: Mobile): Mobile {
  return {
    id: mobile.id,
    type: mobile.type,
    hp: mobile.hp,
    maxHp: mobile.maxHp,
    position: {
      x: mobile.position.x,
      y: mobile.position.y
    },
    weapon: mobile.weapon,
    width: mobile.width,
    height: mobile.height,
    angle: mobile.angle,
    facing: mobile.facing,
    moveRange: mobile.moveRange,
    shotDelay: mobile.shotDelay,
    specialCharges: mobile.specialCharges,
    doubleDamageTurns: mobile.doubleDamageTurns,
    verticalVelocity: mobile.verticalVelocity
  };
}

function createDamagePopup(player: Player, value: number): DamagePopup {
  return {
    id: "popup-" + String(player.id) + "-" + String(value) + "-" + String(player.mobile.hp),
    value,
    position: {
      x: player.mobile.position.x,
      y: player.mobile.position.y - player.mobile.height - 16
    },
    timer: 1,
    duration: 1
  };
}
