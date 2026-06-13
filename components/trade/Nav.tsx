import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";

export function Nav() {
  return (
    <nav className="flex items-center justify-between gap-3.5 rounded-full border-2 border-red bg-card pl-[18px] pr-2.5 py-2">
      <Link href="/" className="flex items-baseline gap-0.5 font-extrabold text-[20px] text-red tracking-tight">
        <span className="text-[19px] mr-[5px]">🧅</span>
        <span className="font-script text-[27px] font-normal mr-px">onions</span>
        <span>.lol</span>
      </Link>
      <div className="flex gap-1">
        <span className="font-bold text-[13px] text-paper bg-red px-4 py-2 rounded-full">Trade</span>
        <Link href="/" className="font-bold text-[13px] text-red px-4 py-2 rounded-full hover:bg-red/[0.08] transition-colors">About</Link>
      </div>
      <ConnectButton />
    </nav>
  );
}
