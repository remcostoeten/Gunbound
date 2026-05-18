import type { Vec2 } from "@/features/game/types/game";
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
  const horizontal = wind.x >= 0 ? "E" : "W";
  const magnitude = Math.round(Math.abs(wind.x) * 100);
  return horizontal + " " + String(magnitude);
}
