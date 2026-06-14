export type TimeframeId = "15m" | "1H" | "4H" | "1D" | "1W";

export interface ChartWindow {
  fromMs: number;
  toMs: number;
  intervalMs: number;
}

/** Each timeframe targets ~150 candles: total span / candle count. */
export const TIMEFRAMES: { id: TimeframeId; label: string; spanMs: number; intervalMs: number }[] = [
  { id: "15m", label: "15m", spanMs: 15 * 60_000, intervalMs: 6_000 },
  { id: "1H",  label: "1H",  spanMs: 60 * 60_000, intervalMs: 24_000 },
  { id: "4H",  label: "4H",  spanMs: 4 * 3600_000, intervalMs: 96_000 },
  { id: "1D",  label: "1D",  spanMs: 24 * 3600_000, intervalMs: 576_000 },
  { id: "1W",  label: "1W",  spanMs: 7 * 24 * 3600_000, intervalMs: 4_032_000 },
];

export function windowFor(id: TimeframeId, nowMs: number): ChartWindow {
  const tf = TIMEFRAMES.find((t) => t.id === id) ?? TIMEFRAMES[3];
  const toAligned = Math.ceil(nowMs / tf.intervalMs) * tf.intervalMs;
  return { fromMs: toAligned - tf.spanMs, toMs: toAligned, intervalMs: tf.intervalMs };
}
