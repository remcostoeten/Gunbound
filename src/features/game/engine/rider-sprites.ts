import type { MobileType } from "@/features/game/types/shared";

export type RiderType = "dragon-rider" | "pink-rider";

export type RiderSpriteSource = {
  path: string;
  width: number;
  height: number;
  frameCount: number;
  battleScale: number;
  battleTranslateX: number;
  battleTranslateY: number;
};

export function getMobileRiderSpriteSource(type: MobileType): RiderSpriteSource | null {
  if (type === "dragon") {
    return getRiderSpriteSource("dragon-rider");
  }

  return null;
}

export function getRiderSpriteSource(type: RiderType): RiderSpriteSource {
  if (type === "pink-rider") {
    return {
      path: "/charachters/pink-rider-sheet.png",
      width: 360,
      height: 384,
      frameCount: 4,
      battleScale: 0.09,
      battleTranslateX: -4,
      battleTranslateY: -8
    };
  }

  return {
    path: "/charachters/dragon-rider-sheet.png",
    width: 627,
    height: 627,
    frameCount: 4,
    battleScale: 0.052,
    battleTranslateX: -5,
    battleTranslateY: -8
  };
}

export function getRiderSpriteFrame(time: number, speed: number, frameCount: number): number {
  const frame = Math.floor(time * speed) % frameCount;
  if (frame < 0) {
    return 0;
  }

  return frame;
}
