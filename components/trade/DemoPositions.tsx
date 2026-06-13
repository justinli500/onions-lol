"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePrice } from "@/lib/usePrice";
import { fmtUSD, fmtSigned, fmtPrice } from "@/lib/format";
import { useDemo, demoPnl, type DemoPosition } from "@/lib/demo";

function DemoRow({ pos }: { pos: DemoPosition }) {
  const { price } = usePrice();
  const { closePosition } = useDemo();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const isLong = pos.side === 0;
  const notional = pos.margin * pos.lev;
  const pnl = demoPnl(pos, price);
  const expired = nowMs >= pos.expiry;

  function act() {
    closePosition(pos.id, pnl);
    toast.success(expired ? "Settled against USDA price" : "Position closed");
  }

  return (
    <tr className="border-t border-line border-dotted">
      <td className={`py-2 font-semibold ${isLong ? "text-green" : "text-red"}`}>
        {isLong ? "Long" : "Short"}
      </td>
      <td className="tabular">{fmtUSD(notional)}</td>
      <td className="tabular">{fmtPrice(pos.entry)}</td>
      <td className={`tabular ${pnl >= 0 ? "text-green" : "text-red"}`}>{fmtSigned(pnl)}</td>
      <td className="text-right">
        <button
          onClick={act}
          className="border-2 border-red text-red rounded-full px-3 py-1 text-xs hover:bg-red/[0.08] active:scale-[0.97] transition"
        >
          {expired ? "Settle" : "Close"}
        </button>
      </td>
    </tr>
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
          <th />
        </tr>
      </thead>
      <tbody>
        {positions.map((pos) => (
          <DemoRow key={pos.id} pos={pos} />
        ))}
      </tbody>
    </table>
  );
}
