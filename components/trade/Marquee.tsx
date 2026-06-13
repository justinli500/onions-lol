import { cn } from "@/lib/cn";

const ITEMS = [
  "VINTAGE",
  "BANNED IN AMERICA",
  "SINCE 1958",
  "CASH-SETTLED vs USDA",
  "TRADE THE FORBIDDEN BULB",
];

/** `fullBleed` drops the rounded card framing for an edge-to-edge band. */
export function Marquee({ fullBleed = false }: { fullBleed?: boolean }) {
  const run = (
    <div className="flex shrink-0">
      {[...ITEMS, ...ITEMS].map((t, i) => (
        <span
          key={i}
          className="font-display text-sm tracking-[0.06em] text-paper px-[18px]"
        >
          {t} <span className="text-mustard">·</span>
        </span>
      ))}
    </div>
  );
  return (
    <div
      className={cn(
        "relative h-10 overflow-hidden bg-red",
        fullBleed
          ? "border-y-2 border-red"
          : "my-3.5 rounded-[14px] border-2 border-red",
      )}
    >
      {/* track is absolutely positioned so its max-content width can't blow out the page on mobile */}
      <div className="absolute inset-y-0 left-0 flex w-max items-center marquee-track">
        {run}
        {run}
      </div>
    </div>
  );
}
