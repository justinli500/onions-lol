"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { usePrice } from "@/lib/usePrice";
import { Marquee } from "@/components/trade/Marquee";
import { PriceHeader } from "@/components/trade/PriceHeader";
import { ChartToolbar } from "@/components/trade/ChartToolbar";
import type { TimeframeId } from "@/lib/chartWindow";
import { DEMO_MODE } from "@/lib/demo";
import { MARKETS } from "@/lib/markets";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const PriceChart = dynamic(() => import("@/components/PriceChart").then((m) => m.PriceChart), {
  ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-[14px] bg-paper-2" />,
});
const TradePanel = dynamic(() => import("@/components/TradePanel").then((m) => m.TradePanel), { ssr: false });
const PositionsList = dynamic(() => import("@/components/PositionsList").then((m) => m.PositionsList), { ssr: false });

type Mode = "line" | "candles" | "onions";

function TradePageInner() {
  const { anchorUsd: realAnchor } = usePrice();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("line");
  const [timeframe, setTimeframe] = useState<TimeframeId>("1D");

  // Demo-only: /trade?m=<id> picks one of the demo markets to display.
  const market = DEMO_MODE
    ? MARKETS.find((m) => m.id === params.get("m")) ?? MARKETS[0]
    : undefined;
  const anchorUsd = market ? market.price : realAnchor;

  return (
    <div className="w-full max-w-[1320px] mx-auto px-[26px] pb-[50px]">
      <Marquee />
      <motion.div
        variants={staggerContainer()}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[22px] items-start"
      >
        <div className="flex flex-col gap-4">
          <motion.div variants={fadeInUp}>
            <PriceHeader market={market} />
          </motion.div>
          <motion.div variants={fadeInUp} className="rounded-2xl surface-card px-3.5 pt-3.5 pb-2 relative">
            <ChartToolbar mode={mode} onMode={setMode} timeframe={timeframe} onTimeframe={setTimeframe} />
            <div className="h-[312px]"><PriceChart anchorUsd={anchorUsd} mode={mode} timeframe={timeframe} /></div>
          </motion.div>
          <motion.div variants={fadeInUp} className="rounded-2xl surface-card p-4">
            <h2 className="font-display text-sm text-red mb-3">POSITIONS</h2>
            <PositionsList />
          </motion.div>
        </div>
        <motion.div variants={fadeInUp}>
          <TradePanel />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={null}>
      <TradePageInner />
    </Suspense>
  );
}
