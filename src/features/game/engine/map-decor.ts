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
    index += 1;
  }

  items.push(createWindmill(width * 0.18, height * 0.42, 0.95, palette, "meadow-windmill-left"));
  items.push(createTreeCluster(width * 0.78, height * 0.5, 1.1, palette, "meadow-tree-cluster"));

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
    items.push(createMesa("sunset-mesa-" + String(index), xRoll.value, yRoll.value, widthRoll.value, heightRoll.value, palette, index));
    index += 1;
  }

  items.push(createArch(width * 0.7, height * 0.5, 1.2, palette, "sunset-arch"));
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
    items.push(createCrystal("midnight-crystal-" + String(index), xRoll.value, yRoll.value, scaleRoll.value, palette, "background"));
    index += 1;
  }

  items.push(createCrashedSatellite(width * 0.28, height * 0.5, 1, palette, "midnight-satellite"));
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
      items.push(createCactus("sunset-cactus-" + String(index), spec.x, y, spec.scale, palette));
    } else if (theme === "midnight") {
      items.push(createCrystal("midnight-foreground-crystal-" + String(index), spec.x, y, spec.scale * 0.58, palette, "foreground"));
    } else {
      items.push(createFlowerPatch("meadow-flower-" + String(index), spec.x, y, spec.scale, palette, spec.variant));
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
      items.push(createStoneStrata("sunset-strata-" + String(index), spec.x, y + 7, spec.scale, palette));
    } else if (theme === "midnight") {
      items.push(createGlowShard("midnight-glow-shard-" + String(index), spec.x, y - 2, spec.scale, palette));
    } else {
      items.push(createGrassAccent("meadow-grass-accent-" + String(index), spec.x, y, spec.scale, palette));
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

function createWindmill(x: number, y: number, scale: number, palette: ThemeDecorPalette, id: string): MapDecorPrimitive {
  return createPolygon(id, "midground", [
    { x: x - 9 * scale, y },
    { x: x + 9 * scale, y },
    { x: x + 13 * scale, y: y + 78 * scale },
    { x: x - 13 * scale, y: y + 78 * scale }
  ], palette.landmarkShadow, palette.landmarkStroke, 0.72, 0.58, 0);
}

function createTreeCluster(x: number, y: number, scale: number, palette: ThemeDecorPalette, id: string): MapDecorPrimitive {
  return createEllipse(id, "midground", x, y, 58 * scale, 44 * scale, palette.landmarkFill, palette.landmarkStroke, 0.76, 0.52, -0.08);
}

function createMesa(id: string, x: number, y: number, width: number, height: number, palette: ThemeDecorPalette, variant: number): MapDecorPrimitive {
  const leftTop = x - width * (variant % 2 === 0 ? 0.42 : 0.34);
  const rightTop = x + width * (variant % 2 === 0 ? 0.34 : 0.43);
  return createPolygon(id, "background", [
    { x: leftTop, y },
    { x: rightTop, y: y + height * 0.04 },
    { x: x + width * 0.52, y: y + height },
    { x: x - width * 0.58, y: y + height * 0.96 }
  ], palette.landmarkFill, palette.landmarkStroke, 0.78, 0.4, 0);
}

function createArch(x: number, y: number, scale: number, palette: ThemeDecorPalette, id: string): MapDecorPrimitive {
  return createLine(id, "midground", [
    { x: x - 82 * scale, y: y + 64 * scale },
    { x: x - 56 * scale, y: y + 14 * scale },
    { x, y: y - 8 * scale },
    { x: x + 58 * scale, y: y + 18 * scale },
    { x: x + 86 * scale, y: y + 70 * scale }
  ], palette.landmarkFill, palette.landmarkStroke, 0.62, 0.54, 20 * scale);
}

function createCrashedSatellite(x: number, y: number, scale: number, palette: ThemeDecorPalette, id: string): MapDecorPrimitive {
  return createRect(id, "midground", x - 44 * scale, y - 10 * scale, 88 * scale, 28 * scale, 7 * scale, palette.landmarkShadow, palette.landmarkStroke, 0.74, 0.54, -0.22);
}

function createCrystal(id: string, x: number, y: number, scale: number, palette: ThemeDecorPalette, layer: "background" | "foreground"): MapDecorPrimitive {
  return createPolygon(id, layer, [
    { x, y: y - 62 * scale },
    { x: x + 22 * scale, y: y - 16 * scale },
    { x: x + 10 * scale, y: y + 8 * scale },
    { x: x - 14 * scale, y: y + 8 * scale },
    { x: x - 24 * scale, y: y - 18 * scale }
  ], palette.propAccent, palette.landmarkStroke, layer === "background" ? 0.42 : 0.72, layer === "background" ? 0.46 : 0.82, 0.08);
}

function createCactus(id: string, x: number, y: number, scale: number, palette: ThemeDecorPalette): MapDecorPrimitive {
  return createPolygon(id, "foreground", [
    { x: x - 7 * scale, y },
    { x: x - 8 * scale, y: y - 42 * scale },
    { x: x - 2 * scale, y: y - 56 * scale },
    { x: x + 7 * scale, y: y - 42 * scale },
    { x: x + 8 * scale, y }
  ], palette.propFill, palette.propStroke, 0.92, 0.94, 0);
}

function createFlowerPatch(id: string, x: number, y: number, scale: number, palette: ThemeDecorPalette, variant: number): MapDecorPrimitive {
  const radius = (variant % 2 === 0 ? 9 : 12) * scale;
  return createEllipse(id, "foreground", x, y - 5 * scale, radius, 4 * scale, palette.propAccent, palette.propStroke, 0.86, 0.94, 0);
}

function createStoneStrata(id: string, x: number, y: number, scale: number, palette: ThemeDecorPalette): MapDecorPrimitive {
  return createLine(id, "terrain", [
    { x: x - 18 * scale, y },
    { x: x - 4 * scale, y: y + 4 * scale },
    { x: x + 18 * scale, y: y + 1 * scale }
  ], palette.materialFill, palette.materialStroke, 0.78, 1, 3 * scale);
}

function createGlowShard(id: string, x: number, y: number, scale: number, palette: ThemeDecorPalette): MapDecorPrimitive {
  return createPolygon(id, "terrain", [
    { x, y: y - 16 * scale },
    { x: x + 6 * scale, y: y - 2 * scale },
    { x: x + 2 * scale, y: y + 4 * scale },
    { x: x - 5 * scale, y: y + 2 * scale }
  ], palette.materialFill, palette.materialStroke, 0.82, 1, 0.12);
}

function createGrassAccent(id: string, x: number, y: number, scale: number, palette: ThemeDecorPalette): MapDecorPrimitive {
  return createLine(id, "terrain", [
    { x: x - 9 * scale, y },
    { x: x - 3 * scale, y: y - 11 * scale },
    { x: x + 2 * scale, y },
    { x: x + 9 * scale, y: y - 8 * scale }
  ], palette.materialFill, palette.materialStroke, 0.72, 1, 2 * scale);
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
