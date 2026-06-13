import { describe, it, expect } from "vitest";
import { leekGeometry } from "./leek";

const bar = { open: 10, high: 14, low: 8, close: 12 }; // up bar
const y = (p: number) => 100 - p; // higher price = smaller y

describe("leekGeometry", () => {
  const g = leekGeometry(bar, 50, 20, y);
  it("is bullish when close >= open", () => {
    expect(g.up).toBe(true);
  });
  it("stalk spans the body (open..close)", () => {
    expect(g.stalk.yTop).toBeCloseTo(y(12));
    expect(g.stalk.yBottom).toBeCloseTo(y(10));
  });
  it("leaves reach the high, roots reach the low", () => {
    expect(g.leaves.every((l) => Math.abs(l.tipY - y(14)) < 0.001)).toBe(true);
    expect(g.roots.every((r) => Math.abs(r.tipY - y(8)) < 0.001)).toBe(true);
    expect(g.leaves).toHaveLength(3);
    expect(g.roots).toHaveLength(3);
  });
  it("bulb sits at the body bottom, centered on x", () => {
    expect(g.bulb.cx).toBe(50);
    expect(g.bulb.cy).toBeCloseTo(y(10));
  });
});
