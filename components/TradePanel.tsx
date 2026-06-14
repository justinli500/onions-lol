"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { FUTURES_ADDRESS, futuresAbi, SIDE } from "@/lib/contracts";
import { useCollateral } from "@/lib/useExchange";
import { usePrice } from "@/lib/usePrice";
import { fmtUSD } from "@/lib/format";
import { DepositButton } from "@/components/DepositButton";
import { msgOf } from "@/lib/err";
import { DEMO_MODE } from "@/lib/demo";
import { DemoTradePanel } from "@/components/trade/DemoTradePanel";
import { OrderTicket, type Expiry } from "@/components/trade/OrderTicket";

const PRIVY_ENABLED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const EXPIRIES: Expiry[] = [
  { label: "15m", s: 900 },
  { label: "1h", s: 3600 },
  { label: "1d", s: 86400 },
];

function TradePanelInner() {
  const { collateral, refetch } = useCollateral();
  const { price } = usePrice();
  const { writeContractAsync } = useWriteContract();
  const [side, setSide] = useState<0 | 1>(SIDE.LONG);
  const [margin, setMargin] = useState(50);
  const [lev, setLev] = useState(2);
  const [expIdx, setExpIdx] = useState(1);
  const [busy, setBusy] = useState(false);

  const notional = margin * lev;
  const isLong = side === SIDE.LONG;

  async function open() {
    if (!FUTURES_ADDRESS) return toast.error("Exchange not deployed yet");
    if (collateral < margin) return toast.error("Deposit more collateral");
    setBusy(true);
    try {
      const expiry = BigInt(Math.floor(Date.now() / 1000) + EXPIRIES[expIdx].s);
      await writeContractAsync({
        address: FUTURES_ADDRESS,
        abi: futuresAbi,
        functionName: "open",
        args: [side, parseUnits(String(margin), 6), lev, expiry],
      });
      toast.success(`Opened ${isLong ? "long" : "short"} · ${fmtUSD(notional)} notional`);
      refetch();
    } catch (e) {
      toast.error(msgOf(e));
    } finally {
      setBusy(false);
    }
  }

  if (collateral <= 0) {
    return (
      <div className="rounded-2xl surface-card overflow-hidden">
        <div className="bg-red text-paper px-4 py-[11px] flex justify-between items-center">
          <span className="font-display text-sm tracking-[0.04em]">ORDER TICKET</span>
          <span className="font-bold text-xs text-mustard">№ 1958</span>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm text-ink/60 font-display tracking-wide">
            Deposit USDC to start trading onions.
          </p>
          <DepositButton onDeposited={refetch} />
        </div>
      </div>
    );
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
      onSubmit={open}
    />
  );
}

export function TradePanel() {
  if (DEMO_MODE) return <DemoTradePanel />;
  if (!PRIVY_ENABLED) {
    return (
      <p className="text-sm text-ink/60">
        Set NEXT_PUBLIC_PRIVY_APP_ID to enable trading.
      </p>
    );
  }
  return <TradePanelInner />;
}
