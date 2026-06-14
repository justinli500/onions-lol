"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { FUTURES_ADDRESS, futuresAbi, SIDE } from "@/lib/contracts";
import { useCollateral } from "@/lib/useExchange";
import { usePrice } from "@/lib/usePrice";
import { fmtPrice, fmtUSD } from "@/lib/format";
import { DepositButton } from "@/components/DepositButton";
import { WithdrawButton } from "@/components/WithdrawButton";
import { msgOf } from "@/lib/err";

const PRIVY_ENABLED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const EXPIRIES = [
  { label: "15m", s: 900 },
  { label: "1h", s: 3600 },
  { label: "1d", s: 86400 },
];

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{k}</span>
      <span className="tabular">{v}</span>
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
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const notional = margin * lev;
  const isLong = side === SIDE.LONG;
  const tooMuch = margin > collateral;

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
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">Deposit USDC to start trading onions.</p>
        <DepositButton onDeposited={refetch} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">
          Collateral{" "}
          <span className="tabular text-foreground">{fmtUSD(collateral)}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeposit((v) => !v)}
            className="rounded-md border border-border px-2 py-1 font-medium text-foreground transition hover:bg-surface-2"
          >
            {showDeposit ? "Close" : "+ Deposit"}
          </button>
          <button
            onClick={() => setShowWithdraw((v) => !v)}
            className="rounded-md border border-border px-2 py-1 font-medium text-foreground transition hover:bg-surface-2"
          >
            {showWithdraw ? "Close" : "Withdraw"}
          </button>
        </div>
      </div>
      {showDeposit && (
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <DepositButton
            onDeposited={() => {
              refetch();
              setShowDeposit(false);
            }}
          />
        </div>
      )}
      {showWithdraw && (
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <WithdrawButton
            onWithdrawn={() => {
              refetch();
              setShowWithdraw(false);
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
        <button
          onClick={() => setSide(SIDE.LONG)}
          className={`h-9 rounded-md text-sm font-semibold transition ${isLong ? "bg-up text-black" : "text-muted"}`}
        >
          Long
        </button>
        <button
          onClick={() => setSide(SIDE.SHORT)}
          className={`h-9 rounded-md text-sm font-semibold transition ${!isLong ? "bg-down text-white" : "text-muted"}`}
        >
          Short
        </button>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Margin</span>
          <button
            type="button"
            onClick={() => setMargin(Math.floor(collateral))}
            className="transition hover:text-foreground"
          >
            Avail {fmtUSD(collateral)} · Max
          </button>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3">
          <span className="text-sm text-muted">$</span>
          <input
            type="number"
            min={1}
            value={margin}
            onChange={(e) => setMargin(Math.max(0, Number(e.target.value) || 0))}
            className="tabular w-full bg-transparent py-2 text-sm outline-none"
          />
        </label>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Leverage</span>
          <span className="tabular text-foreground">{lev}×</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={lev}
          onChange={(e) => setLev(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>

      <div>
        <div className="mb-1 text-xs text-muted">Expiry</div>
        <div className="grid grid-cols-3 gap-1">
          {EXPIRIES.map((e, i) => (
            <button
              key={e.label}
              onClick={() => setExpIdx(i)}
              className={`h-8 rounded-md text-xs transition ${
                i === expIdx
                  ? "border border-border bg-surface-2 text-foreground"
                  : "text-muted"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-lg bg-surface-2 p-3 text-xs">
        <Row k="Entry (mark)" v={fmtPrice(price)} />
        <Row k="Notional" v={fmtUSD(notional)} />
        <Row k="Max loss" v={fmtUSD(margin)} />
      </div>

      <button
        onClick={open}
        disabled={busy || margin <= 0 || tooMuch}
        className={`h-11 rounded-xl font-semibold transition hover:brightness-110 active:scale-95 disabled:opacity-50 ${
          isLong ? "bg-up text-black" : "bg-down text-white"
        }`}
      >
        {busy
          ? "Opening…"
          : tooMuch
            ? "Insufficient collateral"
            : `Open ${isLong ? "Long" : "Short"}`}
      </button>
    </div>
  );
}

export function TradePanel() {
  if (!PRIVY_ENABLED) {
    return (
      <p className="text-sm text-muted">
        Set NEXT_PUBLIC_PRIVY_APP_ID to enable trading.
      </p>
    );
  }
  return <TradePanelInner />;
}
