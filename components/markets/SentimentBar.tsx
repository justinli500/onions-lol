/** Long/short open-interest split, as a two-segment bar with labels. */
export function SentimentBar({ longPct }: { longPct: number }) {
  const long = Math.round(longPct * 1000) / 10;
  const short = Math.round((1 - longPct) * 1000) / 10;
  return (
    <div className="w-full max-w-[200px]">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-paper">
        <div className="h-full bg-green" style={{ width: `${long}%` }} />
        <div className="h-full bg-red-br" style={{ width: `${short}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink/60">
        <span>Long <b className="text-green">{long}%</b></span>
        <span>Short <b className="text-red">{short}%</b></span>
      </div>
    </div>
  );
}
