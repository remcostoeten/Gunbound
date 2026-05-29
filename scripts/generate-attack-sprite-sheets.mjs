import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = "public/explodes/generated";
const frameSize = 128;
const frames = 16;

mkdirSync(outDir, { recursive: true });

const sheets = {
  "dragon-fire.svg": { motif: "fire", core: "#ffe08a", ring: "#ff412f", spark: "#ff8a35", smoke: "#69202a" },
  "snow-frost.svg": { motif: "frost", core: "#ffffff", ring: "#bdf4ff", spark: "#75dcff", smoke: "#5d9fbd" },
  "mage-rune.svg": { motif: "rune", core: "#f7eaff", ring: "#9b77ff", spark: "#58e3ff", smoke: "#3e327f" },
  "turtle-shell.svg": { motif: "shell", core: "#cafad7", ring: "#54d184", spark: "#a4f0bd", smoke: "#184936" },
  "frog-bubble.svg": { motif: "bubble", core: "#eaffb3", ring: "#7df36e", spark: "#4ee8c2", smoke: "#245f32" },
  "sate-sonar.svg": { motif: "sonar", core: "#effbff", ring: "#55c7ff", spark: "#68d0ff", smoke: "#1f4a7a" },
  "knight-blade.svg": { motif: "blade", core: "#ffffff", ring: "#9bdcff", spark: "#d8f3ff", smoke: "#356a9a" },
  "trico-horn.svg": { motif: "horn", core: "#fff0a0", ring: "#ffd84f", spark: "#d77fff", smoke: "#5a3677" }
};

for (const [file, spec] of Object.entries(sheets)) {
  writeFileSync(join(outDir, file), renderSheet(spec));
}

function renderSheet(spec) {
  const width = frameSize * frames;
  const height = frameSize;
  const body = [];

  for (let frame = 0; frame < frames; frame += 1) {
    const p = frame / (frames - 1);
    const x = frame * frameSize + frameSize / 2;
    const y = frameSize / 2;
    body.push(renderFrame(spec, x, y, p, frame));
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="none"/>`,
    body.join("\n"),
    "</svg>"
  ].join("\n");
}

function renderFrame(spec, x, y, p, frame) {
  const fade = p < 0.68 ? 1 : Math.max(0, 1 - (p - 0.68) / 0.32);
  const radius = 15 + p * 48;
  const coreRadius = Math.max(1, 24 * (1 - p * 0.8));
  const nodes = [
    `<circle cx="${x}" cy="${y - p * 5}" r="${radius * 0.9}" fill="${spec.smoke}" opacity="${0.14 * fade}"/>`,
    `<circle cx="${x}" cy="${y}" r="${radius * 0.58}" fill="${spec.ring}" opacity="${0.18 * fade}"/>`,
    `<circle cx="${x}" cy="${y}" r="${coreRadius}" fill="${spec.core}" opacity="${0.82 * Math.max(0, 1 - p)}"/>`
  ];

  if (spec.motif === "fire") nodes.push(spokes(x, y, frame, 7, 10 + p * 10, radius, spec.spark, 0.72 * fade));
  if (spec.motif === "frost") nodes.push(spokes(x, y, frame, 8, 8 + p * 9, radius * 1.05, spec.core, 0.78 * fade));
  if (spec.motif === "horn") nodes.push(spokes(x, y, frame, 11, 12 + p * 10, radius * 1.05, spec.ring, 0.7 * fade));
  if (spec.motif === "shell") nodes.push(particles(x, y, frame, 12, radius, spec.spark, 0.74 * fade, "chunk"));
  if (spec.motif === "bubble") nodes.push(particles(x, y, frame, 9, radius, spec.spark, 0.68 * fade, "bubble"));
  if (spec.motif === "sonar") nodes.push(sonar(x, y, p, radius, spec.ring, spec.spark, fade));
  if (spec.motif === "rune") nodes.push(rune(x, y, p, radius, spec.ring, spec.spark, fade));
  if (spec.motif === "blade") nodes.push(blades(x, y, p, radius, spec.core, spec.spark, fade));

  return `<g>${nodes.join("")}</g>`;
}

function spokes(x, y, frame, count, inner, outer, color, opacity) {
  const items = [];
  for (let index = 0; index < count; index += 1) {
    const a = (index / count) * Math.PI * 2 + frame * 0.13;
    const x1 = x + Math.cos(a) * inner;
    const y1 = y + Math.sin(a) * inner;
    const x2 = x + Math.cos(a + 0.12) * outer;
    const y2 = y + Math.sin(a + 0.12) * outer;
    const x3 = x + Math.cos(a - 0.12) * outer * 0.72;
    const y3 = y + Math.sin(a - 0.12) * outer * 0.72;
    items.push(`<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} Z" fill="${color}" opacity="${opacity}"/>`);
  }
  return items.join("");
}

function particles(x, y, frame, count, radius, color, opacity, shape) {
  const items = [];
  for (let index = 0; index < count; index += 1) {
    const n = noise(frame, index);
    const a = n * Math.PI * 2;
    const d = radius * (0.2 + noise(frame + 3, index) * 0.9);
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d - radius * 0.15;
    const r = 2.5 + noise(frame + 9, index) * 5;
    if (shape === "bubble") {
      items.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="2" opacity="${opacity}"/>`);
    } else {
      items.push(`<rect x="${(px - r / 2).toFixed(1)}" y="${(py - r / 2).toFixed(1)}" width="${r.toFixed(1)}" height="${r.toFixed(1)}" rx="1" fill="${color}" opacity="${opacity}"/>`);
    }
  }
  return items.join("");
}

function sonar(x, y, p, radius, ring, spark, fade) {
  return [0, 1, 2].map((index) => {
    const r = radius * (0.35 + index * 0.28 + p * 0.5);
    return `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="none" stroke="${index === 1 ? spark : ring}" stroke-width="${Math.max(1, 5 - index - p * 3).toFixed(1)}" opacity="${(fade * (0.58 - index * 0.1)).toFixed(2)}"/>`;
  }).join("");
}

function rune(x, y, p, radius, ring, spark, fade) {
  const r = radius * 0.72;
  return [
    `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="none" stroke="${ring}" stroke-width="${Math.max(1, 3 - p).toFixed(1)}" opacity="${0.74 * fade}"/>`,
    spokes(x, y, Math.round(p * 12), 6, r * 0.55, r, spark, 0.62 * fade)
  ].join("");
}

function blades(x, y, p, radius, core, spark, fade) {
  return [0, 1, 2].map((index) => {
    const r = radius * (0.55 + index * 0.12);
    const a = p * 1.7 + index * 2.1;
    const x1 = x + Math.cos(a) * r;
    const y1 = y + Math.sin(a) * r;
    const x2 = x + Math.cos(a + 1.1) * r;
    const y2 = y + Math.sin(a + 1.1) * r;
    return `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${x.toFixed(1)} ${(y - r * 0.2).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${index % 2 === 0 ? core : spark}" stroke-width="${Math.max(1, 5 - p * 4).toFixed(1)}" opacity="${0.76 * fade}"/>`;
  }).join("");
}

function noise(seed, index) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
