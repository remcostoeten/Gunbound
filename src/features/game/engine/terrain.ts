import { randomRange } from "@/features/game/engine/random";
import type { TerrainState, Vec2 } from "@/features/game/types/game";

export type TerrainRoll = {
  terrain: TerrainState;
  state: number;
};

export function createTerrain(seed: number, width: number, height: number): TerrainRoll {
  const generated = generateHeightMap(seed, width, height);
  const terrain: TerrainState = {
    width,
    height,
    seed,
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

export function generateHeightMap(seed: number, width: number, height: number): { heights: number[]; state: number } {
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

export function paintTerrainPixel(data: Uint8ClampedArray, terrain: TerrainState, x: number, y: number, pixel: number): void {
  const aboveEmpty = y === 0 || terrain.mask[(y - 1) * terrain.width + x] === 0;
  const belowEmpty = y === terrain.height - 1 || terrain.mask[(y + 1) * terrain.width + x] === 0;
  const sideEdge = isTerrainEdge(terrain, x, y);
  const surface = terrain.heights[x];
  const topBand = Math.max(0, y - surface);
  const dirtBand = topBand / Math.max(1, terrain.height - surface);
  const speckle = (x * 13 + y * 7) % 29;

  if (aboveEmpty || topBand <= 4) {
    if (topBand <= 1) {
      setPixel(data, pixel, 160, 217, 92, 255);
      return;
    }

    if (topBand <= 3) {
      setPixel(data, pixel, 123, 183, 87, 255);
      return;
    }
  }

  if (belowEmpty && !aboveEmpty) {
    setPixel(data, pixel, 105, 64, 36, 255);
    return;
  }

  if (sideEdge) {
    setPixel(data, pixel, 119, 72, 42, 255);
    return;
  }

  if (speckle < 4) {
    setPixel(data, pixel, 148, 93, 52, 255);
    return;
  }

  if (dirtBand > 0.55) {
    setPixel(data, pixel, 109, 66, 38, 255);
    return;
  }

  setPixel(data, pixel, 135, 84, 48, 255);
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
