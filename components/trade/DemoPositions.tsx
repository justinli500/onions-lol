"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { useMarketPrice } from "@/lib/useMarketPrice";
import { fmtUSD, fmtSigned, fmtPrice } from "@/lib/format";
import { useDemo, demoPnl, type DemoPosition } from "@/lib/demo";

function countdown(ms: number): string {
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

function DemoRow({ pos }: { pos: DemoPosition }) {
  const price = useMarketPrice();
  const { closePosition } = useDemo();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const isLong = pos.side === 0;
  const notional = pos.margin * pos.lev;
  const pnl = demoPnl(pos, price);
  const pnlPct = (pnl / pos.margin) * 100;
  const expired = nowMs >= pos.expiry;
  const liquidated = pnl <= -pos.margin + 1e-6;

  function act() {
    closePosition(pos.id, pnl);
    toast.success(expired ? "Settled against USDA price" : "Position closed");
  }

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="border-t border-line border-dotted"
    >
      <td className="py-2.5">
        <div className="flex items-center gap-1.5">
          <span className={`font-semibold ${isLong ? "text-green" : "text-red"}`}>
            {isLong ? "Long" : "Short"}
          </span>
          <span className="rounded bg-red/10 px-1.5 py-0.5 text-[10px] font-bold text-red tabular">
            {pos.lev}×
          </span>
          {liquidated && (
            <span className="rounded bg-red px-1.5 py-0.5 text-[10px] font-bold text-paper">LIQ</span>
          )}
        </div>
      </td>
      <td className="tabular text-ink/80">{fmtUSD(notional)}</td>
      <td className="tabular text-ink/80">{fmtPrice(pos.entry)}</td>
      <td className={`tabular ${pnl >= 0 ? "text-green" : "text-red"}`}>
        <div className="font-semibold">{fmtSigned(pnl)}</div>
        <div className="text-[11px] opacity-80">{pnl >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%</div>
      </td>
      <td className="hidden tabular text-xs text-ink/60 sm:table-cell">
        {countdown(pos.expiry - nowMs)}
      </td>
      <td className="text-right">
        <button
          onClick={act}
          className="border-2 border-red text-red rounded-full px-3 py-1 text-xs hover:bg-red/[0.08] active:scale-[0.97] transition"
        >
          {expired ? "Settle" : "Close"}
        </button>
      </td>
    </motion.tr>
  );
}

export function DemoPositions() {
  const { positions } = useDemo();

  if (positions.length === 0) {
    return <p className="text-sm text-ink/55">Open a position to see it here.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-red uppercase">
          <th className="py-1 font-normal">Side</th>
          <th className="font-normal">Notional</th>
          <th className="font-normal">Entry</th>
          <th className="font-normal">PnL (mark)</th>
          <th className="hidden font-normal sm:table-cell">Expires</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <AnimatePresence initial={false}>
          {positions.map((pos) => (
            <DemoRow key={pos.id} pos={pos} />
          ))}
        </AnimatePresence>
      </tbody>
    </table>
  );
}
