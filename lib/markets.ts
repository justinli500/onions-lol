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

export const MARKETS: Market[] = [
  { id: "yellow", name: "Yellow Onion", origin: "NY Terminal", price: 20.18, changePct: 3.8, openInterest: 16225, longPct: 0.447, seed: 11 },
  { id: "red", name: "Red Onion", origin: "California", price: 24.62, changePct: -0.54, openInterest: 7188, longPct: 0.435, seed: 23 },
  { id: "sweet", name: "Sweet Vidalia", origin: "Georgia", price: 31.04, changePct: 2.38, openInterest: 5033, longPct: 0.568, seed: 31 },
  { id: "white", name: "White Onion", origin: "Texas", price: 17.93, changePct: -4.1, openInterest: 3757, longPct: 0.709, seed: 42 },
  { id: "scallion", name: "Scallion", origin: "New Jersey", price: 9.24, changePct: 0.36, openInterest: 2353, longPct: 0.492, seed: 57 },
  { id: "shallot", name: "Shallot", origin: "Washington", price: 42.71, changePct: -4.71, openInterest: 564, longPct: 0.457, seed: 68 },
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
