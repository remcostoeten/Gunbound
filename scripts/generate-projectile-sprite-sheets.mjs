// Generates per-mobile projectile sprite sheets as horizontal SVG strips.
//
// This is the "sprites later" half of the projectile-visuals plan: the live
// game currently draws projectiles as vector silhouettes in
// src/features/game/components/game-canvas.tsx (drawProjectileBody). This script
// emits matching animated art per mobile so the canvas can later switch to
// image-based rendering without redesigning each cart's look.
//
// Each sheet is `frames` frames wide; every frame spins the silhouette and
// pulses the glow. Run with: bun scripts/generate-projectile-sprite-sheets.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = "public/projectiles/generated";
const frameSize = 64;
const frames = 8;

mkdirSync(outDir, { recursive: true });

// shape + palette per mobile, mirroring projectileStyles in
// projectile-presentation.ts. Keep these in sync when tuning cart colors.
const projectiles = {
  armor: { shape: "shell", fill: "#e8a44c", core: "#fff2b8", glow: "#ffb33d", spin: 8 },
  knight: { shape: "lance", fill: "#d9f0ff", core: "#ffffff", glow: "#9bdcff", spin: 1.4 },
  dragon: { shape: "ember", fill: "#ff6241", core: "#ffe08a", glow: "#ff412f", spin: 0.8 },
  snow: { shape: "snowball", fill: "#dff8ff", core: "#ffffff", glow: "#bdf4ff", spin: 5.6 },
  trico: { shape: "seed", fill: "#f2cf65", core: "#fff0a0", glow: "#ffd84f", spin: 8 },
  aduko: { shape: "bolt", fill: "#ffe859", core: "#fffad1", glow: "#fff15a", spin: 3.5 },
  mage: { shape: "orb", fill: "#9b7cff", core: "#f7eaff", glow: "#9b77ff", spin: 5.6 },
  nak: { shape: "drill", fill: "#b98755", core: "#ffe0a6", glow: "#c98b45", spin: 18 },
  turtle: { shape: "disc", fill: "#4fb97b", core: "#cafad7", glow: "#54d184", spin: 8 },
  frog: { shape: "droplet", fill: "#67df63", core: "#eaffb3", glow: "#7df36e", spin: 5.6 },
  sate: { shape: "ring", fill: "#5bc7ff", core: "#effbff", glow: "#55c7ff", spin: 0 }
};

for (const [mobile, spec] of Object.entries(projectiles)) {
  writeFileSync(join(outDir, `${mobile}-projectile.svg`), renderSheet(spec));
}

console.log(`Wrote ${Object.keys(projectiles).length} projectile sheets to ${outDir}`);

function renderSheet(spec) {
  const width = frameSize * frames;
  const height = frameSize;
  const body = [];

  for (let frame = 0; frame < frames; frame += 1) {
    const t = frame / frames;
    const cx = frame * frameSize + frameSize / 2;
    const cy = frameSize / 2;
    const angleDeg = (t * spec.spin * 360) % 360;
    const radius = frameSize * 0.26;
    const glowPulse = 0.6 + 0.4 * Math.sin(t * Math.PI * 2);

    body.push(
      `<g transform="translate(${cx} ${cy}) rotate(${angleDeg.toFixed(1)})">`,
      `<circle r="${(radius * 1.6).toFixed(1)}" fill="${spec.glow}" opacity="${(0.22 * glowPulse).toFixed(2)}"/>`,
      `<path d="${shapePath(spec.shape, radius)}" fill="${spec.fill}" stroke="${spec.glow}" stroke-width="1.5"/>`,
      `<ellipse cx="${(radius * 0.18).toFixed(1)}" cy="${(-radius * 0.1).toFixed(1)}" rx="${(radius * 0.42).toFixed(1)}" ry="${(radius * 0.28).toFixed(1)}" fill="${spec.core}"/>`,
      `</g>`
    );
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    body.join("\n"),
    "</svg>"
  ].join("\n");
}

// SVG path mirrors of the canvas silhouettes in drawProjectileBody.
function shapePath(shape, r) {
  if (shape === "bolt") {
    return `M ${1.45 * r} 0 L ${-0.2 * r} ${-0.7 * r} L ${-0.55 * r} ${-0.08 * r} L ${-1.35 * r} ${-0.42 * r} L ${-0.25 * r} ${0.7 * r} L ${0.05 * r} ${0.06 * r} Z`;
  }
  if (shape === "drill") {
    return `M ${1.55 * r} 0 L ${-0.25 * r} ${-0.72 * r} L ${-1.25 * r} 0 L ${-0.25 * r} ${0.72 * r} Z`;
  }
  if (shape === "droplet") {
    return `M ${1.15 * r} 0 Q ${0.1 * r} ${-1.05 * r} ${-0.88 * r} ${-0.34 * r} Q ${-1.22 * r} ${0.72 * r} ${0.28 * r} ${0.92 * r} Q ${0.98 * r} ${0.56 * r} ${1.15 * r} 0 Z`;
  }
  if (shape === "ember") {
    return `M ${1.5 * r} 0 Q ${0.4 * r} ${-0.98 * r} ${-0.5 * r} ${-0.58 * r} Q ${-1.12 * r} ${-0.22 * r} ${-0.82 * r} 0 Q ${-1.12 * r} ${0.22 * r} ${-0.5 * r} ${0.58 * r} Q ${0.4 * r} ${0.98 * r} ${1.5 * r} 0 Z`;
  }
  if (shape === "shell") {
    const w = r * 1.5;
    const h = r * 1.44;
    return `M ${-w * 0.5} ${-h * 0.5} h ${w} v ${h} h ${-w} Z`;
  }
  if (shape === "snowball") {
    return starPath(6, r * 1.18, r * 0.6);
  }
  if (shape === "pulse") {
    return starPath(4, r * 1.42, r * 0.4);
  }
  if (shape === "lance") {
    return `M ${1.75 * r} 0 L 0 ${-0.5 * r} L ${-1.4 * r} 0 L 0 ${0.5 * r} Z`;
  }
  if (shape === "disc") {
    return polygonPath(6, r * 1.1);
  }
  if (shape === "ring") {
    return `M ${r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 a ${r} ${r} 0 1 0 ${2 * r} 0 Z`;
  }
  if (shape === "seed") {
    return `M ${r} 0 a ${r} ${r * 0.72} 0 1 0 ${-2 * r} 0 a ${r} ${r * 0.72} 0 1 0 ${2 * r} 0 Z`;
  }
  return `M ${r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 a ${r} ${r} 0 1 0 ${2 * r} 0 Z`;
}

function polygonPath(sides, radius) {
  const coords = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = (i / sides) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    coords.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${coords.join(" ")} Z`;
}

function starPath(points, outer, inner) {
  const step = Math.PI / points;
  const coords = [];
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const x = Math.cos(i * step) * radius;
    const y = Math.sin(i * step) * radius;
    coords.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${coords.join(" ")} Z`;
}
