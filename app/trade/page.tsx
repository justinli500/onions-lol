"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePrice } from "@/lib/usePrice";
import { Nav } from "@/components/trade/Nav";
import { Marquee } from "@/components/trade/Marquee";
import { PriceHeader } from "@/components/trade/PriceHeader";
import { ChartToolbar } from "@/components/trade/ChartToolbar";
import type { TimeframeId } from "@/lib/chartWindow";

const PriceChart = dynamic(() => import("@/components/PriceChart").then((m) => m.PriceChart), {
  ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-[14px] bg-paper-2" />,
});
const TradePanel = dynamic(() => import("@/components/TradePanel").then((m) => m.TradePanel), { ssr: false });
const PositionsList = dynamic(() => import("@/components/PositionsList").then((m) => m.PositionsList), { ssr: false });

type Mode = "line" | "candles" | "onions";

export default function TradePage() {
  const { anchorUsd } = usePrice();
  const [mode, setMode] = useState<Mode>("line");
  const [timeframe, setTimeframe] = useState<TimeframeId>("1D");

  return (
    <div className="w-full max-w-[1320px] mx-auto px-[26px] pt-[18px] pb-[50px]">
      <Nav />
      <Marquee />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[22px] items-start">
        <div>
          <PriceHeader />
          <div className="mt-4 rounded-[18px] border-[2.5px] border-red bg-card px-3.5 pt-3.5 pb-2 relative">
            <ChartToolbar mode={mode} onMode={setMode} timeframe={timeframe} onTimeframe={setTimeframe} />
            <div className="h-[312px]"><PriceChart anchorUsd={anchorUsd} mode={mode} timeframe={timeframe} /></div>
          </div>
          <div className="mt-4 rounded-[18px] border-[2.5px] border-red bg-card p-4">
            <h2 className="font-display text-sm text-red mb-3">POSITIONS</h2>
            <PositionsList />
          </div>
        </div>
        <TradePanel />
      </div>
    </div>
  );
}
