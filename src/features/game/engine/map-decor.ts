import { normalizeSeed, randomInt, randomRange } from "@/features/game/engine/random";
import type {
  MapDecorEllipse,
  MapDecorInput,
  MapDecorLine,
  MapDecorPlan,
  MapDecorPoint,
  MapDecorPolygon,
  MapDecorPrimitive,
  MapDecorRect
} from "@/features/game/types/presentation";
import type { MapType, TerrainTheme } from "@/features/game/types/shared";

type DecorRoll = {
  items: MapDecorPrimitive[];
  state: number;
};

type ThemeDecorPalette = {
  landmarkFill: string;
  landmarkStroke: string;
  landmarkShadow: string;
  propFill: string;
  propStroke: string;
  propAccent: string;
  materialFill: string;
  materialStroke: string;
};

type GroundDecorSpec = {
  x: number;
  scale: number;
  variant: number;
};

const decorSeedSalt = 773;

export function createMapDecor(input: MapDecorInput): MapDecorPlan {
  let state = normalizeSeed(String(input.seed) + ":" + input.map + ":" + input.theme + ":" + String(decorSeedSalt));
  const background = createBackgroundLandmarks(input.map, input.theme, input.width, input.height, state);
  state = background.state;
  const foreground = createForegroundProps(input.map, input.theme, input.width, input.height, input.terrainHeights, state);
  state = foreground.state;
  const accents = createMaterialAccents(input.map, input.theme, input.width, input.height, input.terrainHeights, state);

  return {
    map: input.map,
    theme: input.theme,
    seed: normalizeSeed(input.seed),
    backgroundLandmarks: background.items,
    foregroundProps: foreground.items,
    materialAccents: accents.items
  };
}

export function createMapDecorSeed(map: MapType, theme: TerrainTheme): number {
  return normalizeSeed(map + ":" + theme + ":" + String(decorSeedSalt));
}

export function getMapDecorPalette(theme: TerrainTheme): ThemeDecorPalette {
  if (theme === "sunset") {
    return {
      landmarkFill: "rgba(121, 76, 80, 0.72)",
      landmarkStroke: "rgba(255, 210, 144, 0.38)",
      landmarkShadow: "rgba(80, 46, 55, 0.5)",
      propFill: "#9b6348",
      propStroke: "#5e332e",
      propAccent: "#ffd17b",
      materialFill: "rgba(255, 198, 103, 0.5)",
      materialStroke: "rgba(93, 47, 36, 0.45)"
    };
  }

  if (theme === "midnight") {
    return {
      landmarkFill: "rgba(53, 80, 126, 0.72)",
      landmarkStroke: "rgba(184, 218, 255, 0.34)",
      landmarkShadow: "rgba(19, 28, 58, 0.6)",
      propFill: "#596b8d",
      propStroke: "#252b48",
      propAccent: "#9df3d6",
      materialFill: "rgba(158, 238, 220, 0.42)",
      materialStroke: "rgba(30, 42, 74, 0.52)"
    };
  }

  return {
    landmarkFill: "rgba(67, 135, 116, 0.68)",
    landmarkStroke: "rgba(218, 247, 173, 0.42)",
    landmarkShadow: "rgba(55, 91, 91, 0.36)",
    propFill: "#80a95b",
    propStroke: "#43633d",
    propAccent: "#f8db6e",
    materialFill: "rgba(232, 250, 140, 0.44)",
    materialStroke: "rgba(71, 92, 50, 0.42)"
  };
}

function createBackgroundLandmarks(map: MapType, theme: TerrainTheme, width: number, height: number, state: number): DecorRoll {
  if (theme === "sunset") {
    return createSunsetLandmarks(map, width, height, state);
  }

  if (theme === "midnight") {
    return createMidnightLandmarks(map, width, height, state);
  }

  return createMeadowLandmarks(map, width, height, state);
}

function createMeadowLandmarks(map: MapType, width: number, height: number, state: number): DecorRoll {
  const palette = getMapDecorPalette("meadow");
  const items: MapDecorPrimitive[] = [];
  let nextState = state;
  const hillCount = map === "rolling" ? 5 : 4;
  let index = 0;

  while (index < hillCount) {
    const xRoll = randomRange(nextState, width * 0.08, width * 0.92);
    const yRoll = randomRange(xRoll.state, height * 0.48, height * 0.65);
    const rxRoll = randomRange(yRoll.state, 105, 190);
    const ryRoll = randomRange(rxRoll.state, 26, 55);
    nextState = ryRoll.state;
    items.push(createEllipse("meadow-hill-" + String(index), "background", xRoll.value, yRoll.value, rxRoll.value, ryRoll.value, palette.landmarkFill, palette.landmarkStroke, 0.82, 0.42, 0));
    items.push(createEllipse("meadow-hill-shadow-" + String(index), "background", xRoll.value + rxRoll.value * 0.12, yRoll.value + ryRoll.value * 0.1, rxRoll.value * 0.82, ryRoll.value * 0.52, palette.landmarkShadow, null, 0.36, 0.44, 0));
    index += 1;
  }

  items.push(...createWindmill(width * 0.18, height * 0.42, 0.95, palette, "meadow-windmill-left"));
  items.push(...createTreeCluster(width * 0.78, height * 0.5, 1.1, palette, "meadow-tree-cluster"));
  items.push(...createFence(width * 0.48, height * 0.59, 1, palette, "meadow-fence"));

  return { items, state: nextState };
}

function createSunsetLandmarks(map: MapType, width: number, height: number, state: number): DecorRoll {
  const palette = getMapDecorPalette("sunset");
  const items: MapDecorPrimitive[] = [];
  let nextState = state;
  const mesaCount = map === "canyon" ? 6 : 5;
  let index = 0;

  while (index < mesaCount) {
    const xRoll = randomRange(nextState, width * 0.04, width * 0.96);
    const yRoll = randomRange(xRoll.state, height * 0.34, height * 0.54);
    const widthRoll = randomRange(yRoll.state, 64, 140);
    const heightRoll = randomRange(widthRoll.state, 70, 160);
    nextState = heightRoll.state;
    items.push(...createMesa("sunset-mesa-" + String(index), xRoll.value, yRoll.value, widthRoll.value, heightRoll.value, palette, index));
    index += 1;
  }

  items.push(...createArch(width * 0.7, height * 0.5, 1.2, palette, "sunset-arch"));
  return { items, state: nextState };
}

function createMidnightLandmarks(map: MapType, width: number, height: number, state: number): DecorRoll {
  const palette = getMapDecorPalette("midnight");
  const items: MapDecorPrimitive[] = [];
  let nextState = state;
  const crystalCount = map === "crater" ? 7 : 5;
  let index = 0;

  while (index < crystalCount) {
    const xRoll = randomRange(nextState, width * 0.06, width * 0.94);
    const yRoll = randomRange(xRoll.state, height * 0.38, height * 0.58);
    const scaleRoll = randomRange(yRoll.state, 0.75, 1.45);
    nextState = scaleRoll.state;
    items.push(...createCrystal("midnight-crystal-" + String(index), xRoll.value, yRoll.value, scaleRoll.value, palette, "background"));
    index += 1;
  }

  items.push(...createCrashedSatellite(width * 0.28, height * 0.5, 1, palette, "midnight-satellite"));
  return { items, state: nextState };
}

function createForegroundProps(
  map: MapType,
  theme: TerrainTheme,
  width: number,
  height: number,
  terrainHeights: number[] | undefined,
  state: number
): DecorRoll {
  const palette = getMapDecorPalette(theme);
  const items: MapDecorPrimitive[] = [];
  let nextState = state;
  const specs = createGroundSpecs(map, width, 10, nextState, 0.08, 0.92);
  nextState = specs.state;
  let index = 0;

  while (index < specs.items.length) {
    const spec = specs.items[index];
    const y = getGroundY(spec.x, height, terrainHeights);
    if (theme === "sunset") {
      items.push(...createCactus("sunset-cactus-" + String(index), spec.x, y, spec.scale, palette));
    } else if (theme === "midnight") {
      items.push(...createCrystal("midnight-foreground-crystal-" + String(index), spec.x, y, spec.scale * 0.58, palette, "foreground"));
    } else {
      items.push(...createFlowerPatch("meadow-flower-" + String(index), spec.x, y, spec.scale, palette, spec.variant));
    }
    index += 1;
  }

  return { items, state: nextState };
}

function createMaterialAccents(
  map: MapType,
  theme: TerrainTheme,
  width: number,
  height: number,
  terrainHeights: number[] | undefined,
  state: number
): DecorRoll {
  const palette = getMapDecorPalette(theme);
  const items: MapDecorPrimitive[] = [];
  let nextState = state;
  const count = map === "crater" ? 18 : 14;
  const specs = createGroundSpecs(map, width, count, nextState, 0.04, 0.96);
  nextState = specs.state;
  let index = 0;

  while (index < specs.items.length) {
    const spec = specs.items[index];
    const y = getGroundY(spec.x, height, terrainHeights);
    if (theme === "sunset") {
      items.push(...createStoneStrata("sunset-strata-" + String(index), spec.x, y + 7, spec.scale, palette));
    } else if (theme === "midnight") {
      items.push(...createGlowShard("midnight-glow-shard-" + String(index), spec.x, y - 2, spec.scale, palette));
    } else {
      items.push(...createGrassAccent("meadow-grass-accent-" + String(index), spec.x, y, spec.scale, palette));
    }
    index += 1;
  }

  return { items, state: nextState };
}

function createGroundSpecs(map: MapType, width: number, count: number, state: number, minRatio: number, maxRatio: number): { items: GroundDecorSpec[]; state: number } {
  const items: GroundDecorSpec[] = [];
  let nextState = state;
  let index = 0;

  while (index < count) {
    const band = index / Math.max(1, count - 1);
    const jitterRoll = randomRange(nextState, -width * 0.025, width * 0.025);
    const scaleRoll = randomRange(jitterRoll.state, 0.72, 1.38);
    const variantRoll = randomInt(scaleRoll.state, 0, 3);
    nextState = variantRoll.state;
    items.push({
      x: clamp(width * (minRatio + (maxRatio - minRatio) * band) + jitterRoll.value + getMapDecorOffset(map, index), width * 0.02, width * 0.98),
      scale: scaleRoll.value,
      variant: variantRoll.value
    });
    index += 1;
  }

  return { items, state: nextState };
}

function createWindmill(x: number, y: number, scale: number, palette: ThemeDecorPalette, id: string): MapDecorPrimitive[] {
  return [
    createPolygon(id + "-tower", "midground", [
      { x: x - 10 * scale, y },
      { x: x + 10 * scale, y },
      { x: x + 15 * scale, y: y + 82 * scale },
      { x: x - 15 * scale, y: y + 82 * scale }
    ], palette.landmarkShadow, palette.landmarkStroke, 0.76, 0.58, 0),
    createPolygon(id + "-roof", "midground", [
      { x: x - 16 * scale, y: y + 4 * scale },
      { x, y: y - 18 * scale },
      { x: x + 16 * scale, y: y + 4 * scale }
    ], palette.landmarkFill, palette.landmarkStroke, 0.78, 0.58, 0),
    createLine(id + "-sails-a", "midground", [
      { x: x - 24 * scale, y: y + 14 * scale },
      { x: x + 24 * scale, y: y + 42 * scale }
    ], palette.landmarkStroke, null, 0.64, 0.56, 8 * scale),
    createLine(id + "-sails-b", "midground", [
      { x: x + 24 * scale, y: y + 14 * scale },
      { x: x - 24 * scale, y: y + 42 * scale }
    ], palette.landmarkStroke, null, 0.64, 0.56, 8 * scale),
    createRect(id + "-hub", "midground", x - 5 * scale, y + 20 * scale, 10 * scale, 10 * scale, 2 * scale, palette.propAccent, palette.landmarkStroke, 0.82, 0.56, 0)
  ];
}

function createTreeCluster(x: number, y: number, scale: number, palette: ThemeDecorPalette, id: string): MapDecorPrimitive[] {
  return [
    createRect(id + "-trunk-left", "midground", x - 36 * scale, y + 10 * scale, 14 * scale, 52 * scale, 4 * scale, palette.landmarkShadow, palette.landmarkStroke, 0.72, 0.54, 0),
    createRect(id + "-trunk-mid", "midground", x - 6 * scale, y + 12 * scale, 15 * scale, 56 * scale, 4 * scale, palette.landmarkShadow, palette.landmarkStroke, 0.72, 0.54, 0),
    createRect(id + "-trunk-right", "midground", x + 20 * scale, y + 10 * scale, 14 * scale, 50 * scale, 4 * scale, palette.landmarkShadow, palette.landmarkStroke, 0.72, 0.54, 0),
    createEllipse(id + "-canopy-left", "midground", x - 26 * scale, y + 4 * scale, 28 * scale, 24 * scale, palette.landmarkFill, palette.landmarkStroke, 0.78, 0.52, -0.1),
    createEllipse(id + "-canopy-mid", "midground", x + 4 * scale, y - 8 * scale, 34 * scale, 28 * scale, palette.landmarkFill, palette.landmarkStroke, 0.8, 0.52, 0.04),
    createEllipse(id + "-canopy-right", "midground", x + 34 * scale, y + 2 * scale, 30 * scale, 24 * scale, palette.landmarkFill, palette.landmarkStroke, 0.76, 0.52, 0.08),
    createEllipse(id + "-highlight", "midground", x + 8 * scale, y - 14 * scale, 20 * scale, 10 * scale, palette.propAccent, null, 0.24, 0.5, -0.12)
  ];
}

function createFence(x: number, y: number, scale: number, palette: ThemeDecorPalette, id: string): MapDecorPrimitive[] {
  return [
    createLine(id + "-rail-top", "background", [
      { x: x - 72 * scale, y: y - 8 * scale },
      { x: x + 70 * scale, y: y - 2 * scale }
    ], palette.landmarkStroke, null, 0.34, 0.48, 4 * scale),
    createLine(id + "-rail-bottom", "background", [
      { x: x - 74 * scale, y: y + 10 * scale },
      { x: x + 68 * scale, y: y + 14 * scale }
    ], palette.landmarkShadow, null, 0.3, 0.48, 4 * scale),
    createLine(id + "-post-a", "background", [
      { x: x - 54 * scale, y: y - 14 * scale },
      { x: x - 56 * scale, y: y + 18 * scale }
    ], palette.landmarkShadow, null, 0.26, 0.48, 3 * scale),
    createLine(id + "-post-b", "background", [
      { x: x - 16 * scale, y: y - 10 * scale },
      { x: x - 18 * scale, y: y + 22 * scale }
    ], palette.landmarkShadow, null, 0.26, 0.48, 3 * scale),
    createLine(id + "-post-c", "background", [
      { x: x + 22 * scale, y: y - 8 * scale },
      { x: x + 20 * scale, y: y + 24 * scale }
    ], palette.landmarkShadow, null, 0.26, 0.48, 3 * scale),
    createLine(id + "-post-d", "background", [
      { x: x + 58 * scale, y: y - 6 * scale },
      { x: x + 56 * scale, y: y + 26 * scale }
    ], palette.landmarkShadow, null, 0.26, 0.48, 3 * scale)
  ];
}

function createMesa(id: string, x: number, y: number, width: number, height: number, palette: ThemeDecorPalette, variant: number): MapDecorPrimitive[] {
  const leftTop = x - width * (variant % 2 === 0 ? 0.42 : 0.34);
  const rightTop = x + width * (variant % 2 === 0 ? 0.34 : 0.43);
  return [
    createPolygon(id + "-body", "background", [
      { x: leftTop, y },
      { x: rightTop, y: y + height * 0.04 },
      { x: x + width * 0.52, y: y + height },
      { x: x - width * 0.58, y: y + height * 0.96 }
    ], palette.landmarkFill, palette.landmarkStroke, 0.78, 0.4, 0),
    createPolygon(id + "-cap", "background", [
      { x: leftTop - width * 0.06, y: y - height * 0.06 },
      { x: rightTop + width * 0.06, y: y - height * 0.03 },
      { x: rightTop, y: y + height * 0.09 },
      { x: leftTop, y: y + height * 0.06 }
    ], palette.propAccent, null, 0.24, 0.4, 0),
    createLine(id + "-strata-a", "background", [
      { x: x - width * 0.38, y: y + height * 0.26 },
      { x: x + width * 0.26, y: y + height * 0.3 }
    ], palette.landmarkStroke, null, 0.3, 0.42, 5),
    createLine(id + "-strata-b", "background", [
      { x: x - width * 0.44, y: y + height * 0.58 },
      { x: x + width * 0.22, y: y + height * 0.63 }
    ], palette.landmarkShadow, null, 0.24, 0.42, 6)
  ];
}

function createArch(x: number, y: number, scale: number, palette: ThemeDecorPalette, id: string): MapDecorPrimitive[] {
  return [
    createLine(id + "-span", "midground", [
      { x: x - 82 * scale, y: y + 64 * scale },
      { x: x - 56 * scale, y: y + 14 * scale },
      { x, y: y - 8 * scale },
      { x: x + 58 * scale, y: y + 18 * scale },
      { x: x + 86 * scale, y: y + 70 * scale }
    ], palette.landmarkFill, palette.landmarkStroke, 0.62, 0.54, 20 * scale),
    createRect(id + "-left-foot", "midground", x - 84 * scale, y + 42 * scale, 24 * scale, 42 * scale, 6 * scale, palette.landmarkShadow, palette.landmarkStroke, 0.58, 0.56, -0.08),
    createRect(id + "-right-foot", "midground", x + 56 * scale, y + 46 * scale, 26 * scale, 40 * scale, 6 * scale, palette.landmarkShadow, palette.landmarkStroke, 0.58, 0.56, 0.08)
  ];
}

function createCrashedSatellite(x: number, y: number, scale: number, palette: ThemeDecorPalette, id: string): MapDecorPrimitive[] {
  return [
    createRect(id + "-body", "midground", x - 44 * scale, y - 10 * scale, 88 * scale, 28 * scale, 7 * scale, palette.landmarkShadow, palette.landmarkStroke, 0.74, 0.54, -0.22),
    createRect(id + "-panel-left", "midground", x - 88 * scale, y - 20 * scale, 38 * scale, 18 * scale, 3 * scale, palette.propFill, palette.landmarkStroke, 0.62, 0.56, -0.36),
    createRect(id + "-panel-right", "midground", x + 48 * scale, y - 2 * scale, 42 * scale, 18 * scale, 3 * scale, palette.propFill, palette.landmarkStroke, 0.56, 0.56, 0.18),
    createEllipse(id + "-dish", "midground", x + 12 * scale, y - 16 * scale, 13 * scale, 8 * scale, palette.propAccent, palette.landmarkStroke, 0.68, 0.56, -0.28)
  ];
}

function createCrystal(id: string, x: number, y: number, scale: number, palette: ThemeDecorPalette, layer: "background" | "foreground"): MapDecorPrimitive[] {
  const alpha = layer === "background" ? 0.42 : 0.72;
  const parallax = layer === "background" ? 0.46 : 0.82;

  return [
    createPolygon(id + "-main", layer, [
      { x, y: y - 62 * scale },
      { x: x + 22 * scale, y: y - 16 * scale },
      { x: x + 10 * scale, y: y + 8 * scale },
      { x: x - 14 * scale, y: y + 8 * scale },
      { x: x - 24 * scale, y: y - 18 * scale }
    ], palette.propAccent, palette.landmarkStroke, alpha, parallax, 0.08),
    createPolygon(id + "-side", layer, [
      { x: x - 8 * scale, y: y - 42 * scale },
      { x: x + 2 * scale, y: y - 20 * scale },
      { x: x - 10 * scale, y: y + 6 * scale },
      { x: x - 20 * scale, y: y - 10 * scale }
    ], palette.landmarkFill, null, alpha * 0.68, parallax, -0.08),
    createLine(id + "-shine", layer, [
      { x: x + 2 * scale, y: y - 48 * scale },
      { x: x + 9 * scale, y: y - 26 * scale },
      { x: x + 3 * scale, y: y - 8 * scale }
    ], palette.landmarkStroke, null, alpha * 0.72, parallax, 3 * scale)
  ];
}

function createCactus(id: string, x: number, y: number, scale: number, palette: ThemeDecorPalette): MapDecorPrimitive[] {
  return [
    createPolygon(id + "-body", "foreground", [
      { x: x - 7 * scale, y },
      { x: x - 8 * scale, y: y - 42 * scale },
      { x: x - 2 * scale, y: y - 56 * scale },
      { x: x + 7 * scale, y: y - 42 * scale },
      { x: x + 8 * scale, y }
    ], palette.propFill, palette.propStroke, 0.92, 0.94, 0),
    createRect(id + "-arm-left", "foreground", x - 24 * scale, y - 34 * scale, 12 * scale, 26 * scale, 5 * scale, palette.propFill, palette.propStroke, 0.88, 0.94, -0.18),
    createRect(id + "-arm-right", "foreground", x + 10 * scale, y - 22 * scale, 12 * scale, 22 * scale, 5 * scale, palette.propFill, palette.propStroke, 0.88, 0.94, 0.16)
  ];
}

function createFlowerPatch(id: string, x: number, y: number, scale: number, palette: ThemeDecorPalette, variant: number): MapDecorPrimitive[] {
  const radius = (variant % 2 === 0 ? 9 : 12) * scale;
  return [
    createLine(id + "-stem-a", "foreground", [
      { x: x - 4 * scale, y },
      { x: x - 2 * scale, y: y - 10 * scale }
    ], palette.propFill, null, 0.62, 0.94, 2 * scale),
    createLine(id + "-stem-b", "foreground", [
      { x: x + 5 * scale, y },
      { x: x + 2 * scale, y: y - 9 * scale }
    ], palette.propFill, null, 0.62, 0.94, 2 * scale),
    createEllipse(id + "-bloom", "foreground", x, y - 5 * scale, radius, 4 * scale, palette.propAccent, palette.propStroke, 0.86, 0.94, 0)
  ];
}

function createStoneStrata(id: string, x: number, y: number, scale: number, palette: ThemeDecorPalette): MapDecorPrimitive[] {
  return [
    createLine(id + "-main", "terrain", [
      { x: x - 18 * scale, y },
      { x: x - 4 * scale, y: y + 4 * scale },
      { x: x + 18 * scale, y: y + 1 * scale }
    ], palette.materialFill, palette.materialStroke, 0.78, 1, 3 * scale),
    createLine(id + "-echo", "terrain", [
      { x: x - 12 * scale, y: y + 7 * scale },
      { x: x + 10 * scale, y: y + 9 * scale }
    ], palette.materialStroke, null, 0.36, 1, 2 * scale)
  ];
}

function createGlowShard(id: string, x: number, y: number, scale: number, palette: ThemeDecorPalette): MapDecorPrimitive[] {
  return [
    createPolygon(id + "-body", "terrain", [
      { x, y: y - 16 * scale },
      { x: x + 6 * scale, y: y - 2 * scale },
      { x: x + 2 * scale, y: y + 4 * scale },
      { x: x - 5 * scale, y: y + 2 * scale }
    ], palette.materialFill, palette.materialStroke, 0.82, 1, 0.12),
    createLine(id + "-shine", "terrain", [
      { x: x + 1 * scale, y: y - 12 * scale },
      { x: x + 2 * scale, y: y - 2 * scale }
    ], palette.propAccent, null, 0.56, 1, 2 * scale)
  ];
}

function createGrassAccent(id: string, x: number, y: number, scale: number, palette: ThemeDecorPalette): MapDecorPrimitive[] {
  return [
    createLine(id + "-blades", "terrain", [
      { x: x - 9 * scale, y },
      { x: x - 3 * scale, y: y - 11 * scale },
      { x: x + 2 * scale, y },
      { x: x + 9 * scale, y: y - 8 * scale }
    ], palette.materialFill, palette.materialStroke, 0.72, 1, 2 * scale),
    createEllipse(id + "-bud", "terrain", x + 7 * scale, y - 8 * scale, 2.5 * scale, 1.8 * scale, palette.propAccent, null, 0.52, 1, 0.12)
  ];
}

function createEllipse(
  id: string,
  layer: MapDecorEllipse["layer"],
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  fill: string,
  stroke: string | null,
  alpha: number,
  parallax: number,
  rotation: number
): MapDecorEllipse {
  return {
    id,
    layer,
    primitive: "ellipse",
    center: { x, y },
    radiusX,
    radiusY,
    fill,
    stroke,
    alpha,
    parallax,
    rotation
  };
}

function createRect(
  id: string,
  layer: MapDecorRect["layer"],
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke: string | null,
  alpha: number,
  parallax: number,
  rotation: number
): MapDecorRect {
  return {
    id,
    layer,
    primitive: "rect",
    origin: { x, y },
    width,
    height,
    radius,
    fill,
    stroke,
    alpha,
    parallax,
    rotation
  };
}

function createPolygon(
  id: string,
  layer: MapDecorPolygon["layer"],
  points: MapDecorPoint[],
  fill: string,
  stroke: string | null,
  alpha: number,
  parallax: number,
  rotation: number
): MapDecorPolygon {
  return {
    id,
    layer,
    primitive: "polygon",
    points,
    fill,
    stroke,
    alpha,
    parallax,
    rotation
  };
}

function createLine(
  id: string,
  layer: MapDecorLine["layer"],
  points: MapDecorPoint[],
  fill: string,
  stroke: string | null,
  alpha: number,
  parallax: number,
  width: number
): MapDecorLine {
  return {
    id,
    layer,
    primitive: "line",
    points,
    width,
    fill,
    stroke,
    alpha,
    parallax,
    rotation: 0
  };
}

function getGroundY(x: number, height: number, terrainHeights: number[] | undefined): number {
  if (terrainHeights === undefined || terrainHeights.length === 0) {
    return height * 0.68;
  }

  const index = clamp(Math.floor(x), 0, terrainHeights.length - 1);
  return terrainHeights[index];
}

function getMapDecorOffset(map: MapType, index: number): number {
  if (map === "canyon") {
    return Math.sin(index * 1.7) * 18;
  }

  if (map === "crater") {
    return Math.cos(index * 1.45) * 24;
  }

  if (map === "ridge") {
    return Math.sin(index * 2.2) * 28;
  }

  return Math.sin(index * 1.2) * 14;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
