import type { TerrainTheme } from "@/features/game/types/shared";

export type TerrainPalette = {
  grassTop: [number, number, number];
  grassMid: [number, number, number];
  dirtTop: [number, number, number];
  dirtMid: [number, number, number];
  dirtDeep: [number, number, number];
  edge: [number, number, number];
};

export type SkyPalette = {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  cloudAlpha: number;
  sunInner: string;
  sunOuter: string;
  sunFade: string;
  backMountains: string;
  frontMountains: string;
  terrainStroke: string;
};

export function getTerrainPalette(theme: TerrainTheme): TerrainPalette {
  if (theme === "sunset") {
    return {
      grassTop: [227, 197, 95],
      grassMid: [201, 150, 72],
      dirtTop: [145, 87, 64],
      dirtMid: [119, 63, 46],
      dirtDeep: [84, 42, 31],
      edge: [166, 101, 68]
    };
  }

  if (theme === "midnight") {
    return {
      grassTop: [129, 197, 149],
      grassMid: [76, 143, 112],
      dirtTop: [86, 88, 120],
      dirtMid: [63, 59, 92],
      dirtDeep: [42, 39, 63],
      edge: [104, 100, 139]
    };
  }

  return {
    grassTop: [160, 217, 92],
    grassMid: [123, 183, 87],
    dirtTop: [148, 93, 52],
    dirtMid: [135, 84, 48],
    dirtDeep: [109, 66, 38],
    edge: [119, 72, 42]
  };
}

export function getSkyPalette(theme: TerrainTheme): SkyPalette {
  if (theme === "sunset") {
    return {
      skyTop: "#ffd1a6",
      skyMid: "#f39779",
      skyBottom: "#6b70b8",
      cloudAlpha: 0.64,
      sunInner: "rgba(255, 224, 167, 0.98)",
      sunOuter: "rgba(255, 150, 94, 0.85)",
      sunFade: "rgba(255, 150, 94, 0)",
      backMountains: "rgba(152, 103, 114, 0.72)",
      frontMountains: "rgba(127, 109, 79, 0.58)",
      terrainStroke: "#ffd889"
    };
  }

  if (theme === "midnight") {
    return {
      skyTop: "#19284e",
      skyMid: "#294a79",
      skyBottom: "#13253f",
      cloudAlpha: 0.32,
      sunInner: "rgba(246, 248, 255, 0.92)",
      sunOuter: "rgba(194, 214, 255, 0.5)",
      sunFade: "rgba(194, 214, 255, 0)",
      backMountains: "rgba(54, 78, 118, 0.78)",
      frontMountains: "rgba(64, 99, 102, 0.56)",
      terrainStroke: "#b7efcf"
    };
  }

  return {
    skyTop: "#b4e1ff",
    skyMid: "#79c0f4",
    skyBottom: "#4f93ca",
    cloudAlpha: 0.84,
    sunInner: "rgba(255, 245, 180, 0.98)",
    sunOuter: "rgba(255, 211, 111, 0.85)",
    sunFade: "rgba(255, 211, 111, 0)",
    backMountains: "rgba(68, 133, 173, 0.78)",
    frontMountains: "rgba(83, 146, 117, 0.56)",
    terrainStroke: "#d8f5a0"
  };
}
