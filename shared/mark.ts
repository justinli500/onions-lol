// The deterministic synthetic mark. `markAtUsd(anchor, t)` is a PURE function of
// (anchor, timestamp): a mean-reverting (Ornstein-Uhlenbeck) random walk around
// the daily USDA anchor, seeded by the UTC date. Because it's pure and the
// anchor is read from a single on-chain source, the keeper (which pushes the
// mark on-chain) and the browser chart compute byte-identical values for any t —
// no shared runtime state, and a keeper restart can't cause a price step.
import { mulberry32 } from "./prng";
import { PRICE_SCALE, TICK_MS, VOL, KAPPA, BAND, CANDLE_INTERVAL_MS } from "./constants";

export interface Candle {
  time: number; // unix SECONDS (lightweight-charts UTCTimestamp)
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Start-of-UTC-day in ms for a given timestamp. */
export function dayStartMs(tMs: number): number {
  const d = new Date(tMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Deterministic per-day seed (yyyymmdd) so each UTC day has its own path. */
export function dailySeed(dayStart: number): number {
  const d = new Date(dayStart);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/** Mean-reverting mark in USD for a given anchor and timestamp. Pure. */
export function markAtUsd(anchorUsd: number, tMs: number): number {
  const dayStart = dayStartMs(tMs);
  const steps = Math.max(0, Math.floor((tMs - dayStart) / TICK_MS));
  const rng = mulberry32(dailySeed(dayStart));
  const lo = anchorUsd * (1 - BAND);
  const hi = anchorUsd * (1 + BAND);
  let p = anchorUsd;
  for (let i = 0; i < steps; i++) {
    const shock = (rng() * 2 - 1) * VOL * anchorUsd;
    p = p + KAPPA * (anchorUsd - p) + shock;
    if (p < lo) p = lo;
    if (p > hi) p = hi;
  }
  return p;
}

/** 1e8-scaled integer mark for the on-chain oracle (`setMark`). */
export function markAtE8(anchorE8: number, tMs: number): number {
  const anchorUsd = anchorE8 / PRICE_SCALE;
  return Math.round(markAtUsd(anchorUsd, tMs) * PRICE_SCALE);
}

/**
 * Build OHLC candles over [fromMs, toMs) by sampling the mark at sub-intervals.
 * Deterministic, so the history API response is fully cacheable.
 */
export function buildCandles(
  anchorUsd: number,
  fromMs: number,
  toMs: number,
  intervalMs: number = CANDLE_INTERVAL_MS,
): Candle[] {
  const candles: Candle[] = [];
  const subSteps = Math.max(2, Math.floor(intervalMs / TICK_MS));
  for (let t = fromMs; t < toMs; t += intervalMs) {
    let open = 0;
    let high = -Infinity;
    let low = Infinity;
    let close = 0;
    for (let i = 0; i < subSteps; i++) {
      const tt = t + Math.floor((i * intervalMs) / subSteps);
      const v = markAtUsd(anchorUsd, tt);
      if (i === 0) open = v;
      if (v > high) high = v;
      if (v < low) low = v;
      close = v;
    }
    candles.push({ time: Math.floor(t / 1000), open, high, low, close });
  }
  return candles;
}
