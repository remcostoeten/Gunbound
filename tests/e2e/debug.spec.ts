import { expect, test } from "@playwright/test";

test.describe("sprite mount debug", () => {
  test("renders the debug canvas with mounted riders", async ({ page }, testInfo) => {
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });

    await page.goto("/debug");
    await expect(page.getByRole("heading", { name: "Mobiles And Riders" })).toBeVisible();

    const canvas = page.locator("canvas.mount-debug-canvas");
    await expect(canvas).toBeVisible();

    await expect
      .poll(async () => canvas.evaluate(readCanvasSample), {
        message: "debug canvas should paint a varied scene, not a blank surface",
        timeout: 10_000,
      })
      .toBeGreaterThan(24);

    await testInfo.attach("mount-debug-canvas", {
      body: await canvas.screenshot(),
      contentType: "image/png",
    });

    expect(runtimeErrors).toEqual([]);
  });

  test("captures desktop and mobile visual review frames", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    for (const viewport of [
      { name: "desktop", width: 1440, height: 1100 },
      { name: "mobile", width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/debug", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Mobiles And Riders" })).toBeVisible();
      const canvas = page.locator("canvas.mount-debug-canvas");
      await expect(canvas).toBeVisible();
      await expect
        .poll(async () => canvas.evaluate(readCanvasSample), {
          message: `${viewport.name} debug canvas should paint before visual capture`,
          timeout: 15_000,
        })
        .toBeGreaterThan(24);
      await page.waitForTimeout(5_000);

      await testInfo.attach(`debug-${viewport.name}-page`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });

      await testInfo.attach(`debug-${viewport.name}-canvas`, {
        body: await canvas.screenshot(),
        contentType: "image/png",
      });
    }
  });
});

function readCanvasSample(canvas: HTMLCanvasElement): number {
  const context = canvas.getContext("2d");
  if (!context) return 0;

  const { width, height } = canvas;
  const data = context.getImageData(0, 0, width, height).data;
  const colors = new Set<string>();
  const stride = 24;

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const index = (y * width + x) * 4;
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`);
    }
  }

  return colors.size;
}
