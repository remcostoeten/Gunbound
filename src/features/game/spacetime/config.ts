const DEFAULT_URI = 'wss://maincloud.spacetimedb.com';
const DEFAULT_MODULE = 'gunbound';

export const SPACETIME_URI: string =
  process.env.NEXT_PUBLIC_SPACETIMEDB_URI ?? DEFAULT_URI;

export const SPACETIME_MODULE: string =
  process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE ?? DEFAULT_MODULE;

export const SPACETIME_TOKEN_KEY = 'gunbound:spacetime-token';
