import Link from "next/link";
import { Nav } from "@/components/trade/Nav";
import { Marquee } from "@/components/trade/Marquee";
import { Sparkline } from "@/components/markets/Sparkline";
import { SentimentBar } from "@/components/markets/SentimentBar";
import { MARKETS, marketSeries, type Market } from "@/lib/markets";
import { fmtPrice } from "@/lib/format";

export const metadata = {
  title: "Markets — onions.lol",
  description: "Every onion the market forgot to ban. Trade dated futures on Base Sepolia.",
};

function compactUsd(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toLocaleString("en-US")}`;
}

function MarketRow({ m }: { m: Market }) {
  const up = m.changePct >= 0;
  return (
    <div className="flex items-center gap-4 border-t border-line border-dotted px-2 py-4 transition-colors hover:bg-red/[0.03]">
      {/* Market */}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-ink">{m.name}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink/55">
          <span className="inline-flex items-center gap-1 font-bold text-green">
            <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
            LIVE
          </span>
          <span>·</span>
          <span>{m.origin}</span>
        </div>
      </div>

      {/* Open interest */}
      <div className="hidden w-24 text-right tabular text-sm text-ink/80 lg:block">
        {compactUsd(m.openInterest)}
      </div>

      {/* Sentiment */}
      <div className="hidden w-[200px] lg:block">
        <SentimentBar longPct={m.longPct} />
      </div>

      {/* Trend */}
      <div className="hidden w-[120px] md:block">
        <Sparkline data={marketSeries(m)} up={up} />
      </div>

      {/* Price */}
      <div className="w-24 text-right">
        <div className={`flex items-center justify-end gap-1 text-sm font-bold tabular ${up ? "text-green" : "text-red"}`}>
          <span>{up ? "▲" : "▼"}</span>
          <span>{up ? "+" : ""}{m.changePct.toFixed(2)}%</span>
        </div>
        <div className="tabular text-xs text-ink/70">{fmtPrice(m.price)}</div>
      </div>

      {/* Trade */}
      <div className="w-20 text-right">
        <Link
          href={`/trade?m=${m.id}`}
          className="inline-block rounded-full border-2 border-red px-3.5 py-1.5 text-xs font-bold text-red transition hover:bg-red hover:text-paper active:scale-[0.97]"
        >
          Trade
        </Link>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <div className="w-full max-w-[1320px] mx-auto px-[26px] pt-[18px] pb-[50px]">
      <Nav active="markets" />
      <Marquee />

      <div className="mt-2 flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl text-ink tracking-tight">
          {MARKETS.length} Markets
        </h1>
        <div className="flex gap-2">
          <span className="rounded-full surface-inset px-3.5 py-2 text-xs font-bold text-red">
            Open Interest ▾
          </span>
          <span className="hidden rounded-full surface-inset px-3.5 py-2 text-xs font-bold text-red sm:inline">
            3 Months ▾
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl surface-card p-3 sm:p-5">
        {/* Column headers */}
        <div className="flex items-center gap-4 px-2 pb-2 text-[11px] uppercase tracking-[0.06em] text-red">
          <div className="min-w-0 flex-1">Market</div>
          <div className="hidden w-24 text-right lg:block">Open Interest</div>
          <div className="hidden w-[200px] lg:block">Sentiment</div>
          <div className="hidden w-[120px] md:block">Trend</div>
          <div className="w-24 text-right">Price</div>
          <div className="w-20" />
        </div>

        {MARKETS.map((m) => (
          <MarketRow key={m.id} m={m} />
        ))}
      </div>

      <p className="mt-4 px-1 text-xs text-ink/45">
        One market settles on-chain against the real USDA index; the rest are demo varieties for the preview.
      </p>
    </div>
  );
}
