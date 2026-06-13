import { PRICE_SCALE, USDC_SCALE } from "@shared/constants";

// price (1e8) <-> USD
export const fromE8 = (v: bigint | number): number => Number(v) / PRICE_SCALE;
export const toE8 = (usd: number): bigint => BigInt(Math.round(usd * PRICE_SCALE));

// USDC (1e6) <-> USD
export const fromUSDC = (v: bigint | number): number => Number(v) / USDC_SCALE;
export const toUSDC = (usd: number): bigint => BigInt(Math.round(usd * USDC_SCALE));

export const fmtUSD = (n: number): string =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const fmtPrice = (n: number): string => `$${n.toFixed(2)}`;

export const fmtSigned = (n: number): string => `${n >= 0 ? "+" : "-"}${fmtUSD(Math.abs(n))}`;
