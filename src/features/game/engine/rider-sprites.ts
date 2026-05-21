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

export type RiderMount = {
  x: number;
  y: number;
  scale: number;
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
      path: "/charachters/pink-rider-mounted-sheet.png",
      width: 64,
      height: 64,
      frameCount: 4,
      battleScale: 0.76,
      battleTranslateX: 0,
      battleTranslateY: 0
    };
  }

  return {
    path: "/charachters/dragon-rider-mounted-sheet.png",
    width: 64,
    height: 64,
    frameCount: 4,
    battleScale: 0.74,
    battleTranslateX: 0,
    battleTranslateY: 0
  };
}

export function getMobileRiderMount(type: MobileType): RiderMount {
  if (type === "armor") return { x: -2, y: -18, scale: 0.9 };
  if (type === "knight") return { x: -1, y: -19, scale: 0.9 };
  if (type === "dragon") return { x: 0, y: -22, scale: 0.86 };
  if (type === "snow") return { x: 0, y: -18, scale: 0.9 };
  if (type === "trico") return { x: -1, y: -18, scale: 0.88 };
  if (type === "aduko") return { x: 0, y: -18, scale: 0.9 };
  if (type === "mage") return { x: 0, y: -18, scale: 0.9 };
  if (type === "nak") return { x: 0, y: -17, scale: 0.88 };
  if (type === "turtle") return { x: 0, y: -18, scale: 0.9 };
  if (type === "frog") return { x: 0, y: -18, scale: 0.86 };
  return { x: 0, y: -16, scale: 0.9 };
}

export function getMountedRiderFrame(type: RiderType): number {
  if (type === "pink-rider") return 1;
  return 0;
}

export function getRiderSpriteFrame(time: number, speed: number, frameCount: number): number {
  const frame = Math.floor(time * speed) % frameCount;
  if (frame < 0) {
    return 0;
  }

  return frame;
}
