"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { motion } from "motion/react";
import { FUTURES_ADDRESS, futuresAbi, SIDE } from "@/lib/contracts";
import { useCollateral } from "@/lib/useExchange";
import { usePrice } from "@/lib/usePrice";
import { fmtPrice, fmtUSD } from "@/lib/format";
import { DepositButton } from "@/components/DepositButton";
import { msgOf } from "@/lib/err";
import { cn } from "@/lib/cn";

const PRIVY_ENABLED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const EXPIRIES = [
  { label: "15m", s: 900 },
  { label: "1h", s: 3600 },
  { label: "1d", s: 86400 },
];

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-[5px]">
      <span className="text-xs text-ink/60">{k}</span>
      <span className="flex-1 border-b border-dashed border-line" />
      <span className="tabular text-xs text-ink">{v}</span>
    </div>
  );
}

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
      <div className="rounded-[18px] border-[2.5px] border-red bg-card overflow-hidden">
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

  const leveragePills = [1, 2, 5, 10];

  return (
    <div className="rounded-[18px] border-[2.5px] border-red bg-card overflow-hidden">
      {/* Header */}
      <div className="bg-red text-paper px-4 py-[11px] flex justify-between items-center">
        <span className="font-display text-sm tracking-[0.04em]">ORDER TICKET</span>
        <span className="font-bold text-xs text-mustard">№ 1958</span>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4">

        {/* Long / Short */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide(SIDE.LONG)}
            className={cn(
              "border-2 border-red rounded-[11px] py-[11px] font-display text-sm transition",
              isLong ? "bg-green border-green text-white" : "text-red bg-transparent"
            )}
          >
            Long
          </button>
          <button
            onClick={() => setSide(SIDE.SHORT)}
            className={cn(
              "border-2 border-red rounded-[11px] py-[11px] font-display text-sm transition",
              !isLong ? "bg-red text-paper" : "text-red bg-transparent"
            )}
          >
            Short
          </button>
        </div>

        {/* Margin */}
        <div>
          <div className="mb-1 flex justify-between text-xs text-ink/60">
            <span>Margin</span>
            <span>
              Avail {fmtUSD(collateral)}{" "}
              <button
                type="button"
                onClick={() => setMargin(collateral)}
                className="text-mustard-dp font-semibold hover:underline"
              >
                MAX
              </button>
            </span>
          </div>
          <label className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-bd bg-paper px-3">
            <span className="text-sm text-ink/50">$</span>
            <input
              type="number"
              min={1}
              value={margin}
              onChange={(e) => setMargin(Math.max(0, Number(e.target.value) || 0))}
              className="tabular w-full bg-transparent py-2 text-sm text-ink outline-none"
            />
          </label>
        </div>

        {/* Leverage — pill row */}
        <div>
          <div className="mb-1 flex justify-between text-xs text-ink/60">
            <span>Leverage</span>
            <span className="tabular text-ink">{lev}×</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {leveragePills.map((v) => (
              <button
                key={v}
                onClick={() => setLev(v)}
                className={cn(
                  "rounded-[8px] border py-[7px] text-xs font-semibold transition",
                  lev === v
                    ? "border-mustard bg-mustard text-ink"
                    : "border-line text-ink/60 hover:border-mustard-dp hover:text-ink"
                )}
              >
                {v}×
              </button>
            ))}
          </div>
        </div>

        {/* Expiry — pill row */}
        <div>
          <div className="mb-1 text-xs text-ink/60">Expiry</div>
          <div className="grid grid-cols-3 gap-1">
            {EXPIRIES.map((e, i) => (
              <button
                key={e.label}
                onClick={() => setExpIdx(i)}
                className={cn(
                  "rounded-[8px] border py-[7px] text-xs font-semibold transition",
                  i === expIdx
                    ? "border-mustard bg-mustard text-ink"
                    : "border-line text-ink/60 hover:border-mustard-dp hover:text-ink"
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary rows */}
        <div className="rounded-[10px] border border-line bg-paper px-3 py-2">
          <Row k="Entry (mark)" v={fmtPrice(price)} />
          <Row k="Notional" v={fmtUSD(notional)} />
          <Row k="Max loss" v={fmtUSD(margin)} />
          <div className="flex items-baseline justify-between gap-2 pt-[5px] border-t border-dashed border-line mt-[5px]">
            <span className="text-xs text-mustard-dp">Settles against</span>
            <span className="text-xs text-mustard-dp font-semibold">USDA index</span>
          </div>
        </div>

        {/* CTA */}
        <motion.button
          onClick={open}
          disabled={busy || margin <= 0}
          whileTap={{ scale: 0.985 }}
          className={cn(
            "font-display text-base py-[15px] rounded-[12px] text-white transition disabled:opacity-50",
            isLong ? "bg-green" : "bg-red"
          )}
        >
          {busy ? "Opening…" : isLong ? "OPEN LONG" : "OPEN SHORT"}
        </motion.button>
      </div>
    </div>
  );
}

export function TradePanel() {
  if (!PRIVY_ENABLED) {
    return (
      <p className="text-sm text-ink/60">
        Set NEXT_PUBLIC_PRIVY_APP_ID to enable trading.
      </p>
    );
  }
  return <TradePanelInner />;
}
