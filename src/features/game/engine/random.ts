export type RandomRoll = {
  value: number;
  state: number;
};

export function normalizeSeed(source: string | number): number {
  if (typeof source === "number") {
    return normalizeSeedNumber(source);
  }

  return hashTextSeed(source);
}

export function normalizeSeedNumber(value: number): number {
  const normalized = Math.abs(Math.floor(value)) >>> 0;
  if (normalized === 0) {
    return 1;
  }

  return normalized;
}

export function hashTextSeed(source: string): number {
  let hash = 2166136261;
  let index = 0;

  while (index < source.length) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
    index += 1;
  }

  return normalizeSeedNumber(hash);
}

export function nextRandomState(state: number): number {
  const next = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  if (next === 0) {
    return 1;
  }

  return next;
}

export function randomFloat(state: number): RandomRoll {
  const next = nextRandomState(state);
  return { value: next / 4294967295, state: next };
}

export function randomRange(state: number, min: number, max: number): RandomRoll {
  const roll = randomFloat(state);
  return {
    value: min + (max - min) * roll.value,
    state: roll.state
  };
}

export function randomInt(state: number, min: number, max: number): RandomRoll {
  const roll = randomFloat(state);
  const span = max - min + 1;
  return {
    value: min + Math.floor(roll.value * span),
    state: roll.state
  };
}
