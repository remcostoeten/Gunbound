import { randomInt } from "@/features/game/engine/random";
import type { WeatherState, Vec2 } from "@/features/game/types/shared";

export type WeatherRoll = {
  weather: WeatherState;
  state: number;
};

export type WeatherFlightState = {
  position: Vec2;
  previousPosition: Vec2;
  velocity: Vec2;
  damage: number;
  blastRadius: number;
  forceBoosted: boolean;
  tornadoTriggered: boolean;
};

export function createDefaultWeather(): WeatherState {
  return { kind: "wind" };
}

export function rollWeather(state: number, width: number, height: number): WeatherRoll {
  const kindRoll = randomInt(state, 0, 99);
  if (kindRoll.value < 36) {
    return {
      weather: { kind: "wind" },
      state: kindRoll.state
    };
  }

  if (kindRoll.value < 58) {
    const beamRoll = randomInt(kindRoll.state, 160, width - 160);
    return {
      weather: {
        kind: "force",
        beamX: beamRoll.value,
        powerScale: 1.22
      },
      state: beamRoll.state
    };
  }

  if (kindRoll.value < 76) {
    const xRoll = randomInt(kindRoll.state, 220, width - 220);
    const yRoll = randomInt(xRoll.state, 120, Math.max(160, Math.floor(height * 0.46)));
    const swirlRoll = randomInt(yRoll.state, 0, 1);
    return {
      weather: {
        kind: "tornado",
        vortex: { x: xRoll.value, y: yRoll.value },
        radius: 56,
        swirl: swirlRoll.value === 0 ? -1 : 1
      },
      state: swirlRoll.state
    };
  }

  if (kindRoll.value < 89) {
    return {
      weather: { kind: "moon", heal: 8 },
      state: kindRoll.state
    };
  }

  return {
    weather: { kind: "eclipse" },
    state: kindRoll.state
  };
}

export function getWeatherLabel(weather: WeatherState): string {
  if (weather.kind === "force") return "Force";
  if (weather.kind === "tornado") return "Tornado";
  if (weather.kind === "moon") return "Moon";
  if (weather.kind === "eclipse") return "Eclipse";
  return "Wind";
}

export function getWeatherGlyph(weather: WeatherState): string {
  if (weather.kind === "force") return "FX";
  if (weather.kind === "tornado") return "TW";
  if (weather.kind === "moon") return "MN";
  if (weather.kind === "eclipse") return "EC";
  return "WD";
}

export function getWeatherDetail(weather: WeatherState): string {
  if (weather.kind === "force") return "Beam buffs shots";
  if (weather.kind === "tornado") return "Swirls flight paths";
  if (weather.kind === "moon") return "+" + String(weather.heal) + " HP at turn start";
  if (weather.kind === "eclipse") return "Items locked this turn";
  return "Pure wind play";
}

export function isWeatherItemLocked(weather: WeatherState): boolean {
  return weather.kind === "eclipse";
}

export function applyWeatherToFlightState(state: WeatherFlightState, weather: WeatherState): WeatherFlightState {
  let nextState: WeatherFlightState = {
    position: { x: state.position.x, y: state.position.y },
    previousPosition: state.previousPosition,
    velocity: { x: state.velocity.x, y: state.velocity.y },
    damage: state.damage,
    blastRadius: state.blastRadius,
    forceBoosted: state.forceBoosted,
    tornadoTriggered: state.tornadoTriggered
  };

  if (weather.kind === "force" && !state.forceBoosted && segmentCrossesVerticalLine(state.previousPosition, state.position, weather.beamX)) {
    nextState = {
      ...nextState,
      damage: nextState.damage * weather.powerScale,
      blastRadius: nextState.blastRadius * 1.08,
      forceBoosted: true
    };
  }

  if (
    weather.kind === "tornado" &&
    !state.tornadoTriggered &&
    segmentDistanceToPoint(state.previousPosition, state.position, weather.vortex) <= weather.radius
  ) {
    const rotatedPosition = rotateAroundPoint(nextState.position, weather.vortex, weather.swirl * 1.18);
    const rotatedVelocity = rotateVector(nextState.velocity, weather.swirl * 0.58);
    nextState = {
      ...nextState,
      position: rotatedPosition,
      velocity: {
        x: rotatedVelocity.x + weather.swirl * 78,
        y: rotatedVelocity.y - 82
      },
      tornadoTriggered: true
    };
  }

  return nextState;
}

function segmentCrossesVerticalLine(start: Vec2, end: Vec2, lineX: number): boolean {
  return (start.x <= lineX && end.x >= lineX) || (start.x >= lineX && end.x <= lineX);
}

function segmentDistanceToPoint(start: Vec2, end: Vec2, point: Vec2): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const projectionX = start.x + dx * t;
  const projectionY = start.y + dy * t;
  return Math.hypot(point.x - projectionX, point.y - projectionY);
}

function rotateVector(vector: Vec2, radians: number): Vec2 {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine
  };
}

function rotateAroundPoint(point: Vec2, center: Vec2, radians: number): Vec2 {
  const translated = {
    x: point.x - center.x,
    y: point.y - center.y
  };
  const rotated = rotateVector(translated, radians);
  return {
    x: center.x + rotated.x,
    y: center.y + rotated.y
  };
}
