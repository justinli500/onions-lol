const ITEMS = [
  "VINTAGE",
  "BANNED IN AMERICA",
  "SINCE 1958",
  "CASH-SETTLED vs USDA",
  "TRADE THE FORBIDDEN BULB",
];

export function Marquee() {
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
    <div className="my-3.5 overflow-hidden rounded-[14px] border-2 border-red bg-red py-2.5">
      <div className="flex w-max marquee-track">
        {run}
        {run}
      </div>
    </div>
  );
}
