import Link from "next/link";
import { cn } from "@/lib/cn";
import { ConnectButton } from "@/components/ConnectButton";

const tab = "font-bold text-[13px] px-3 py-1.5 rounded-full transition-colors sm:px-4 sm:py-2";
const active = "text-paper bg-red";
const idle = "text-red hover:bg-red/[0.08]";

export function Nav({ active: activeTab = "trade" }: { active?: "trade" | "markets" | "about" }) {
  return (
    // mobile: two rows (logo + wallet on top, tabs centered below) so 3 tabs never
    // overflow narrow phones; sm+: single row. order utilities re-sequence the rows.
    <nav className="flex flex-wrap items-center justify-between gap-2 rounded-[20px] surface-card px-2.5 py-2 sm:flex-nowrap sm:gap-3.5 sm:rounded-full sm:pl-[18px] sm:pr-2.5">
      <Link href="/" className="order-1 flex items-baseline gap-0.5 font-extrabold text-[17px] text-red tracking-tight sm:text-[20px]">
        <span className="text-base mr-0.5 sm:mr-[5px] sm:text-[19px]">🧅</span>
        <span className="font-script text-[21px] font-normal mr-px sm:text-[27px]">onions</span>
        <span>.lol</span>
      </Link>
      <div className="order-3 flex w-full justify-center gap-1 sm:order-2 sm:w-auto">
        <Link href="/trade" className={cn(tab, activeTab === "trade" ? active : idle)}>Trade</Link>
        <Link href="/markets" className={cn(tab, activeTab === "markets" ? active : idle)}>Markets</Link>
        <Link href="/" className={cn(tab, activeTab === "about" ? active : idle)}>About</Link>
      </div>
      <div className="order-2 sm:order-3">
        <ConnectButton />
      </div>
    </nav>
  );
}
