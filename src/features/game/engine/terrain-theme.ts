import type { TerrainTheme } from "@/features/game/types/shared";

export type TerrainPalette = {
  grassTop: [number, number, number];
  grassMid: [number, number, number];
  grassShadow: [number, number, number];
  grassAccent: [number, number, number];
  dirtTop: [number, number, number];
  dirtMid: [number, number, number];
  dirtDeep: [number, number, number];
  dirtAccent: [number, number, number];
  rock: [number, number, number];
  edge: [number, number, number];
};

export type SkyPalette = {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  horizonGlow: string;
  horizonGlowSoft: string;
  cloudAlpha: number;
  cloudColor: string;
  cloudShade: string;
  sunInner: string;
  sunOuter: string;
  sunFade: string;
  haze: string;
  backMountains: string;
  midMountains: string;
  frontMountains: string;
  terrainStroke: string;
  starColor: string;
};

export function getTerrainPalette(theme: TerrainTheme): TerrainPalette {
  if (theme === "sunset") {
    return {
      grassTop: [227, 197, 95],
      grassMid: [201, 150, 72],
      grassShadow: [153, 105, 58],
      grassAccent: [247, 225, 134],
      dirtTop: [145, 87, 64],
      dirtMid: [119, 63, 46],
      dirtDeep: [84, 42, 31],
      dirtAccent: [177, 117, 88],
      rock: [120, 86, 79],
      edge: [166, 101, 68]
    };
  }

  if (theme === "midnight") {
    return {
      grassTop: [129, 197, 149],
      grassMid: [76, 143, 112],
      grassShadow: [52, 97, 87],
      grassAccent: [173, 231, 201],
      dirtTop: [86, 88, 120],
      dirtMid: [63, 59, 92],
      dirtDeep: [42, 39, 63],
      dirtAccent: [111, 123, 165],
      rock: [131, 158, 191],
      edge: [104, 100, 139]
    };
  }

  return {
    grassTop: [160, 217, 92],
    grassMid: [123, 183, 87],
    grassShadow: [83, 137, 71],
    grassAccent: [205, 236, 125],
    dirtTop: [148, 93, 52],
    dirtMid: [135, 84, 48],
    dirtDeep: [109, 66, 38],
    dirtAccent: [176, 122, 76],
    rock: [141, 118, 92],
    edge: [119, 72, 42]
  };
}

export function getSkyPalette(theme: TerrainTheme): SkyPalette {
  if (theme === "sunset") {
    return {
      skyTop: "#ffd1a6",
      skyMid: "#f39779",
      skyBottom: "#6b70b8",
      horizonGlow: "rgba(255, 198, 140, 0.62)",
      horizonGlowSoft: "rgba(255, 151, 120, 0.28)",
      cloudAlpha: 0.64,
      cloudColor: "rgba(255, 227, 208, 0.92)",
      cloudShade: "rgba(215, 124, 101, 0.3)",
      sunInner: "rgba(255, 224, 167, 0.98)",
      sunOuter: "rgba(255, 150, 94, 0.85)",
      sunFade: "rgba(255, 150, 94, 0)",
      haze: "rgba(255, 153, 112, 0.24)",
      backMountains: "rgba(152, 103, 114, 0.72)",
      midMountains: "rgba(136, 96, 91, 0.62)",
      frontMountains: "rgba(127, 109, 79, 0.58)",
      terrainStroke: "#ffd889",
      starColor: "rgba(255, 224, 200, 0.35)"
    };
  }

  if (theme === "midnight") {
    return {
      skyTop: "#19284e",
      skyMid: "#294a79",
      skyBottom: "#13253f",
      horizonGlow: "rgba(68, 119, 198, 0.24)",
      horizonGlowSoft: "rgba(109, 164, 255, 0.12)",
      cloudAlpha: 0.32,
      cloudColor: "rgba(214, 230, 255, 0.78)",
      cloudShade: "rgba(121, 160, 220, 0.18)",
      sunInner: "rgba(246, 248, 255, 0.92)",
      sunOuter: "rgba(194, 214, 255, 0.5)",
      sunFade: "rgba(194, 214, 255, 0)",
      haze: "rgba(73, 107, 173, 0.16)",
      backMountains: "rgba(54, 78, 118, 0.78)",
      midMountains: "rgba(40, 64, 99, 0.72)",
      frontMountains: "rgba(64, 99, 102, 0.56)",
      terrainStroke: "#b7efcf",
      starColor: "rgba(226, 238, 255, 0.9)"
    };
  }

  return {
    skyTop: "#b4e1ff",
    skyMid: "#79c0f4",
    skyBottom: "#4f93ca",
    horizonGlow: "rgba(194, 241, 255, 0.4)",
    horizonGlowSoft: "rgba(117, 202, 255, 0.18)",
    cloudAlpha: 0.84,
    cloudColor: "rgba(255, 255, 255, 0.95)",
    cloudShade: "rgba(108, 177, 221, 0.18)",
    sunInner: "rgba(255, 245, 180, 0.98)",
    sunOuter: "rgba(255, 211, 111, 0.85)",
    sunFade: "rgba(255, 211, 111, 0)",
    haze: "rgba(94, 182, 212, 0.18)",
    backMountains: "rgba(68, 133, 173, 0.78)",
    midMountains: "rgba(80, 152, 157, 0.68)",
    frontMountains: "rgba(83, 146, 117, 0.56)",
    terrainStroke: "#d8f5a0",
    starColor: "rgba(255, 255, 255, 0.45)"
  };
}
