import type { MobileType } from "@/features/game/types/shared";

export type SpriteSource = {
  width: number;
  height: number;
  frameCount: number;
  path: string;
  previewScale: number;
  previewTranslateX: number;
  previewTranslateY: number;
  roomScale: number;
  roomTranslateX: number;
  roomTranslateY: number;
  battleScale: number;
  battleTranslateX: number;
  battleTranslateY: number;
};

export function getMobileSpriteSource(type: MobileType): SpriteSource {
  if (type === "armor") {
    return {
      width: 64,
      height: 64,
      frameCount: 4,
      path: "/mobiles/armor-sheet.svg",
      previewScale: 1.3,
      previewTranslateX: 0,
      previewTranslateY: 0,
      roomScale: 1.05,
      roomTranslateX: 0,
      roomTranslateY: 0,
      battleScale: 1,
      battleTranslateX: 0,
      battleTranslateY: 0
    };
  }

  if (type === "knight") {
    return {
      width: 64,
      height: 64,
      frameCount: 4,
      path: "/mobiles/knight-sheet.svg",
      previewScale: 1.3,
      previewTranslateX: 0,
      previewTranslateY: 0,
      roomScale: 1.05,
      roomTranslateX: 0,
      roomTranslateY: 0,
      battleScale: 1,
      battleTranslateX: 0,
      battleTranslateY: 0
    };
  }

  if (type === "dragon") {
    return {
      width: 64,
      height: 64,
      frameCount: 4,
      path: "/mobiles/generated/dragon-sheet.png",
      previewScale: 1.08,
      previewTranslateX: -2,
      previewTranslateY: 6,
      roomScale: 0.94,
      roomTranslateX: -1,
      roomTranslateY: 3,
      battleScale: 0.9,
      battleTranslateX: -2,
      battleTranslateY: 8
    };
  }

  if (type === "trico") {
    return {
      width: 64,
      height: 64,
      frameCount: 5,
      path: "/mobiles/generated/trico-sheet.png",
      previewScale: 1.08,
      previewTranslateX: -1,
      previewTranslateY: 5,
      roomScale: 0.94,
      roomTranslateX: -1,
      roomTranslateY: 3,
      battleScale: 0.94,
      battleTranslateX: -1,
      battleTranslateY: 8
    };
  }

  if (type === "aduko") {
    return {
      width: 64,
      height: 64,
      frameCount: 4,
      path: "/mobiles/generated/aduko-sheet.png",
      previewScale: 1.12,
      previewTranslateX: -1,
      previewTranslateY: 5,
      roomScale: 0.98,
      roomTranslateX: -1,
      roomTranslateY: 4,
      battleScale: 0.98,
      battleTranslateX: -1,
      battleTranslateY: 8
    };
  }

  if (type === "mage") {
    return {
      width: 64,
      height: 64,
      frameCount: 4,
      path: "/mobiles/generated/mage-sheet.png",
      previewScale: 1.1,
      previewTranslateX: -1,
      previewTranslateY: 5,
      roomScale: 0.96,
      roomTranslateX: -1,
      roomTranslateY: 4,
      battleScale: 0.96,
      battleTranslateX: -1,
      battleTranslateY: 8
    };
  }

  if (type === "nak") {
    return {
      width: 64,
      height: 64,
      frameCount: 4,
      path: "/mobiles/generated/nak-sheet.png",
      previewScale: 1.12,
      previewTranslateX: -1,
      previewTranslateY: 6,
      roomScale: 0.98,
      roomTranslateX: -1,
      roomTranslateY: 4,
      battleScale: 0.98,
      battleTranslateX: -1,
      battleTranslateY: 9
    };
  }

  if (type === "turtle") {
    return {
      width: 64,
      height: 64,
      frameCount: 4,
      path: "/mobiles/generated/turtle-sheet.png",
      previewScale: 1.14,
      previewTranslateX: -1,
      previewTranslateY: 5,
      roomScale: 1,
      roomTranslateX: -1,
      roomTranslateY: 4,
      battleScale: 1,
      battleTranslateX: -1,
      battleTranslateY: 8
    };
  }

  if (type === "frog") {
    return {
      width: 64,
      height: 64,
      frameCount: 4,
      path: "/mobiles/generated/frog-sheet.png",
      previewScale: 1.12,
      previewTranslateX: -1,
      previewTranslateY: 5,
      roomScale: 0.98,
      roomTranslateX: -1,
      roomTranslateY: 4,
      battleScale: 0.98,
      battleTranslateX: -1,
      battleTranslateY: 8
    };
  }

  if (type === "sate") {
    return {
      width: 64,
      height: 64,
      frameCount: 4,
      path: "/mobiles/generated/sate-sheet.png",
      previewScale: 1.08,
      previewTranslateX: -1,
      previewTranslateY: 5,
      roomScale: 0.94,
      roomTranslateX: -1,
      roomTranslateY: 4,
      battleScale: 0.94,
      battleTranslateX: -1,
      battleTranslateY: 8
    };
  }

  return {
    width: 64,
    height: 64,
    frameCount: 4,
    path: "/mobiles/generated/snow-sheet.png",
    previewScale: 1.02,
    previewTranslateX: -1,
    previewTranslateY: 5,
    roomScale: 0.9,
    roomTranslateX: -1,
    roomTranslateY: 3,
    battleScale: 0.86,
    battleTranslateX: -1,
    battleTranslateY: 9
  };
}

export function getMobileSpriteFrame(time: number, speed: number, frameCount = 4): number {
  const frame = Math.floor(time * speed) % frameCount;
  if (frame < 0) {
    return 0;
  }

  return frame;
}

export function shouldFlipMobileSprite(type: MobileType, facing: 1 | -1): boolean {
  const defaultFacing = getMobileSpriteDefaultFacing(type);
  return facing !== defaultFacing;
}

function getMobileSpriteDefaultFacing(type: MobileType): 1 | -1 {
  if (
    type === "dragon" ||
    type === "snow" ||
    type === "aduko" ||
    type === "nak" ||
    type === "turtle" ||
    type === "frog" ||
    type === "sate"
  ) {
    return -1;
  }

  return 1;
}
