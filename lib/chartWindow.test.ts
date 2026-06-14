import { describe, it, expect } from "vitest";
import { TIMEFRAMES, windowFor } from "./chartWindow";

describe("windowFor", () => {
  const now = 1_700_000_000_000;
  it("exposes the five timeframes in order", () => {
    expect(TIMEFRAMES.map((t) => t.id)).toEqual(["15m", "1H", "4H", "1D", "1W"]);
  });
  it("1D spans 24h ending at now, aligned to the interval", () => {
    const w = windowFor("1D", now);
    expect(w.toMs).toBeGreaterThanOrEqual(now);
    expect(w.toMs - w.fromMs).toBeCloseTo(24 * 3600_000, -3);
    expect(w.fromMs % w.intervalMs).toBe(0);
  });
  it("each timeframe yields 100-200 candles", () => {
    for (const t of TIMEFRAMES) {
      const w = windowFor(t.id, now);
      const n = (w.toMs - w.fromMs) / w.intervalMs;
      expect(n).toBeGreaterThanOrEqual(100);
      expect(n).toBeLessThanOrEqual(200);
    }
  });
});
