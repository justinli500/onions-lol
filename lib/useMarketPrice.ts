"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { markAtUsd } from "@shared/mark";
import { usePrice } from "@/lib/usePrice";
import { DEMO_MODE } from "@/lib/demo";
import { MARKETS } from "@/lib/markets";

/**
 * Live mark for the active market. In demo mode the market comes from
 * /trade?m=<id> (default: the first market); otherwise it's the real ONION mark.
 * Keeps the order ticket + positions in agreement with the header and chart.
 */
export function useMarketPrice(): number {
  const params = useSearchParams();
  const { price: realPrice } = usePrice();
  const market = DEMO_MODE
    ? MARKETS.find((m) => m.id === params.get("m")) ?? MARKETS[0]
    : undefined;
  const anchor = market?.price ?? 0;

  const [mp, setMp] = useState(anchor);
  useEffect(() => {
    if (!anchor) return;
    const tick = () => setMp(markAtUsd(anchor, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [anchor]);

  return market ? mp : realPrice;
}
