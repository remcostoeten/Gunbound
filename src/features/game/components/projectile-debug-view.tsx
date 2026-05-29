"use client";

import { useEffect, useRef, useState } from "react";
import { drawProjectile } from "@/features/game/engine/draw-projectile";
import { getProjectileBehavior } from "@/features/game/engine/projectile-behaviors";
import { getProjectileBodyStyle, getProjectileTrailStyle } from "@/features/game/engine/projectile-presentation";
import type { ProjectileState } from "@/features/game/types/combat";
import type { MobileType, WeaponType } from "@/features/game/types/shared";

const mobiles: MobileType[] = ["armor", "knight", "dragon", "snow", "trico", "aduko", "mage", "nak", "turtle", "frog", "sate"];

const canvasWidth = 920;
const laneHeight = 62;
const headerHeight = 16;
const labelWidth = 168;
const flightLeft = labelWidth + 20;
const flightWidth = canvasWidth - flightLeft - 36;
const arcHeight = 20;

function makeProjectile(type: MobileType, weapon: WeaponType, x: number, y: number, vx: number, vy: number, life: number): ProjectileState {
  return {
    active: true,
    position: { x, y },
    previousPosition: { x: x - vx * 0.016, y: y - vy * 0.016 },
    velocity: { x: vx, y: vy },
    radius: weapon === "secondary" ? 6 : 5,
    owner: 1,
    mobileType: type,
    weapon,
    damage: 30,
    blastRadius: 40,
    bouncesLeft: 0,
    tunnelingTicks: 0,
    power: 0.85,
    life,
    windScale: 1,
    gravityScale: 1,
    item: null,
    forceBoosted: false,
    tornadoTriggered: false,
    technique: null,
    launchDirection: 1,
    rearArc: false,
    behavior: getProjectileBehavior(type, weapon),
    fuse: null,
    hasSplit: false
  };
}

export function ProjectileDebugView(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [weapon, setWeapon] = useState<WeaponType>("primary");
  const [paused, setPaused] = useState(false);
  const weaponRef = useRef<WeaponType>(weapon);
  const pausedRef = useRef<boolean>(paused);
  weaponRef.current = weapon;
  pausedRef.current = paused;

  useEffect(function runDemo(): () => void {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return function noop() {};
    }
    const context = canvas.getContext("2d");
    if (context === null) {
      return function noop() {};
    }
    const ctx = context;
    const stage = canvas;

    let frameId = 0;
    const startedAt = performance.now();
    let frozenTime = 0;

    function pathPoint(p: number, laneCenterY: number): { x: number; y: number } {
      return {
        x: flightLeft + p * flightWidth,
        y: laneCenterY - Math.sin(p * Math.PI) * arcHeight
      };
    }

    function drawFrame(time: number): void {
      const t = pausedRef.current ? frozenTime : (time - startedAt) / 1000;
      if (!pausedRef.current) {
        frozenTime = t;
      }
      const activeWeapon = weaponRef.current;

      ctx.fillStyle = "#0c1622";
      ctx.fillRect(0, 0, stage.width, stage.height);

      mobiles.forEach(function drawLane(type, index): void {
        const laneTop = headerHeight + index * laneHeight;
        const laneCenterY = laneTop + laneHeight * 0.5;

        // lane separator + labels
        ctx.fillStyle = index % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)";
        ctx.fillRect(0, laneTop, stage.width, laneHeight);
        const shape = getProjectileBodyStyle(type, activeWeapon).shape;
        ctx.textAlign = "left";
        ctx.fillStyle = "#dce9ff";
        ctx.font = "13px ui-monospace, monospace";
        ctx.fillText(type, 16, laneCenterY - 2);
        ctx.fillStyle = "#6f8cad";
        ctx.font = "10px ui-monospace, monospace";
        ctx.fillText(shape, 16, laneCenterY + 13);

        const p = (t * 0.16 + index * 0.06) % 1;
        const here = pathPoint(p, laneCenterY);
        const ahead = pathPoint(Math.min(1, p + 0.004), laneCenterY);
        const dirX = ahead.x - here.x;
        const dirY = ahead.y - here.y;
        const dirLen = Math.hypot(dirX, dirY) || 1;
        const speed = 360;
        const vx = (dirX / dirLen) * speed;
        const vy = (dirY / dirLen) * speed;

        // faint motion trail behind the head
        const trailColor = getProjectileTrailStyle(type, activeWeapon).color;
        let k = 1;
        while (k <= 12) {
          const tp = p - k * 0.013;
          if (tp >= 0) {
            const tpoint = pathPoint(tp, laneCenterY);
            ctx.globalAlpha = Math.max(0, 0.4 - k * 0.03);
            ctx.fillStyle = trailColor;
            ctx.beginPath();
            ctx.arc(tpoint.x, tpoint.y, Math.max(1, 4 - k * 0.25), 0, Math.PI * 2);
            ctx.fill();
          }
          k += 1;
        }
        ctx.globalAlpha = 1;

        drawProjectile(ctx, makeProjectile(type, activeWeapon, here.x, here.y, vx, vy, t));
      });

      ctx.textAlign = "left";
      ctx.fillStyle = "#9fb6d4";
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillText("each cart's projectile, real drawProjectile() — flying with trail", 16, 12);

      frameId = window.requestAnimationFrame(drawFrame);
    }

    frameId = window.requestAnimationFrame(drawFrame);
    return function cleanup(): void {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <section style={{ padding: "20px 24px", background: "#08111c", borderTop: "1px solid #16263a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
        <h2 style={{ color: "#eaf2ff", font: "600 16px ui-sans-serif, system-ui", margin: 0 }}>Projectile Visuals</h2>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => setWeapon("primary")} style={tabStyle(weapon === "primary")}>Primary</button>
          <button type="button" onClick={() => setWeapon("secondary")} style={tabStyle(weapon === "secondary")}>Secondary</button>
        </div>
        <button type="button" onClick={() => setPaused((v) => !v)} style={tabStyle(false)}>{paused ? "Play" : "Pause"}</button>
      </div>
      <canvas
        ref={canvasRef}
        className="projectile-debug-canvas"
        width={canvasWidth}
        height={headerHeight + mobiles.length * laneHeight + 8}
        style={{ width: "100%", maxWidth: canvasWidth, borderRadius: 10, border: "1px solid #1d3047", display: "block" }}
      />
    </section>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 8,
    border: active ? "1px solid #4f86c6" : "1px solid #21364f",
    background: active ? "#1c3350" : "#10202f",
    color: active ? "#eaf4ff" : "#8aa3c2",
    font: "600 12px ui-monospace, monospace",
    cursor: "pointer"
  };
}
