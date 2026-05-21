import { expect, test } from "@playwright/test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

type AssetSample = {
  path: string;
  width: number;
  height: number;
  uniqueTiles: number;
  opaquePixels: number;
};

test.describe("public assets", () => {
  test("core sprites load and contain visible art", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    const assets = await collectAssetPaths();
    expect(assets.length).toBeGreaterThan(0);
    const baseUrl = page.url();

    const samples = await page.evaluate(async ({ paths, baseUrl }: { paths: string[]; baseUrl: string }) => {
      async function loadImage(path: string): Promise<HTMLImageElement> {
        return await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error(`Failed to load ${path}`));
          image.src = new URL(path, baseUrl).toString();
        });
      }

      function samplePixels(data: Uint8ClampedArray, width: number, height: number): { uniqueTiles: number; opaquePixels: number } {
        const unique = new Set<string>();
        let opaquePixels = 0;
        const stride = Math.max(1, Math.floor(Math.min(width, height) / 12));

        for (let y = 0; y < height; y += stride) {
          for (let x = 0; x < width; x += stride) {
            const index = (y * width + x) * 4;
            const red = data[index] ?? 0;
            const green = data[index + 1] ?? 0;
            const blue = data[index + 2] ?? 0;
            const alpha = data[index + 3] ?? 0;

            if (alpha > 0) opaquePixels += 1;
            unique.add(`${red >> 4}:${green >> 4}:${blue >> 4}:${alpha >> 4}`);
          }
        }

        return {
          uniqueTiles: unique.size,
          opaquePixels,
        };
      }

      const results: AssetSample[] = [];

      for (const path of paths) {
        const image = await loadImage(path);
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error(`No 2D context available for ${path}`);
        }

        context.drawImage(image, 0, 0);
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const sample = samplePixels(data, canvas.width, canvas.height);

        results.push({
          path,
          width: canvas.width,
          height: canvas.height,
          uniqueTiles: sample.uniqueTiles,
          opaquePixels: sample.opaquePixels,
        });
      }

      return results;
    }, { paths: assets, baseUrl });

    const failures = samples.filter((sample: AssetSample) => {
      const compact = sample.path.includes("mounted-sheet") || sample.path.includes("sheet");
      if (!compact) return false;
      return sample.width < 16 || sample.height < 16 || sample.uniqueTiles < 2 || sample.opaquePixels === 0;
    });

    expect(failures, formatFailures(failures)).toEqual([]);
  });
});

async function collectAssetPaths(): Promise<string[]> {
  const groups = [
    "public/mobiles",
    "public/charachters",
    "public/maps",
    "public/weapons",
  ];

  const paths: string[] = [];
  for (const group of groups) {
    await walkPublicAssets(join(process.cwd(), group), `/${group.slice("public/".length)}`, paths);
  }

  return paths.sort();
}

async function walkPublicAssets(root: string, urlBase: string, paths: string[]): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith("ChatGPT Image")) continue;
    if (entry.name.startsWith("Gemini_Generated_Image")) continue;
    const absolutePath = join(root, entry.name);
    const urlPath = `${urlBase}/${entry.name}`;
    if (entry.isDirectory()) {
      await walkPublicAssets(absolutePath, urlPath, paths);
      continue;
    }
    if (!/\.(png|svg)$/i.test(entry.name)) continue;
    paths.push(urlPath);
  }
}

function formatFailures(failures: AssetSample[]): string {
  return failures
    .map((sample) => `${sample.path} (${sample.width}x${sample.height}, tiles=${sample.uniqueTiles}, opaque=${sample.opaquePixels})`)
    .join("\n");
}
