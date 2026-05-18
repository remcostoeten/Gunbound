import { isTerrainSolid } from "@/features/game/engine/terrain";
import type { Player, TerrainState } from "@/features/game/types/entities";
import type { Vec2 } from "@/features/game/types/shared";

export function traceTerrainCollision(terrain: TerrainState, from: Vec2, to: Vec2, radius: number): Vec2 | null {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / Math.max(2, radius * 0.5)));
  let index = 0;

  while (index <= steps) {
    const ratio = index / steps;
    const point = {
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio
    };

    if (isTerrainSolid(terrain, point.x, point.y) || isTerrainSolid(terrain, point.x, point.y + radius)) {
      return point;
    }

    index += 1;
  }

  return null;
}

export function tracePlayerCollision(players: [Player, Player], owner: 1 | 2, from: Vec2, to: Vec2, radius: number): Player | null {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / Math.max(2, radius * 0.5)));
  let step = 0;

  while (step <= steps) {
    const ratio = step / steps;
    const point = {
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio
    };
    const player = findPlayerAtPoint(players, owner, point, radius);

    if (player !== null) {
      return player;
    }

    step += 1;
  }

  return null;
}

export function findPlayerAtPoint(players: [Player, Player], owner: 1 | 2, point: Vec2, radius: number): Player | null {
  let index = 0;

  while (index < players.length) {
    const player = players[index];
    if (player.id !== owner && pointIntersectsMobile(point, radius, player)) {
      return player;
    }
    index += 1;
  }

  return null;
}

export function pointIntersectsMobile(point: Vec2, radius: number, player: Player): boolean {
  const left = player.mobile.position.x - player.mobile.width * 0.5 - radius;
  const right = player.mobile.position.x + player.mobile.width * 0.5 + radius;
  const top = player.mobile.position.y - player.mobile.height - radius;
  const bottom = player.mobile.position.y + radius;

  return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
}
