"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { markAtUsd } from "@shared/mark";
import { fmtPrice } from "@/lib/format";
import { Sparkline } from "@/components/markets/Sparkline";
import { SentimentBar } from "@/components/markets/SentimentBar";
import { MARKETS, marketSeries } from "@/lib/markets";
import { popIn, useEntranceGate } from "@/lib/animations";

function compactUsd(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toLocaleString("en-US")}`;
}

/** The single live market, shown as a featured index card (live price + trend). */
export function FeaturedMarket() {
  const m = MARKETS[0];
  const [price, setPrice] = useState(m.price);
  useEffect(() => {
    const tick = () => setPrice(markAtUsd(m.price, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [m.price]);

  const up = m.changePct >= 0;
  const series = marketSeries(m, 72);
  const play = useEntranceGate("markets");

  return (
    <motion.div
      variants={popIn}
      initial={play ? "hidden" : false}
      animate="show"
      className="rounded-2xl surface-card overflow-hidden"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 p-5 sm:p-6">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green">
            <span className="size-2 rounded-full bg-green animate-pulse" /> LIVE
            <span className="font-normal text-ink/50">· Base Sepolia · settles vs USDA</span>
          </span>
          <h2 className="mt-1.5 font-display text-3xl text-ink tracking-tight">{m.name}</h2>
          <p className="mt-1 text-xs font-semibold text-ink/55">
            {m.origin} · 50-lb sack · US No.1
          </p>
        </div>
        <div className="text-right">
          <div className="font-display tabular text-4xl text-ink leading-none">{fmtPrice(price)}</div>
          <div className={`mt-1 flex items-center justify-end gap-1 text-sm font-bold tabular ${up ? "text-green" : "text-red"}`}>
            <span>{up ? "▲" : "▼"}</span>
            <span>{up ? "+" : ""}{m.changePct.toFixed(2)}% today</span>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-6">
        <Sparkline data={series} up={up} fluid height={96} className="block w-full" />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-[1fr_1.4fr_auto] sm:items-center sm:p-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.08em] font-extrabold text-red/75">Open Interest</div>
          <div className="tabular text-lg font-extrabold text-ink">{compactUsd(m.openInterest)}</div>
        </div>
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.08em] font-extrabold text-red/75">Market Sentiment</div>
          <SentimentBar longPct={m.longPct} />
        </div>
        <Link
          href={`/trade?m=${m.id}`}
          className="col-span-2 rounded-xl bg-green px-6 py-3 text-center font-display text-base text-white transition hover:brightness-105 active:scale-[0.985] sm:col-span-1"
        >
          Trade {m.name}
        </Link>
      </div>
    </motion.div>
  );
}
