import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeoResponse = { country: string | null };

export function GET(request: NextRequest): NextResponse<GeoResponse> {
  const country = readCountry(request);
  return NextResponse.json(
    { country },
    { headers: { "cache-control": "private, no-store" } }
  );
}

function readCountry(request: NextRequest): string | null {
  const headerCountry = request.headers.get("x-vercel-ip-country");
  if (isValidIsoCountry(headerCountry)) return headerCountry.toUpperCase();

  const cfCountry = request.headers.get("cf-ipcountry");
  if (isValidIsoCountry(cfCountry)) return cfCountry.toUpperCase();

  return null;
}

function isValidIsoCountry(value: string | null): value is string {
  return value !== null && /^[A-Za-z]{2}$/.test(value);
}
