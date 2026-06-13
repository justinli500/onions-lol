import Link from "next/link";
import { cn } from "@/lib/cn";
import { ConnectButton } from "@/components/ConnectButton";

const tab = "font-bold text-[13px] px-2 py-1.5 rounded-full transition-colors sm:px-4 sm:py-2";
const active = "text-paper bg-red";
const idle = "text-red hover:bg-red/[0.08]";

export function Nav({ active: activeTab = "trade" }: { active?: "trade" | "markets" | "about" }) {
  return (
    <nav className="flex items-center justify-between gap-1.5 rounded-full border-2 border-red bg-card pl-2.5 pr-1.5 py-2 sm:gap-3.5 sm:pl-[18px] sm:pr-2.5">
      <Link href="/" className="flex items-baseline gap-0.5 font-extrabold text-[15px] text-red tracking-tight sm:text-[20px]">
        <span className="text-sm mr-0.5 sm:mr-[5px] sm:text-[19px]">🧅</span>
        <span className="font-script text-[19px] font-normal mr-px sm:text-[27px]">onions</span>
        <span>.lol</span>
      </Link>
      <div className="flex gap-1">
        <Link href="/trade" className={cn(tab, activeTab === "trade" ? active : idle)}>Trade</Link>
        <Link href="/markets" className={cn(tab, activeTab === "markets" ? active : idle)}>Markets</Link>
        <Link href="/" className={cn(tab, activeTab === "about" ? active : idle)}>About</Link>
      </div>
      <ConnectButton />
    </nav>
  );
}
