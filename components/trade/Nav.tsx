"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { ConnectButton } from "@/components/ConnectButton";

const TABS = [
  { href: "/trade", label: "Trade" },
  { href: "/markets", label: "Markets" },
  { href: "/", label: "About" },
];

const tab =
  "relative isolate font-bold text-[13px] px-3 py-1.5 rounded-full transition-colors sm:px-4 sm:py-2";

// Snappy pill morph. Kept short so it lands fast even if the destination page's
// mount briefly competes for the main thread right after the click.
const PILL_SPRING = { type: "spring", duration: 0.26, bounce: 0.12 } as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();
  // Optimistic target: move the pill the instant a tab is clicked, before the
  // destination route commits. Driving it off usePathname alone makes the morph
  // wait on the next page's (sometimes heavy) mount, which drops frames and looks
  // like the animation "skips".
  const [pending, setPending] = useState<string | null>(null);
  // Re-sync to the real route once it catches up (and on back/forward), using the
  // render-phase reset pattern so we don't setState inside an effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setPending(null);
  }
  const current = pending ?? pathname;

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
      <div className="order-3 flex w-full justify-center gap-1 sm:order-2 sm:w-auto">
        {TABS.map((t) => {
          const on = isActive(current, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              onClick={() => setPending(t.href)}
              aria-current={on ? "page" : undefined}
              className={cn(tab, on ? "text-paper" : "text-red hover:bg-red/[0.08]")}
            >
              {on && (
                // Shared layout id: the red pill morphs (slides + resizes) between
                // tabs of different widths as the route changes, since the Nav is
                // one persistent instance in the root layout.
                <motion.span
                  layoutId="nav-pill"
                  transition={PILL_SPRING}
                  className="absolute inset-0 -z-10 rounded-full bg-red"
                />
              )}
              {t.label}
            </Link>
          );
        })}
      </div>
      <div className="order-2 sm:order-3">
        <ConnectButton />
      </div>
    </nav>
  );
}
