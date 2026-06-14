import { mulberry32 } from "@shared/prng";

/**
 * Demo markets for the /markets list. onions.lol has one real on-chain market
 * (the yellow-onion index); these extra varieties are mock data for the demo
 * markets surface. Deterministic so the list + sparklines are stable per render.
 */
export interface Market {
  id: string;
  name: string;
  origin: string;
  price: number;
  changePct: number;
  openInterest: number; // USD
  longPct: number; // 0..1 share of open interest that is long
  seed: number;
}

// One real on-chain market for now (the yellow-onion index on Base Sepolia).
export const MARKETS: Market[] = [
  { id: "yellow", name: "Yellow Onion", origin: "NY Terminal", price: 20.18, changePct: 3.8, openInterest: 16225, longPct: 0.447, seed: 11 },
];

/** A deterministic mini price path for a market's sparkline, trending toward its day change. */
export function marketSeries(m: Market, points = 44): number[] {
  const rng = mulberry32(m.seed);
  const drift = m.changePct / 100 / points;
  const out: number[] = [];
  let v = m.price / (1 + m.changePct / 100); // start near the day's open
  for (let i = 0; i < points; i++) {
    v = v * (1 + drift + (rng() - 0.5) * 0.012);
    out.push(v);
  }
  out[out.length - 1] = m.price; // land on the current price
  return out;
}
