const DEFAULT_CLOUD_URI = 'wss://maincloud.spacetimedb.com';
const DEFAULT_LOCAL_URI = 'ws://127.0.0.1:3001';
const DEFAULT_MODULE = 'gunbound';

export const SPACETIME_URI: string = resolveSpacetimeUri();

export const SPACETIME_MODULE: string = resolveSpacetimeModule();

export const SPACETIME_TOKEN_KEY = 'gunbound:spacetime-token';

function resolveSpacetimeUri(): string {
  const explicitUri = process.env.NEXT_PUBLIC_SPACETIMEDB_URI;
  if (explicitUri) {
    return explicitUri;
  }

  const target = resolveSpacetimeTarget();
  const host =
    readTargetValue(target, 'URI') ??
    readTargetValue(target, 'HOST') ??
    process.env.NEXT_PUBLIC_SPACETIMEDB_HOST;
  if (host) {
    return normalizeSpacetimeUri(host);
  }

  return target === 'local' ? DEFAULT_LOCAL_URI : DEFAULT_CLOUD_URI;
}

function resolveSpacetimeModule(): string {
  const target = resolveSpacetimeTarget();

  return (
    process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE ??
    process.env.NEXT_PUBLIC_SPACETIMEDB_DB_NAME ??
    readTargetValue(target, 'MODULE') ??
    readTargetValue(target, 'DB_NAME') ??
    DEFAULT_MODULE
  );
}

function resolveSpacetimeTarget(): SpacetimeTarget {
  const value = process.env.NEXT_PUBLIC_SPACETIMEDB_TARGET;
  return value === 'local' ? 'local' : 'cloud';
}

function readTargetValue(target: SpacetimeTarget, suffix: SpacetimeTargetSuffix): string | undefined {
  const key = `NEXT_PUBLIC_SPACETIMEDB_${target.toUpperCase()}_${suffix}` as const;
  return process.env[key];
}

function normalizeSpacetimeUri(value: string): string {
  try {
    const url = new URL(value);

    if (url.protocol === 'http:') {
      url.protocol = 'ws:';
      return url.toString();
    }

    if (url.protocol === 'https:') {
      url.protocol = 'wss:';
      return url.toString();
    }

    return url.toString();
  } catch {
    return value;
  }
}

type SpacetimeTarget = 'local' | 'cloud';

type SpacetimeTargetSuffix = 'URI' | 'HOST' | 'MODULE' | 'DB_NAME';
