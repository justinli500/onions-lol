import { cn } from "@/lib/cn";

export function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "default" | "gold" | "green";
}) {
  return (
    <div className="rounded-xl surface-inset px-3 py-1.5">
      <div className="text-[9.5px] uppercase tracking-[0.08em] font-extrabold text-red/75">
        {label}
      </div>
      <div
        className={cn(
          "tabular text-[15px] font-extrabold",
          tone === "gold" && "text-mustard-dp",
          tone === "green" && "text-green",
          (!tone || tone === "default") && "text-ink",
        )}
      >
        {value}
      </div>
    </div>
  );
}
