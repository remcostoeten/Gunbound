import { clamp, getSurfaceY } from "@/features/game/engine/terrain";
import type { Mobile, TerrainState } from "@/features/game/types/entities";
import type { MobileType } from "@/features/game/types/shared";

export type MobileTraversalResult = {
  mobile: Mobile;
  moved: boolean;
  distanceMoved: number;
};

const moveStepSize = 6;

// How far a mobile can climb upward per movement step. Heavy frames grip less,
// nimble frames scramble up steeper walls. Descending is always free — a mobile
// walks (or slides) down any drop — so a single steep column never traps it the
// way a symmetric limit used to.
export function getClimbLimit(type: MobileType): number {
  if (type === "turtle" || type === "armor" || type === "snow" || type === "sate") {
    return 13;
  }

  if (type === "nak" || type === "frog" || type === "dragon" || type === "trico") {
    return 22;
  }

  return 16;
}

export function moveMobileAlongTerrain(
  mobile: Mobile,
  terrain: TerrainState,
  direction: -1 | 1,
  otherMobile: Mobile,
  distanceLimit = mobile.moveRange
): MobileTraversalResult {
  const nextMobile = cloneMobile(mobile);
  const totalSteps = Math.max(1, Math.ceil(distanceLimit / moveStepSize));
  const climbLimit = getClimbLimit(mobile.type);
  const startX = mobile.position.x;
  let step = 0;
  let moved = false;

  while (step < totalSteps) {
    const remainingDistance = Math.max(0, distanceLimit - Math.abs(nextMobile.position.x - startX));
    const travelDistance = Math.min(moveStepSize, remainingDistance);
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
    // Smaller y is higher ground, so a positive rise means climbing upward.
    const rise = currentY - candidateY;

    if (rise > climbLimit) {
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
    lastShotAngle: mobile.lastShotAngle,
    lastShotTechnique: mobile.lastShotTechnique,
    doubleDamageTurns: mobile.doubleDamageTurns,
    vulnerableTurns: mobile.vulnerableTurns,
    verticalVelocity: mobile.verticalVelocity
  };
}
