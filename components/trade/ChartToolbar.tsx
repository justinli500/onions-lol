"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { TIMEFRAMES, type TimeframeId } from "@/lib/chartWindow";
import { SPRING_SNAPPY, tapScale } from "@/lib/animations";

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
        {TIMEFRAMES.map((t) => {
          const on = timeframe === t.id;
          return (
            <motion.button
              key={t.id}
              onClick={() => onTimeframe(t.id)}
              whileTap={tapScale}
              className={cn(
                "relative isolate text-xs font-bold px-2.5 py-1.5 rounded-full transition-colors",
                on ? "text-red" : "text-red/55 hover:text-red",
              )}
            >
              {on && (
                <motion.span
                  layoutId="tf-ind"
                  transition={SPRING_SNAPPY}
                  className="absolute inset-0 -z-10 rounded-full bg-mustard"
                />
              )}
              {t.label}
            </motion.button>
          );
        })}
      </div>
      <div className="relative inline-flex rounded-full border-[1.5px] border-red/85 p-[3px] bg-paper">
        {MODES.map((m) => (
          <motion.button
            key={m.id}
            onClick={() => onMode(m.id)}
            whileTap={tapScale}
            className={cn(
              "relative isolate text-xs font-bold px-3 py-1.5 rounded-full transition-colors",
              mode === m.id ? "text-paper" : "text-red",
            )}
          >
            {mode === m.id && (
              <motion.span
                layoutId="mode-ind"
                transition={SPRING_SNAPPY}
                className="absolute inset-0 -z-10 rounded-full bg-red"
              />
            )}
            {m.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
