"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { usePrice } from "@/lib/usePrice";
import { markAtUsd } from "@shared/mark";
import { fmtPrice } from "@/lib/format";
import { StatChip } from "@/components/trade/StatChip";
import type { Market } from "@/lib/markets";

function useSettleCountdown() {
  const [label, setLabel] = useState("--");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      const s = Math.max(0, Math.floor((end - now.getTime()) / 1000));
      setLabel(`${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return label;
}

/** Live mark for a demo market (wanders around its price as anchor). */
function useMarketMark(market?: Market) {
  const [price, setPrice] = useState(market?.price ?? 0);
  useEffect(() => {
    if (!market) return;
    const tick = () => setPrice(markAtUsd(market.price, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [market]);
  return price;
}

export function PriceHeader({ market }: { market?: Market }) {
  const live = usePrice();
  const marketPrice = useMarketMark(market);
  const settle = useSettleCountdown();

  const anchorUsd = market ? market.price : live.anchorUsd;
  const price = market ? marketPrice : live.price;
  const changePct = anchorUsd ? ((price - anchorUsd) / anchorUsd) * 100 : 0;
  const up = changePct >= 0;

  // price-tick flash
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prev = useRef(price);
  useEffect(() => {
    if (price > prev.current) setFlash("up");
    else if (price < prev.current) setFlash("down");
    prev.current = price;
    const t = setTimeout(() => setFlash(null), 220);
    return () => clearTimeout(t);
  }, [price]);

  const label = market ? market.name : "the onion index";
  const subline = market
    ? `${market.origin} · dated onion futures`
    : "NY Terminal · yellow · 50-lb sack · US No.1";

  return (
    <div>
      <span className="inline-flex items-center gap-1.5 font-bold text-xs text-red">
        <span className="h-2 w-2 rounded-full bg-red animate-pulse" /> LIVE · settles vs USDA
      </span>
      <div className="font-script text-[34px] text-red leading-none mt-2 -mb-1 inline-block -rotate-2">
        {label}
      </div>
      <div
        className={cn(
          "font-display tabular text-[72px] leading-[0.95] tracking-tight my-0.5 transition-colors duration-150",
          flash === "up" ? "text-green" : flash === "down" ? "text-red" : "text-ink",
        )}
      >
        {fmtPrice(price)}
      </div>
      <div className="flex items-center gap-3">
        <span className={cn("font-extrabold text-[15px] tabular", up ? "text-green" : "text-red")}>
          <span className="inline-block">{up ? "▲" : "▼"}</span> {up ? "+" : ""}
          {changePct.toFixed(2)}% today
        </span>
        <span className="text-ink/55 text-xs font-semibold">{subline}</span>
      </div>
      <div className="flex gap-2.5 flex-wrap mt-4">
        <StatChip label="Mark · synthetic" value={fmtPrice(price)} />
        <StatChip label="USDA Settlement" value={fmtPrice(anchorUsd)} tone="gold" />
        <StatChip label="Settles in" value={settle} tone="green" />
      </div>
    </div>
  );
}
