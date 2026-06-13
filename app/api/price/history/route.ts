// Candle history for the chart. Deterministic (built from the shared mark fn +
// the daily anchor), so the response is cacheable and matches the keeper's
// on-chain marks exactly. Anchor will be read from the on-chain OnionOracle once
// deployed; until then it falls back to the documented default.
import { buildCandles } from "@shared/mark";
import { DEFAULT_ANCHOR_USD } from "@shared/constants";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const now = Date.now();
  const to = Number(searchParams.get("to") ?? now);
  const from = Number(searchParams.get("from") ?? to - 6 * 60 * 60 * 1000); // default 6h
  const interval = Number(searchParams.get("interval") ?? 60_000);
  const anchorUsd = Number(searchParams.get("anchor") ?? DEFAULT_ANCHOR_USD);

  const candles = buildCandles(anchorUsd, from, to, interval);
  return Response.json(
    { anchorUsd, interval, candles },
    { headers: { "Cache-Control": "public, max-age=5" } },
  );
}
