"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { TIMEFRAMES, type TimeframeId } from "@/lib/chartWindow";

type Mode = "line" | "candles" | "onions";
const MODES: { id: Mode; label: string }[] = [
  { id: "line", label: "Line" },
  { id: "candles", label: "Candles" },
  { id: "onions", label: "🧅 Onions" },
];

export function ChartToolbar({
  timeframe,
  onTimeframe,
  mode,
  onMode,
}: {
  timeframe: TimeframeId;
  onTimeframe: (t: TimeframeId) => void;
  mode: Mode;
  onMode: (m: Mode) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex gap-0.5">
        {TIMEFRAMES.map((t) => (
          <button
            key={t.id}
            onClick={() => onTimeframe(t.id)}
            className={cn(
              "text-xs font-bold px-2.5 py-1.5 rounded-full transition-colors",
              timeframe === t.id
                ? "bg-mustard text-red"
                : "text-red/55 hover:text-red",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative inline-flex rounded-full border-[1.5px] border-red/85 p-[3px] bg-paper">
        {MODES.map((m) => (
          <motion.button
            key={m.id}
            onClick={() => onMode(m.id)}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "relative z-[1] text-xs font-bold px-3 py-1.5 rounded-full transition-colors",
              mode === m.id ? "text-paper" : "text-red",
            )}
          >
            {mode === m.id && (
              <motion.span
                layoutId="mode-ind"
                transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
                className="absolute inset-0 -z-[1] rounded-full bg-red"
              />
            )}
            {m.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
