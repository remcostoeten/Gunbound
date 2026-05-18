import type { MobileType } from "@/features/game/types/shared";

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

  if (type === "knight") {
    return {
      width: 64,
      height: 64,
      path: "/mobiles/knight-sheet.svg"
    };
  }

  if (type === "dragon") {
    return {
      width: 64,
      height: 64,
      path: "/mobiles/generated/dragon-sheet.png"
    };
  }

  return {
    width: 64,
    height: 64,
    path: "/mobiles/generated/snow-sheet.png"
  };
}

export function getMobileSpriteFrame(time: number, speed: number): number {
  const frame = Math.floor(time * speed) % 4;
  if (frame < 0) {
    return 0;
  }

  return frame;
}
