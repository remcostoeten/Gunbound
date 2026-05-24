import type { Vec2 } from "@/features/game/types/shared";
import { randomRange } from "@/features/game/engine/random";

export type WindRoll = {
  wind: Vec2;
  state: number;
};

export function rollWind(state: number): WindRoll {
  const xRoll = randomRange(state, -0.75, 0.75);
  const yRoll = randomRange(xRoll.state, -0.06, 0.06);

  return {
    wind: {
      x: Number(xRoll.value.toFixed(3)),
      y: Number(yRoll.value.toFixed(3))
    },
    state: yRoll.state
  };
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
