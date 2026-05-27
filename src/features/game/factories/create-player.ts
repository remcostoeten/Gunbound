import { worldWidth } from "@/features/game/constants/world";
import { getSurfaceY } from "@/features/game/engine/terrain";
import { createMobile } from "@/features/game/factories/create-mobile";
import type { Mobile, Player, TerrainState } from "@/features/game/types/entities";
import type { MatchConfig } from "@/features/game/types/state";
import type { PlayerAccent, PlayerId, PlayerTitle } from "@/features/game/types/shared";

export function createPlayer(
  id: PlayerId,
  name: string,
  title: PlayerTitle,
  accent: PlayerAccent,
  mobile: Mobile,
  score: number
): Player {
  return {
    id,
    name,
    title,
    accent,
    mobile,
    score
  };
}

// Distance each mobile spawns from its edge. The resulting gap (worldWidth -
// 2 * spawnInset = 860) sits below every mobile's calm-air maximum range, so
// even the shortest-ranged heavies (turtle ~902px) can reach turn one without
// having to close distance first.
const spawnInset = 210;

export function createPlaceholderPlayers(setup: MatchConfig): [Player, Player] {
  return [
    createPlayer(1, setup.playerOneName, setup.playerOneTitle, setup.playerOneAccent, createMobile(setup.playerOneMobile, "p1-mobile", 1, spawnInset), 0),
    createPlayer(2, setup.playerTwoName, setup.playerTwoTitle, setup.playerTwoAccent, createMobile(setup.playerTwoMobile, "p2-mobile", 2, worldWidth - spawnInset), 0)
  ];
}

export function createPlayers(config: MatchConfig, terrain: TerrainState): [Player, Player] {
  const playerOneMobile = createMobile(config.playerOneMobile, "p1-mobile", 1, spawnInset);
  const playerTwoMobile = createMobile(config.playerTwoMobile, "p2-mobile", 2, worldWidth - spawnInset);

  playerOneMobile.position.y = getSurfaceY(terrain, playerOneMobile.position.x);
  playerTwoMobile.position.y = getSurfaceY(terrain, playerTwoMobile.position.x);
  playerOneMobile.facing = 1;
  playerTwoMobile.facing = -1;

  return [
    createPlayer(1, config.playerOneName || "Player 1", config.playerOneTitle, config.playerOneAccent, playerOneMobile, 0),
    createPlayer(2, config.playerTwoName || "Player 2", config.playerTwoTitle, config.playerTwoAccent, playerTwoMobile, 0)
  ];
}

export function createPlayersForRound(config: MatchConfig, terrain: TerrainState, previousPlayers: [Player, Player]): [Player, Player] {
  const nextPlayers = createPlayers(config, terrain);
  nextPlayers[0].score = previousPlayers[0].score;
  nextPlayers[1].score = previousPlayers[1].score;
  return nextPlayers;
}
