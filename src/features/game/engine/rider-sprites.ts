import type { MobileType } from "@/features/game/types/shared";

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
    return {
      path: "/charachters/dragon-rider-sheet.png",
      width: 627,
      height: 627,
      frameCount: 4,
      battleScale: 0.052,
      battleTranslateX: -1,
      battleTranslateY: -28
    };
  }

  return null;
}

export function getRiderSpriteFrame(time: number, speed: number, frameCount: number): number {
  const frame = Math.floor(time * speed) % frameCount;
  if (frame < 0) {
    return 0;
  }

  return frame;
}
