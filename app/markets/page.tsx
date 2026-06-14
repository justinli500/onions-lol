import { Marquee } from "@/components/trade/Marquee";
import { FeaturedMarket } from "@/components/markets/FeaturedMarket";

export const metadata = {
  title: "Markets — onions.lol",
  description: "The one onion futures market America forgot to keep banned. Cash-settled vs the USDA index.",
};

export default function MarketsPage() {
  return (
    <div className="w-full max-w-[920px] mx-auto px-[26px] pb-[50px]">
      <Marquee />

      <div className="mt-2">
        <h1 className="font-display text-3xl text-ink tracking-tight">The Index</h1>
        <p className="mt-1 max-w-prose text-sm text-pretty text-ink/55">
          One market trades live today — the yellow-onion index, cash-settled against the real USDA
          price. More varieties when the ban lifts.
        </p>
      </div>

      <div className="mt-5">
        <FeaturedMarket />
      </div>
    </div>
  );
}
