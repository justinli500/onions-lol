"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePrice } from "@/lib/usePrice";
import { fmtPrice } from "@/lib/format";

// Wallet + canvas UI are client-only (Privy state / DOM); keep them out of SSG.
const ConnectButton = dynamic(
  () => import("@/components/ConnectButton").then((m) => m.ConnectButton),
  { ssr: false },
);
const PriceChart = dynamic(
  () => import("@/components/PriceChart").then((m) => m.PriceChart),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-surface-2" /> },
);
const TradePanel = dynamic(
  () => import("@/components/TradePanel").then((m) => m.TradePanel),
  { ssr: false },
);
const PositionsList = dynamic(
  () => import("@/components/PositionsList").then((m) => m.PositionsList),
  { ssr: false },
);

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <span className={`tabular text-sm font-semibold ${accent ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}

export default function TradePage() {
  const { price, changePct, anchorUsd } = usePrice();
  const up = changePct >= 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-base font-bold tracking-tight">
            onions<span className="text-onion">.lol</span>
          </Link>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-onion/15 text-sm">🧅</span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold leading-none">ONION</span>
                <span className="text-[10px] leading-none text-muted">Base Sepolia</span>
              </div>
            </div>
            <Stat label="Price" value={fmtPrice(price)} />
            <Stat
              label="Today"
              value={`${up ? "+" : ""}${changePct.toFixed(2)}%`}
              accent={up ? "text-up" : "text-down"}
            />
          </div>
        </div>
        <ConnectButton />
      </header>

      <main className="grid flex-1 gap-3 p-3 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          <section className="h-[460px] rounded-xl border border-border bg-surface p-2">
            <PriceChart anchorUsd={anchorUsd} />
          </section>
          <section className="min-h-[200px] rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold">Positions</h2>
            <PositionsList />
          </section>
        </div>
        <aside className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Trade</h2>
          <TradePanel />
        </aside>
      </main>

      <footer className="border-t border-border px-5 py-2.5 text-center text-[11px] text-muted">
        Intraday prices are simulated for the demo; contracts settle against
        official USDA onion prices.
      </footer>
    </div>
  );
}
