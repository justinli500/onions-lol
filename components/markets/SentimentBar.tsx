"use client";

import { motion } from "motion/react";
import { EASE_OUT } from "@/lib/animations";

/** Long/short open-interest split. Segments grow in (scaleX) from the outside. */
export function SentimentBar({ longPct }: { longPct: number }) {
  const long = Math.round(longPct * 1000) / 10;
  const short = Math.round((1 - longPct) * 1000) / 10;
  return (
    <div className="w-full max-w-[200px]">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-paper">
        <motion.div
          className="h-full origin-left bg-green"
          style={{ width: `${long}%` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        />
        <motion.div
          className="h-full origin-right bg-red-br"
          style={{ width: `${short}%` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.06 }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink/60">
        <span>Long <b className="text-green tabular">{long}%</b></span>
        <span>Short <b className="text-red tabular">{short}%</b></span>
      </div>
    </div>
  );
}
