"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ConnectButton } from "@/components/ConnectButton";

const TABS = [
  { href: "/trade", label: "Trade" },
  { href: "/markets", label: "Markets" },
  { href: "/", label: "About" },
];

/** Index of the active tab, or -1 for an unknown route (pill hidden). */
function activeIndex(pathname: string) {
  if (pathname.startsWith("/trade")) return 0;
  if (pathname.startsWith("/markets")) return 1;
  if (pathname === "/") return 2;
  return -1;
}

export function Nav() {
  const pathname = usePathname();
  // Optimistic target so the pill moves the instant a tab is clicked, before the
  // destination route commits.
  const [pending, setPending] = useState<number | null>(null);
  // Re-sync to the real route when it catches up / on back-forward (render-phase
  // reset pattern — no setState in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setPending(null);
  }
  const idx = pending ?? activeIndex(pathname);

  return (
    // mobile: two rows (logo + wallet on top, tabs centered below) so 3 tabs never
    // overflow narrow phones; sm+: single row. order utilities re-sequence the rows.
    <nav className="flex flex-wrap items-center justify-between gap-2 rounded-[20px] surface-card px-2.5 py-2 sm:flex-nowrap sm:gap-3.5 sm:rounded-full sm:pl-[18px] sm:pr-2.5">
      <Link
        href="/"
        className="order-1 flex items-baseline gap-0.5 font-extrabold text-[17px] text-red tracking-tight sm:text-[20px]"
      >
        <span className="text-base mr-0.5 sm:mr-[5px] sm:text-[19px]">🧅</span>
        <span className="font-script text-[21px] font-normal mr-px sm:text-[27px]">onions</span>
        <span>.lol</span>
      </Link>

      <div className="order-3 flex w-full justify-center sm:order-2 sm:w-auto">
        <div className="relative flex">
          {/*
            The pill slides via translateX only — a compositor-driven CSS transition,
            so it keeps animating smoothly even while a heavy destination page is
            mounting and blocking the main thread (Framer's rAF spring would freeze
            mid-slide there). Equal-width tabs keep it a pure translate (no width
            morph, so the rounded ends never distort). translateX(idx * 100%) ==
            idx tab-widths since the pill is exactly one tab wide.
          */}
          {idx >= 0 && (
            <span
              aria-hidden
              className="absolute left-0 top-0 h-full w-[80px] rounded-full bg-red transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform sm:w-[92px]"
              style={{ transform: `translateX(${idx * 100}%)` }}
            />
          )}
          {TABS.map((t, i) => {
            const on = i === idx;
            return (
              <Link
                key={t.href}
                href={t.href}
                onClick={() => setPending(i)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative z-10 grid h-8 w-[80px] place-items-center rounded-full text-[13px] font-bold transition-colors duration-150 sm:h-9 sm:w-[92px]",
                  on ? "text-paper" : "text-red hover:text-red/70",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="order-2 sm:order-3">
        <ConnectButton />
      </div>
    </nav>
  );
}
