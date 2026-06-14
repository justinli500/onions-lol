"use client";

import { motion } from "motion/react";
import { fmtPrice, fmtUSD } from "@/lib/format";
import { cn } from "@/lib/cn";
import { SPRING_SNAPPY, tapScale } from "@/lib/animations";

export interface Expiry {
  label: string;
  s: number;
}

export interface OrderTicketProps {
  side: 0 | 1; // 0 = long, 1 = short
  onSide: (s: 0 | 1) => void;
  margin: number;
  onMargin: (n: number) => void;
  lev: number;
  onLev: (n: number) => void;
  expIdx: number;
  onExpIdx: (i: number) => void;
  expiries: Expiry[];
  collateral: number;
  price: number;
  busy: boolean;
  onSubmit: () => void;
}

const LEVERAGE_PILLS = [1, 2, 5, 10];

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-[5px]">
      <span className="text-xs text-ink/60">{k}</span>
      <span className="flex-1 border-b border-dashed border-line" />
      <span className="tabular text-xs text-ink">{v}</span>
    </div>
  );
}

/**
 * Presentational vintage "order ticket" — fully controlled. Shared by the real
 * contract-bound TradePanel and the demo panel, so design changes live in one place.
 */
export function OrderTicket({
  side, onSide, margin, onMargin, lev, onLev, expIdx, onExpIdx,
  expiries, collateral, price, busy, onSubmit,
}: OrderTicketProps) {
  const isLong = side === 0;
  const notional = margin * lev;
  // PnL is capped at ±margin, so liquidation is the price where loss = margin:
  // long liquidates below entry, short above, by 1/leverage.
  const liqPrice = isLong ? price * (1 - 1 / lev) : price * (1 + 1 / lev);
  const exceeds = margin > collateral;
  const invalid = margin <= 0 || exceeds;

  return (
    <div className="rounded-2xl surface-card overflow-hidden">
      <div className="bg-red text-paper px-4 py-[11px] flex justify-between items-center">
        <span className="font-display text-sm tracking-[0.04em]">ORDER TICKET</span>
        <span className="font-bold text-xs text-mustard">№ 1958</span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Long / Short */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSide(0)}
            className={cn(
              "border-2 border-red rounded-[11px] py-[11px] font-display text-sm transition",
              isLong ? "bg-green border-green text-white" : "text-red bg-transparent"
            )}
          >
            Long
          </button>
          <button
            onClick={() => onSide(1)}
            className={cn(
              "border-2 border-red rounded-[11px] py-[11px] font-display text-sm transition",
              !isLong ? "bg-red text-paper" : "text-red bg-transparent"
            )}
          >
            Short
          </button>
        </div>

        {/* Margin */}
        <div>
          <div className="mb-1 flex justify-between text-xs text-ink/60">
            <span>Margin</span>
            <span>
              Avail {fmtUSD(collateral)}{" "}
              <button
                type="button"
                onClick={() => onMargin(collateral)}
                className="text-mustard-dp font-semibold hover:underline"
              >
                MAX
              </button>
            </span>
          </div>
          <label className="flex items-center gap-2 rounded-xl surface-inset px-3 focus-within:border-red/40 transition-colors">
            <span className="text-sm text-ink/50">$</span>
            <input
              type="number"
              min={1}
              value={margin}
              onChange={(e) => onMargin(Math.max(0, Number(e.target.value) || 0))}
              className="tabular w-full bg-transparent py-2 text-sm text-ink outline-none"
            />
          </label>
        </div>

        {/* Leverage */}
        <div>
          <div className="mb-1 flex justify-between text-xs text-ink/60">
            <span>Leverage</span>
            <span className="tabular text-ink">{lev}×</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {LEVERAGE_PILLS.map((v) => {
              const on = lev === v;
              return (
                <motion.button
                  key={v}
                  onClick={() => onLev(v)}
                  whileTap={tapScale}
                  className={cn(
                    "relative isolate rounded-lg border py-[7px] text-xs font-semibold transition-colors",
                    on ? "border-mustard text-ink" : "border-line text-ink/60 hover:border-mustard-dp hover:text-ink"
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId="lev-ind"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 -z-10 rounded-lg bg-mustard"
                    />
                  )}
                  {v}×
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Expiry */}
        <div>
          <div className="mb-1 text-xs text-ink/60">Expiry</div>
          <div className="grid grid-cols-3 gap-1">
            {expiries.map((e, i) => {
              const on = i === expIdx;
              return (
                <motion.button
                  key={e.label}
                  onClick={() => onExpIdx(i)}
                  whileTap={tapScale}
                  className={cn(
                    "relative isolate rounded-lg border py-[7px] text-xs font-semibold transition-colors",
                    on ? "border-mustard text-ink" : "border-line text-ink/60 hover:border-mustard-dp hover:text-ink"
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId="exp-ind"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 -z-10 rounded-lg bg-mustard"
                    />
                  )}
                  {e.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-xl surface-inset px-3 py-2">
          <Row k="Entry (mark)" v={fmtPrice(price)} />
          <Row k="Notional" v={fmtUSD(notional)} />
          <Row k="Est. liq price" v={fmtPrice(liqPrice)} />
          <Row k="Max loss" v={fmtUSD(margin)} />
          <div className="flex items-baseline justify-between gap-2 pt-[5px] border-t border-dashed border-line mt-[5px]">
            <span className="text-xs text-mustard-dp">Settles against</span>
            <span className="text-xs text-mustard-dp font-semibold">USDA index</span>
          </div>
        </div>

        {/* CTA */}
        <div>
          <motion.button
            onClick={onSubmit}
            disabled={busy || invalid}
            whileTap={{ scale: 0.985 }}
            className={cn(
              "w-full font-display text-base py-[15px] rounded-[12px] text-white transition disabled:opacity-50",
              isLong ? "bg-green" : "bg-red"
            )}
          >
            {busy ? "Opening…" : isLong ? "OPEN LONG" : "OPEN SHORT"}
          </motion.button>
          {exceeds && (
            <p className="mt-1.5 text-center text-xs font-semibold text-red">
              Margin exceeds available collateral
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
