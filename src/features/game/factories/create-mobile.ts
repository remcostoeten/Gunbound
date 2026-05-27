import { worldHeight } from "@/features/game/constants/world";
import type { Mobile } from "@/features/game/types/entities";
import type { MobileType, PlayerId } from "@/features/game/types/shared";

export function createMobile(type: MobileType, id: string, playerId: PlayerId, x: number): Mobile {
  if (type === "dragon" || type === "trico") {
    return {
      id,
      type,
      hp: 88,
      maxHp: 88,
      position: { x, y: worldHeight * 0.6 },
      weapon: "primary",
      width: 34,
      height: 22,
      angle: 54,
      facing: playerId === 1 ? 1 : -1,
      moveRange: 82,
      shotDelay: 1.04,
      specialCharges: 0,
      lastShotAngle: null,
      lastShotTechnique: null,
      doubleDamageTurns: 0,
      verticalVelocity: 0
    };
  }

  if (type === "snow") {
    return {
      id,
      type,
      hp: 108,
      maxHp: 108,
      position: { x, y: worldHeight * 0.6 },
      weapon: "primary",
      width: 40,
      height: 24,
      angle: 48,
      facing: playerId === 1 ? 1 : -1,
      moveRange: 74,
      shotDelay: 1,
      specialCharges: 0,
      lastShotAngle: null,
      lastShotTechnique: null,
      doubleDamageTurns: 0,
      verticalVelocity: 0
    };
  }

  if (type === "aduko") {
    return {
      id,
      type,
      hp: 96,
      maxHp: 96,
      position: { x, y: worldHeight * 0.6 },
      weapon: "primary",
      width: 38,
      height: 22,
      angle: 50,
      facing: playerId === 1 ? 1 : -1,
      moveRange: 76,
      shotDelay: 1.06,
      specialCharges: 0,
      lastShotAngle: null,
      lastShotTechnique: null,
      doubleDamageTurns: 0,
      verticalVelocity: 0
    };
  }

  if (type === "knight") {
    return {
      id,
      type,
      hp: 92,
      maxHp: 92,
      position: { x, y: worldHeight * 0.6 },
      weapon: "primary",
      width: 34,
      height: 20,
      angle: 52,
      facing: playerId === 1 ? 1 : -1,
      moveRange: 84,
      shotDelay: 1.1,
      specialCharges: 0,
      lastShotAngle: null,
      lastShotTechnique: null,
      doubleDamageTurns: 0,
      verticalVelocity: 0
    };
  }

  if (type === "mage") {
    return {
      id,
      type,
      hp: 100,
      maxHp: 100,
      position: { x, y: worldHeight * 0.6 },
      weapon: "primary",
      width: 36,
      height: 22,
      angle: 52,
      facing: playerId === 1 ? 1 : -1,
      moveRange: 78,
      shotDelay: 1.08,
      specialCharges: 0,
      lastShotAngle: null,
      lastShotTechnique: null,
      doubleDamageTurns: 0,
      verticalVelocity: 0
    };
  }

  if (type === "nak") {
    return {
      id,
      type,
      hp: 90,
      maxHp: 90,
      position: { x, y: worldHeight * 0.6 },
      weapon: "primary",
      width: 36,
      height: 18,
      angle: 48,
      facing: playerId === 1 ? 1 : -1,
      moveRange: 88,
      shotDelay: 1,
      specialCharges: 0,
      lastShotAngle: null,
      lastShotTechnique: null,
      doubleDamageTurns: 0,
      verticalVelocity: 0
    };
  }

  if (type === "turtle") {
    return {
      id,
      type,
      hp: 110,
      maxHp: 110,
      position: { x, y: worldHeight * 0.6 },
      weapon: "primary",
      width: 40,
      height: 22,
      angle: 46,
      facing: playerId === 1 ? 1 : -1,
      moveRange: 64,
      shotDelay: 1.04,
      specialCharges: 0,
      lastShotAngle: null,
      lastShotTechnique: null,
      doubleDamageTurns: 0,
      verticalVelocity: 0
    };
  }

  if (type === "frog") {
    return {
      id,
      type,
      hp: 94,
      maxHp: 94,
      position: { x, y: worldHeight * 0.6 },
      weapon: "primary",
      width: 34,
      height: 22,
      angle: 54,
      facing: playerId === 1 ? 1 : -1,
      moveRange: 82,
      shotDelay: 1.02,
      specialCharges: 0,
      lastShotAngle: null,
      lastShotTechnique: null,
      doubleDamageTurns: 0,
      verticalVelocity: 0
    };
  }

  if (type === "sate") {
    return {
      id,
      type,
      hp: 104,
      maxHp: 104,
      position: { x, y: worldHeight * 0.6 },
      weapon: "primary",
      width: 38,
      height: 22,
      angle: 50,
      facing: playerId === 1 ? 1 : -1,
      moveRange: 74,
      shotDelay: 1.04,
      specialCharges: 0,
      lastShotAngle: null,
      lastShotTechnique: null,
      doubleDamageTurns: 0,
      verticalVelocity: 0
    };
  }

  return {
    id,
    type,
    hp: 118,
    maxHp: 118,
    position: { x, y: worldHeight * 0.6 },
    weapon: "primary",
    width: 40,
    height: 24,
    angle: 46,
    facing: playerId === 1 ? 1 : -1,
    moveRange: 68,
    shotDelay: 0.92,
    specialCharges: 0,
    lastShotAngle: null,
    lastShotTechnique: null,
    doubleDamageTurns: 0,
    verticalVelocity: 0
  };
}
