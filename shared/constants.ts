// Single source of truth for price math, imported by BOTH the Next.js app
// (chart + price API) and the oracle keeper, so every process computes the
// exact same synthetic mark. Keep this file dependency-free.

export const PRICE_SCALE = 1e8; // on-chain price scale (matches OnionOracle uint64 1e8)
export const USDC_SCALE = 1e6; // USDC has 6 decimals

export const TICK_MS = 12_000; // base tick == keeper on-chain push cadence (12s)
export const VOL = 0.0045; // per-tick shock as a fraction of the anchor
export const KAPPA = 0.025; // mean-reversion strength toward the daily anchor
export const BAND = 0.5; // clamp the mark to anchor ± 50%

export const CANDLE_INTERVAL_MS = 60_000; // 1-minute candles for the chart

// Fallback onion price ($ / 50-lb sack of yellow onions, US No.1, NY terminal)
// used only when no USDA anchor is available yet (weekend/keyless). The real
// anchor comes from the on-chain OnionOracle, fed by the USDA keeper.
export const DEFAULT_ANCHOR_USD = 20;
