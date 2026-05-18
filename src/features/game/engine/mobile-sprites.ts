import type { MobileType } from "@/features/game/types/game";

export type SpriteSource = {
  width: number;
  height: number;
  path: string;
};

export function getMobileSpriteSource(type: MobileType): SpriteSource {
  if (type === "armor") {
    return {
      width: 64,
      height: 64,
      path: "/mobiles/armor-sheet.svg"
    };
  }

  return {
    width: 64,
    height: 64,
    path: "/mobiles/knight-sheet.svg"
  };
}

export function getMobileSpriteFrame(time: number, speed: number): number {
  const frame = Math.floor(time * speed) % 4;
  if (frame < 0) {
    return 0;
  }

  return frame;
}
