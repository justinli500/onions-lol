// USDA MARS API client → a single onion settlement anchor (USD / 50-lb sack).
// GOTCHA (verified in research): the API key is the HTTP Basic-auth USERNAME with
// an EMPTY password — not a header or query param.
const BASE = "https://marsapi.ams.usda.gov/services/v1.2/reports";
const ONION_REPORT = 2316; // NY Terminal Market — Onions & Potatoes (NX_FV030)
const FALLBACK_REPORT = 2926; // National Potato & Onion Report

type Row = Record<string, unknown>;

function authHeader(key: string): string {
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Collapse the report to one number: prefer yellow onions / 50-lb / US No.1,
 * midpoint of the "mostly" range, else midpoint of low/high. Field spellings
 * vary, so we probe a few. */
function pickOnionPrice(results: Row[]): number | null {
  const onions = results.filter((r) =>
    /onion/i.test(String(r.commodity ?? r.group ?? "")),
  );
  const score = (r: Row) => {
    let s = 0;
    if (/yellow/i.test(String(r.variety ?? ""))) s += 2;
    if (/50/.test(String(r.package ?? r.pkg ?? ""))) s += 2;
    if (/no\.?\s*1/i.test(String(r.grade ?? ""))) s += 1;
    return s;
  };
  for (const r of [...onions].sort((a, b) => score(b) - score(a))) {
    const ml = num(r.mostly_low_price ?? r.mostly_low);
    const mh = num(r.mostly_high_price ?? r.mostly_high);
    if (ml != null && mh != null) return (ml + mh) / 2;
    const lo = num(r.low_price);
    const hi = num(r.high_price);
    if (lo != null && hi != null) return (lo + hi) / 2;
    if (lo != null) return lo;
  }
  return null;
}

async function fetchReport(report: number, key: string): Promise<number | null> {
  const res = await fetch(`${BASE}/${report}/reportDetails?lastReports=1`, {
    headers: { Authorization: authHeader(key), Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: Row[] } | Row[];
  const results = Array.isArray(data) ? data : (data.results ?? []);
  return pickOnionPrice(results);
}

/** Latest real onion anchor, or null (carry-forward upstream). */
export async function fetchOnionAnchorUsd(key: string | undefined): Promise<number | null> {
  if (!key) return null;
  try {
    return (
      (await fetchReport(ONION_REPORT, key)) ??
      (await fetchReport(FALLBACK_REPORT, key))
    );
  } catch {
    return null;
  }
}

// `npm run anchor` — quick manual check of the live USDA parse.
if (import.meta.url === `file://${process.argv[1]}`) {
  const p = await fetchOnionAnchorUsd(process.env.USDA_MARS_API_KEY);
  console.log("onion anchor:", p == null ? "(none — set USDA_MARS_API_KEY)" : `$${p.toFixed(2)}`);
}
