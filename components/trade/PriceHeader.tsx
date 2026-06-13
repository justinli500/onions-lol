"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { usePrice } from "@/lib/usePrice";
import { fmtPrice } from "@/lib/format";
import { StatChip } from "@/components/trade/StatChip";

function useSettleCountdown() {
  const [label, setLabel] = useState("--");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
      );
      const s = Math.max(0, Math.floor((end - now.getTime()) / 1000));
      setLabel(
        `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return label;
}

export function PriceHeader() {
  const { price, changePct, anchorUsd } = usePrice();
  const up = changePct >= 0;
  const settle = useSettleCountdown();

  return (
    <div>
      <span className="inline-flex items-center gap-1.5 font-bold text-xs text-red">
        <span className="h-2 w-2 rounded-full bg-red animate-pulse" /> LIVE ·
        settles vs USDA
      </span>
      <div className="font-script text-[34px] text-red leading-none mt-2 -mb-1 inline-block -rotate-2">
        the onion index
      </div>
      <div className="font-display tabular text-[72px] leading-[0.95] text-ink tracking-tight my-0.5">
        {fmtPrice(price)}
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "font-extrabold text-[15px] tabular",
            up ? "text-green" : "text-red-br",
          )}
        >
          <span className="inline-block">{up ? "▲" : "▼"}</span>{" "}
          {up ? "+" : ""}
          {changePct.toFixed(2)}% today
        </span>
        <span className="text-ink/55 text-xs font-semibold">
          NY Terminal · yellow · 50-lb sack · US No.1
        </span>
      </div>
      <div className="flex gap-2.5 flex-wrap mt-4">
        <StatChip label="Mark · synthetic" value={fmtPrice(price)} />
        <StatChip
          label="USDA Settlement"
          value={fmtPrice(anchorUsd)}
          tone="gold"
        />
        <StatChip label="Settles in" value={settle} tone="green" />
      </div>
    </div>
  );
}
