import { createProjectileRenderStyle, type ProjectileShapeKind } from "@/features/game/engine/projectile-presentation";
import type { ProjectileState } from "@/features/game/types/combat";

// Renders a projectile's head: a soft glow halo behind a crisp, rotated
// silhouette, plus the core highlight and any per-shape detail. This is the
// single source of truth for how a shot looks, shared by the live game canvas
// and the debug preview. The in-flight technique badge is handled separately by
// the game canvas (it needs world bounds and game fonts).
export function drawProjectile(context: CanvasRenderingContext2D, projectile: ProjectileState): void {
  const style = createProjectileRenderStyle(projectile);
  const body = style.body;
  const radius = style.radius;

  context.save();
  context.translate(projectile.position.x, projectile.position.y);

  // Glow lives in a soft halo behind the body instead of blurring the body
  // itself, so the silhouette stays crisp and each mobile reads distinctly.
  const haloRadius = radius * 2.6;
  const halo = context.createRadialGradient(0, 0, radius * 0.4, 0, 0, haloRadius);
  halo.addColorStop(0, body.glow);
  halo.addColorStop(0.45, hexToRgba(body.glow, 0.35));
  halo.addColorStop(1, hexToRgba(body.glow, 0));
  context.globalAlpha = 0.6;
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, haloRadius, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  context.rotate(style.angle);
  context.shadowBlur = 0;
  context.fillStyle = body.fill;
  context.strokeStyle = body.stroke;
  context.lineWidth = Math.max(body.strokeWidth, radius * 0.16);

  drawProjectileBody(context, body.shape, radius, body.aspectRatio);
  context.fill();
  context.stroke();

  context.fillStyle = body.core;
  context.beginPath();
  context.ellipse(radius * 0.2, -radius * 0.18, radius * 0.4, radius * 0.26, 0, 0, Math.PI * 2);
  context.fill();

  drawProjectileDetail(context, body.shape, radius, body.core);
  context.restore();
}

// Converts a #rrggbb color to an rgba() string at the given alpha, for gradient
// stops that need to fade a solid color to transparent.
function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawProjectileBody(context: CanvasRenderingContext2D, shape: ProjectileShapeKind, radius: number, aspectRatio: number): void {
  context.beginPath();

  if (shape === "bolt") {
    context.moveTo(radius * 1.45, 0);
    context.lineTo(-radius * 0.2, -radius * 0.7);
    context.lineTo(-radius * 0.55, -radius * 0.08);
    context.lineTo(-radius * 1.35, -radius * 0.42);
    context.lineTo(-radius * 0.25, radius * 0.7);
    context.lineTo(radius * 0.05, radius * 0.06);
    context.closePath();
    return;
  }

  if (shape === "drill") {
    context.moveTo(radius * 1.55, 0);
    context.lineTo(-radius * 0.25, -radius * 0.72);
    context.lineTo(-radius * 1.25, 0);
    context.lineTo(-radius * 0.25, radius * 0.72);
    context.closePath();
    return;
  }

  if (shape === "droplet") {
    context.moveTo(radius * 1.15, 0);
    context.quadraticCurveTo(radius * 0.1, -radius * 1.05, -radius * 0.88, -radius * 0.34);
    context.quadraticCurveTo(-radius * 1.22, radius * 0.72, radius * 0.28, radius * 0.92);
    context.quadraticCurveTo(radius * 0.98, radius * 0.56, radius * 1.15, 0);
    context.closePath();
    return;
  }

  if (shape === "seed") {
    context.ellipse(0, 0, radius * aspectRatio, radius * 0.72, -0.18, 0, Math.PI * 2);
    return;
  }

  if (shape === "shell") {
    context.roundRect(-radius * aspectRatio * 0.75, -radius * 0.72, radius * aspectRatio * 1.5, radius * 1.44, radius * 0.45);
    return;
  }

  if (shape === "ember") {
    // A forward-pointing flame: sharp nose, swollen belly, wavy licking tail.
    context.moveTo(radius * 1.5, 0);
    context.quadraticCurveTo(radius * 0.4, -radius * 0.98, -radius * 0.5, -radius * 0.58);
    context.quadraticCurveTo(-radius * 1.12, -radius * 0.22, -radius * 0.82, 0);
    context.quadraticCurveTo(-radius * 1.12, radius * 0.22, -radius * 0.5, radius * 0.58);
    context.quadraticCurveTo(radius * 0.4, radius * 0.98, radius * 1.5, 0);
    context.closePath();
    return;
  }

  if (shape === "snowball") {
    // A six-point ice crystal rather than a smooth ball.
    drawStarPath(context, 6, radius * 1.18, radius * 0.6);
    return;
  }

  if (shape === "pulse") {
    // A sharp four-point energy spark with concave sides.
    drawStarPath(context, 4, radius * 1.42, radius * 0.4);
    return;
  }

  if (shape === "lance") {
    // A slender spear pointing along its travel direction.
    context.moveTo(radius * 1.75, 0);
    context.lineTo(0, -radius * 0.5);
    context.lineTo(-radius * 1.4, 0);
    context.lineTo(0, radius * 0.5);
    context.closePath();
    return;
  }

  if (shape === "disc") {
    // A flat six-sided shell plate.
    drawPolygonPath(context, 6, radius * 1.1);
    return;
  }

  if (shape === "ring") {
    // A small solid core; the sonar rings are layered on in the detail pass.
    context.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
    return;
  }

  if (shape === "orb") {
    // A clean arcane sphere; its identity comes from the orbiting ring overlay.
    context.ellipse(0, 0, radius * aspectRatio, radius, 0, 0, Math.PI * 2);
    return;
  }

  context.ellipse(0, 0, radius * aspectRatio, radius, 0, 0, Math.PI * 2);
}

// Crisp shape-specific flourishes layered over the body.
function drawProjectileDetail(context: CanvasRenderingContext2D, shape: ProjectileShapeKind, radius: number, core: string): void {
  if (shape === "orb") {
    context.shadowBlur = 0;
    context.strokeStyle = core;
    context.globalAlpha = 0.85;
    context.lineWidth = Math.max(1, radius * 0.16);
    context.beginPath();
    context.ellipse(0, 0, radius * 1.08, radius * 0.4, 0.6, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
    return;
  }

  if (shape === "snowball") {
    context.shadowBlur = 0;
    context.strokeStyle = core;
    context.globalAlpha = 0.8;
    context.lineWidth = Math.max(1, radius * 0.13);
    context.beginPath();
    let index = 0;
    while (index < 3) {
      const angle = index * (Math.PI / 3);
      context.moveTo(Math.cos(angle) * radius * 1.05, Math.sin(angle) * radius * 1.05);
      context.lineTo(-Math.cos(angle) * radius * 1.05, -Math.sin(angle) * radius * 1.05);
      index += 1;
    }
    context.stroke();
    context.globalAlpha = 1;
    return;
  }

  if (shape === "ring") {
    // Two concentric sonar rings expanding off the core.
    context.shadowBlur = 0;
    context.strokeStyle = core;
    context.lineWidth = Math.max(1, radius * 0.16);
    [0.95, 1.45].forEach((scale, i) => {
      context.globalAlpha = 0.85 - i * 0.3;
      context.beginPath();
      context.arc(0, 0, radius * scale, 0, Math.PI * 2);
      context.stroke();
    });
    context.globalAlpha = 1;
    return;
  }

  if (shape === "disc") {
    // A spine line across the shell plate.
    context.shadowBlur = 0;
    context.strokeStyle = core;
    context.globalAlpha = 0.7;
    context.lineWidth = Math.max(1, radius * 0.12);
    context.beginPath();
    context.moveTo(-radius * 0.85, 0);
    context.lineTo(radius * 0.85, 0);
    context.stroke();
    context.globalAlpha = 1;
    return;
  }
}

// Builds a regular n-gon path of the given radius, first vertex on +x.
function drawPolygonPath(context: CanvasRenderingContext2D, sides: number, radius: number): void {
  let index = 0;
  while (index < sides) {
    const angle = (index / sides) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
    index += 1;
  }
  context.closePath();
}

// Builds a 2*points-vertex star alternating between outerRadius and innerRadius,
// starting from the +x (travel) direction so it points where the shot is going.
function drawStarPath(context: CanvasRenderingContext2D, points: number, outerRadius: number, innerRadius: number): void {
  const step = Math.PI / points;
  let index = 0;
  while (index < points * 2) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = index * step;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
    index += 1;
  }
  context.closePath();
}
