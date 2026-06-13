"use client";

import { useState } from "react";
import { toast } from "sonner";
import { usePrice } from "@/lib/usePrice";
import { fmtUSD } from "@/lib/format";
import { useDemo } from "@/lib/demo";
import { OrderTicket, type Expiry } from "@/components/trade/OrderTicket";

const EXPIRIES: Expiry[] = [
  { label: "15m", s: 900 },
  { label: "1h", s: 3600 },
  { label: "1d", s: 86400 },
];

export function DemoTradePanel() {
  const { price } = usePrice();
  const { collateral, openPosition } = useDemo();
  const [side, setSide] = useState<0 | 1>(0);
  const [margin, setMargin] = useState(50);
  const [lev, setLev] = useState(2);
  const [expIdx, setExpIdx] = useState(1);
  const [busy, setBusy] = useState(false);

  function submit() {
    if (margin <= 0) return;
    if (collateral < margin) return toast.error("Not enough collateral");
    setBusy(true);
    openPosition({
      side,
      margin,
      lev,
      entry: price,
      expiry: Date.now() + EXPIRIES[expIdx].s * 1000,
    });
    toast.success(
      `Opened ${side === 0 ? "long" : "short"} · ${fmtUSD(margin * lev)} notional`,
    );
    setBusy(false);
  }

  return (
    <OrderTicket
      side={side}
      onSide={setSide}
      margin={margin}
      onMargin={setMargin}
      lev={lev}
      onLev={setLev}
      expIdx={expIdx}
      onExpIdx={setExpIdx}
      expiries={EXPIRIES}
      collateral={collateral}
      price={price}
      busy={busy}
      onSubmit={submit}
    />
  );
}
