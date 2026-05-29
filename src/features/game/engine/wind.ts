import type { Vec2 } from "@/features/game/types/shared";
import { randomRange } from "@/features/game/engine/random";

export type WindRoll = {
  wind: Vec2;
  state: number;
};

// Maximum horizontal wind magnitude. Tuned together with the wind force in
// physics.ts so that even a full headwind never makes a target unreachable:
// at this cap every mobile can still throw ~750px+ into the wind at full power.
export const maxWindMagnitude = 0.6;

export function rollWind(state: number): WindRoll {
  const xRoll = randomRange(state, -1, 1);
  const yRoll = randomRange(xRoll.state, -0.05, 0.05);

  return {
    wind: {
      x: Number(shapeWindMagnitude(xRoll.value).toFixed(3)),
      y: Number(yRoll.value.toFixed(3))
    },
    state: yRoll.state
  };
}

// Bias the roll towards gentle winds so most rounds are calm and strong gusts
// stay occasional, the way classic Gunbound feels. The sign is preserved and
// the curve only reshapes the magnitude within [-maxWindMagnitude, max].
function shapeWindMagnitude(uniform: number): number {
  const sign = uniform < 0 ? -1 : 1;
  return sign * Math.pow(Math.abs(uniform), 1.6) * maxWindMagnitude;
}

export function getWindLabel(wind: Vec2): string {
  const direction = getWindDirectionLabel(wind);
  const magnitude = Math.round(Math.hypot(wind.x, wind.y) * 100);
  return direction + " " + String(magnitude);
}

export function getWindDirectionLabel(wind: Vec2): string {
  const horizontal = wind.x > 0.08 ? "E" : wind.x < -0.08 ? "W" : "";
  const vertical = wind.y > 0.02 ? "D" : wind.y < -0.02 ? "U" : "";

  if (vertical === "" && horizontal === "") {
    return "Still";
  }

  return vertical + horizontal;
}

export type WindRelation = "calm" | "tailwind" | "headwind";

// Describes the wind from the firing player's point of view. A tailwind blows
// the same way the mobile faces (carrying the shot toward the enemy); a
// headwind blows back against it. This is the read players actually need.
export function getWindRelation(wind: Vec2, facing: 1 | -1): WindRelation {
  if (Math.abs(wind.x) < 0.08) {
    return "calm";
  }

  const windDirection = wind.x > 0 ? 1 : -1;
  return windDirection === facing ? "tailwind" : "headwind";
}

export function getWindRelationLabel(relation: WindRelation): string {
  if (relation === "tailwind") {
    return "Tailwind";
  }

  if (relation === "headwind") {
    return "Headwind";
  }

  return "Calm";
}
