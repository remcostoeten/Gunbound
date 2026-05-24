import { clamp, getSurfaceY } from "@/features/game/engine/terrain";
import type { Mobile, TerrainState } from "@/features/game/types/entities";

export type MobileTraversalResult = {
  mobile: Mobile;
  moved: boolean;
  distanceMoved: number;
};

export function moveMobileAlongTerrain(
  mobile: Mobile,
  terrain: TerrainState,
  direction: -1 | 1,
  otherMobile: Mobile,
  distanceLimit = mobile.moveRange
): MobileTraversalResult {
  const nextMobile = cloneMobile(mobile);
  const stepSize = 6;
  const totalSteps = Math.max(1, Math.ceil(distanceLimit / stepSize));
  const climbLimit = 12;
  const startX = mobile.position.x;
  let step = 0;
  let moved = false;

  while (step < totalSteps) {
    const remainingDistance = Math.max(0, distanceLimit - Math.abs(nextMobile.position.x - startX));
    const travelDistance = Math.min(stepSize, remainingDistance);
    if (travelDistance <= 0) {
      break;
    }

    const candidateX = clamp(nextMobile.position.x + travelDistance * direction, 48, terrain.width - 48);
    if (candidateX === nextMobile.position.x) {
      break;
    }

    const candidateY = getSurfaceY(terrain, candidateX);
    const currentY = getSurfaceY(terrain, nextMobile.position.x);
    const otherDistance = Math.abs(candidateX - otherMobile.position.x);
    const minDistance = nextMobile.width * 0.7 + otherMobile.width * 0.7;

    if (Math.abs(candidateY - currentY) > climbLimit) {
      break;
    }

    if (otherDistance < minDistance) {
      break;
    }

    nextMobile.position.x = candidateX;
    nextMobile.position.y = candidateY;
    moved = true;
    step += 1;
  }

  return {
    mobile: nextMobile,
    moved,
    distanceMoved: Math.abs(nextMobile.position.x - startX)
  };
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
