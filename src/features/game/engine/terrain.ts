import { getMapPresentation } from "@/features/game/constants/map-presentation";
import { getTerrainPalette } from "@/features/game/engine/terrain-theme";
import { randomRange } from "@/features/game/engine/random";
import type { TerrainState } from "@/features/game/types/entities";
import type { MapType, TerrainTheme, Vec2 } from "@/features/game/types/shared";

export type TerrainRoll = {
  terrain: TerrainState;
  state: number;
};

export function createTerrain(seed: number, width: number, height: number, mapType: MapType): TerrainRoll {
  const generated = generateHeightMap(seed, width, height, mapType);
  const terrain: TerrainState = {
    width,
    height,
    seed,
    theme: getTerrainTheme(mapType),
    mapType,
    heights: generated.heights,
    mask: createMask(width, height, generated.heights),
    canvas: null
  };

  terrain.canvas = createTerrainCanvas(terrain);
  redrawTerrainCanvas(terrain);

  return {
    terrain,
    state: generated.state
  };
}

export function generateHeightMap(seed: number, width: number, height: number, mapType: MapType): { heights: number[]; state: number } {
  if (mapType === "canyon") {
    return generateCanyonHeightMap(seed, width, height);
  }

  if (mapType === "crater") {
    return generateCraterHeightMap(seed, width, height);
  }

  if (mapType === "ridge") {
    return generateRidgeHeightMap(seed, width, height);
  }

  return generateRollingHeightMap(seed, width, height);
}

function generateRollingHeightMap(seed: number, width: number, height: number): { heights: number[]; state: number } {
  const sampleCount = 257;
  const samples = new Array<number>(sampleCount);
  const baseHeight = height * 0.62;
  let randomState = seed;
  let leftRoll = randomRange(randomState, -height * 0.04, height * 0.04);
  let rightRoll = randomRange(leftRoll.state, -height * 0.04, height * 0.04);
  let segment = sampleCount - 1;
  let roughness = height * 0.22;
  let pass = 0;

  samples[0] = baseHeight + leftRoll.value;
  samples[sampleCount - 1] = baseHeight + rightRoll.value;
  randomState = rightRoll.state;

  while (segment > 1) {
    const half = segment / 2;
    let index = half;

    while (index < sampleCount - 1) {
      const left = samples[index - half];
      const right = samples[index + half];
      const displacementRoll = randomRange(randomState, -roughness, roughness);

      samples[index] = clamp(left * 0.5 + right * 0.5 + displacementRoll.value, height * 0.24, height * 0.82);
      randomState = displacementRoll.state;
      index += segment;
    }

    segment = half;
    roughness *= 0.54;
    pass += 1;

    if (pass > 16) {
      break;
    }
  }

  smoothSamples(samples, 3);

  return {
    heights: resampleHeights(samples, width, height),
    state: randomState
  };
}

function generateCanyonHeightMap(seed: number, width: number, height: number): { heights: number[]; state: number } {
  const heights = new Array<number>(width);
  let randomState = seed;
  const leftLip = width * 0.26;
  const rightLip = width * 0.74;
  let x = 0;

  while (x < width) {
    const position = x / Math.max(1, width - 1);
    const distanceFromCenter = Math.abs(position - 0.5) / 0.5;
    const basinStrength = Math.max(0, 1 - distanceFromCenter);
    const canyonFloor = height * 0.8 - basinStrength * height * 0.22;
    const rimLift = Math.max(0, 1 - Math.abs(x - leftLip) / (width * 0.13)) + Math.max(0, 1 - Math.abs(x - rightLip) / (width * 0.13));
    const wave = Math.sin(position * Math.PI * 3.5) * height * 0.02;
    const jitter = randomRange(randomState, -height * 0.018, height * 0.018);

    heights[x] = clamp(
      Math.round(canyonFloor - rimLift * height * 0.2 + wave + jitter.value),
      Math.round(height * 0.26),
      Math.round(height * 0.84)
    );
    randomState = jitter.state;
    x += 1;
  }

  smoothHeights(heights, 2);

  return {
    heights,
    state: randomState
  };
}

function generateCraterHeightMap(seed: number, width: number, height: number): { heights: number[]; state: number } {
  const heights = new Array<number>(width);
  let randomState = seed;
  const center = width * 0.5;
  const craterRadius = width * 0.25;
  let x = 0;

  while (x < width) {
    const distance = Math.abs(x - center);
    const normalized = distance / craterRadius;
    const bowlDepth = normalized < 1 ? (1 - normalized * normalized) * height * 0.18 : 0;
    const rimRise = normalized > 0.85 && normalized < 1.35 ? (1 - Math.abs(normalized - 1.1) / 0.25) * height * 0.12 : 0;
    const outerWave = Math.sin((x / width) * Math.PI * 5.5) * height * 0.018;
    const jitter = randomRange(randomState, -height * 0.014, height * 0.014);
    const baseHeight = height * 0.67;

    heights[x] = clamp(
      Math.round(baseHeight - bowlDepth - rimRise + outerWave + jitter.value),
      Math.round(height * 0.24),
      Math.round(height * 0.82)
    );
    randomState = jitter.state;
    x += 1;
  }

  smoothHeights(heights, 2);

  return {
    heights,
    state: randomState
  };
}

function generateRidgeHeightMap(seed: number, width: number, height: number): { heights: number[]; state: number } {
  const heights = new Array<number>(width);
  let randomState = seed;
  let x = 0;

  while (x < width) {
    const position = x / Math.max(1, width - 1);
    const primary = Math.sin(position * Math.PI * 2.2) * height * 0.1;
    const secondary = Math.sin(position * Math.PI * 7.4 + 0.8) * height * 0.055;
    const saw = ((x % 84) / 84) * height * 0.03;
    const jitter = randomRange(randomState, -height * 0.016, height * 0.016);

    heights[x] = clamp(
      Math.round(height * 0.56 + primary + secondary - saw + jitter.value),
      Math.round(height * 0.22),
      Math.round(height * 0.8)
    );
    randomState = jitter.state;
    x += 1;
  }

  smoothHeights(heights, 1);

  return {
    heights,
    state: randomState
  };
}

export function smoothSamples(samples: number[], passes: number): void {
  let pass = 0;

  while (pass < passes) {
    const next = samples.slice();
    let index = 1;

    while (index < samples.length - 1) {
      next[index] = samples[index - 1] * 0.25 + samples[index] * 0.5 + samples[index + 1] * 0.25;
      index += 1;
    }

    index = 1;
    while (index < samples.length - 1) {
      samples[index] = next[index];
      index += 1;
    }

    pass += 1;
  }
}

export function resampleHeights(samples: number[], width: number, height: number): number[] {
  const heights = new Array<number>(width);
  let x = 0;

  while (x < width) {
    const position = x / (width - 1);
    const sampleIndex = position * (samples.length - 1);
    const leftIndex = Math.floor(sampleIndex);
    const rightIndex = Math.min(samples.length - 1, leftIndex + 1);
    const blend = sampleIndex - leftIndex;
    const left = samples[leftIndex];
    const right = samples[rightIndex];
    const value = left * (1 - blend) + right * blend;

    heights[x] = clamp(Math.round(value), Math.round(height * 0.24), Math.round(height * 0.82));
    x += 1;
  }

  return heights;
}

export function createMask(width: number, height: number, heights: number[]): Uint8Array {
  const mask = new Uint8Array(width * height);
  let x = 0;

  while (x < width) {
    const surface = clamp(Math.floor(heights[x]), 0, height - 1);
    let y = surface;

    while (y < height) {
      mask[y * width + x] = 1;
      y += 1;
    }

    x += 1;
  }

  return mask;
}

export function createTerrainCanvas(terrain: TerrainState): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = terrain.width;
  canvas.height = terrain.height;
  return canvas;
}

export function redrawTerrainCanvas(terrain: TerrainState): void {
  if (terrain.canvas === null) {
    return;
  }

  const context = terrain.canvas.getContext("2d");
  if (context === null) {
    return;
  }

  const imageData = context.createImageData(terrain.width, terrain.height);
  let y = 0;

  while (y < terrain.height) {
    let x = 0;

    while (x < terrain.width) {
      const index = y * terrain.width + x;
      const pixel = index * 4;
      if (terrain.mask[index] === 1) {
        paintTerrainPixel(imageData.data, terrain, x, y, pixel);
      } else {
        imageData.data[pixel] = 0;
        imageData.data[pixel + 1] = 0;
        imageData.data[pixel + 2] = 0;
        imageData.data[pixel + 3] = 0;
      }
      x += 1;
    }

    y += 1;
  }

  context.putImageData(imageData, 0, 0);
}

function smoothHeights(heights: number[], passes: number): void {
  let pass = 0;

  while (pass < passes) {
    const next = heights.slice();
    let index = 1;

    while (index < heights.length - 1) {
      next[index] = Math.round(heights[index - 1] * 0.25 + heights[index] * 0.5 + heights[index + 1] * 0.25);
      index += 1;
    }

    index = 1;
    while (index < heights.length - 1) {
      heights[index] = next[index];
      index += 1;
    }

    pass += 1;
  }
}

export function getTerrainTheme(mapType: MapType): TerrainTheme {
  return getMapPresentation(mapType).theme;
}

export function paintTerrainPixel(data: Uint8ClampedArray, terrain: TerrainState, x: number, y: number, pixel: number): void {
  const palette = getTerrainPalette(terrain.theme);
  const aboveEmpty = y === 0 || terrain.mask[(y - 1) * terrain.width + x] === 0;
  const belowEmpty = y === terrain.height - 1 || terrain.mask[(y + 1) * terrain.width + x] === 0;
  const sideEdge = isTerrainEdge(terrain, x, y);
  const surface = terrain.heights[x];
  const topBand = Math.max(0, y - surface);
  const dirtBand = topBand / Math.max(1, terrain.height - surface);
  const speckle = (x * 13 + y * 7) % 29;

  if (aboveEmpty || topBand <= 4) {
    if (topBand <= 1) {
      setPixel(data, pixel, palette.grassTop[0], palette.grassTop[1], palette.grassTop[2], 255);
      return;
    }

    if (topBand <= 3) {
      setPixel(data, pixel, palette.grassMid[0], palette.grassMid[1], palette.grassMid[2], 255);
      return;
    }
  }

  if (belowEmpty && !aboveEmpty) {
    setPixel(data, pixel, palette.dirtDeep[0], palette.dirtDeep[1], palette.dirtDeep[2], 255);
    return;
  }

  if (sideEdge) {
    setPixel(data, pixel, palette.edge[0], palette.edge[1], palette.edge[2], 255);
    return;
  }

  if (speckle < 4) {
    setPixel(data, pixel, palette.dirtTop[0], palette.dirtTop[1], palette.dirtTop[2], 255);
    return;
  }

  if (dirtBand > 0.55) {
    setPixel(data, pixel, palette.dirtDeep[0], palette.dirtDeep[1], palette.dirtDeep[2], 255);
    return;
  }

  setPixel(data, pixel, palette.dirtMid[0], palette.dirtMid[1], palette.dirtMid[2], 255);
}

export function setPixel(data: Uint8ClampedArray, pixel: number, red: number, green: number, blue: number, alpha: number): void {
  data[pixel] = red;
  data[pixel + 1] = green;
  data[pixel + 2] = blue;
  data[pixel + 3] = alpha;
}

export function isTerrainEdge(terrain: TerrainState, x: number, y: number): boolean {
  if (x === 0 || x === terrain.width - 1) {
    return true;
  }

  if (terrain.mask[y * terrain.width + (x - 1)] === 0) {
    return true;
  }

  if (terrain.mask[y * terrain.width + (x + 1)] === 0) {
    return true;
  }

  return false;
}

export function isTerrainSolid(terrain: TerrainState, x: number, y: number): boolean {
  const clampedX = Math.floor(x);
  const clampedY = Math.floor(y);

  if (clampedX < 0 || clampedX >= terrain.width || clampedY < 0 || clampedY >= terrain.height) {
    return false;
  }

  return terrain.mask[clampedY * terrain.width + clampedX] === 1;
}

export function getSurfaceY(terrain: TerrainState, x: number): number {
  const clampedX = clamp(Math.round(x), 0, terrain.width - 1);
  return terrain.heights[clampedX];
}

export function carveCrater(terrain: TerrainState, center: Vec2, radius: number): TerrainState {
  const minX = clamp(Math.floor(center.x - radius - 2), 0, terrain.width - 1);
  const maxX = clamp(Math.ceil(center.x + radius + 2), 0, terrain.width - 1);
  const minY = clamp(Math.floor(center.y - radius - 2), 0, terrain.height - 1);
  const maxY = clamp(Math.ceil(center.y + radius + 2), 0, terrain.height - 1);
  let y = minY;

  while (y <= maxY) {
    let x = minX;

    while (x <= maxX) {
      const dx = x - center.x;
      const dy = y - center.y;
      if (dx * dx + dy * dy <= radius * radius) {
        terrain.mask[y * terrain.width + x] = 0;
      }
      x += 1;
    }

    y += 1;
  }

  let column = minX;
  while (column <= maxX) {
    terrain.heights[column] = findSurfaceForColumn(terrain, column);
    column += 1;
  }

  redrawTerrainCanvas(terrain);

  return {
    width: terrain.width,
    height: terrain.height,
    seed: terrain.seed,
    theme: terrain.theme,
    mapType: terrain.mapType,
    heights: terrain.heights,
    mask: terrain.mask,
    canvas: terrain.canvas
  };
}

export function findSurfaceForColumn(terrain: TerrainState, x: number): number {
  let y = 0;

  while (y < terrain.height) {
    if (terrain.mask[y * terrain.width + x] === 1) {
      return y;
    }
    y += 1;
  }

  return terrain.height - 1;
}

export function getTerrainNormal(terrain: TerrainState, point: Vec2): Vec2 {
  const left = getSurfaceY(terrain, point.x - 3);
  const right = getSurfaceY(terrain, point.x + 3);
  const normal = {
    x: left - right,
    y: 6
  };

  return normalize(normal);
}

export function normalize(vector: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) {
    return { x: 0, y: -1 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length
  };
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}
