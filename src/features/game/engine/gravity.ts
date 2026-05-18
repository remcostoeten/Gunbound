import { getSurfaceY } from "@/features/game/engine/terrain";
import type { Player, TerrainState } from "@/features/game/types/entities";

export type PlayerGravityResult = {
  players: [Player, Player];
  unstable: boolean;
};

export function markPlayersForFalling(players: [Player, Player]): [Player, Player] {
  const nextPlayers = clonePlayers(players);
  let index = 0;

  while (index < nextPlayers.length) {
    nextPlayers[index].mobile.verticalVelocity = 0;
    index += 1;
  }

  return nextPlayers;
}

export function applyMobileGravity(players: [Player, Player], terrain: TerrainState, dt: number): PlayerGravityResult {
  const nextPlayers = clonePlayers(players);
  let unstable = false;
  let index = 0;

  while (index < nextPlayers.length) {
    const mobile = nextPlayers[index].mobile;
    const surfaceY = getSurfaceY(terrain, mobile.position.x);

    if (mobile.position.y < surfaceY - 0.5) {
      mobile.verticalVelocity += 960 * dt;
      mobile.position.y = Math.min(surfaceY, mobile.position.y + mobile.verticalVelocity * dt);
      unstable = true;

      if (mobile.position.y >= surfaceY) {
        mobile.position.y = surfaceY;
        mobile.verticalVelocity = 0;
      }
    } else {
      mobile.position.y = surfaceY;
      mobile.verticalVelocity = 0;
    }

    index += 1;
  }

  return {
    players: nextPlayers,
    unstable
  };
}

export function settlePlayersOnTerrain(players: [Player, Player], terrain: TerrainState): [Player, Player] {
  const nextPlayers = clonePlayers(players);
  let index = 0;

  while (index < nextPlayers.length) {
    nextPlayers[index].mobile.position.y = getSurfaceY(terrain, nextPlayers[index].mobile.position.x);
    index += 1;
  }

  return nextPlayers;
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

function cloneMobile(mobile: Player["mobile"]): Player["mobile"] {
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
