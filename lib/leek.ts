export interface OHLC { open: number; high: number; low: number; close: number; }
export interface Blade { ctrlX: number; ctrlY: number; tipX: number; tipY: number; baseY: number; }
export interface LeekGeometry {
  up: boolean;
  cx: number;
  stalk: { x: number; width: number; yTop: number; yBottom: number };
  bulb: { cx: number; cy: number; rx: number; ry: number };
  leaves: Blade[];
  roots: Blade[];
}

/**
 * Flat-leek geometry for one OHLC bar. `priceToY` maps a price to a y pixel
 * (y grows downward). Bulb + stalk = body (open..close); leaves = upper wick
 * (body top..high); roots = lower wick (body bottom..low).
 */
export function leekGeometry(
  bar: OHLC,
  cx: number,
  width: number,
  priceToY: (p: number) => number,
): LeekGeometry {
  const up = bar.close >= bar.open;
  const half = width / 2;
  const yHigh = priceToY(bar.high);
  const yLow = priceToY(bar.low);
  const yTop = priceToY(Math.max(bar.open, bar.close));
  const yBot = priceToY(Math.min(bar.open, bar.close));

  const blades = (baseY: number, tipY: number): Blade[] =>
    [-1, 0, 1].map((k) => ({
      baseY,
      ctrlX: cx + k * half * 0.5,
      ctrlY: (baseY + tipY) / 2,
      tipX: cx + k * half * 1.15,
      tipY,
    }));

  return {
    up,
    cx,
    stalk: { x: cx - half * 0.6, width: width * 0.6, yTop, yBottom: yBot },
    bulb: { cx, cy: yBot, rx: half * 0.8, ry: half * 0.62 },
    leaves: blades(yTop, yHigh),
    roots: blades(yBot, yLow),
  };
}
