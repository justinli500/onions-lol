"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { SPRING_SNAPPY } from "@/lib/animations";
import { ConnectButton } from "@/components/ConnectButton";

const TABS = [
  { href: "/trade", label: "Trade" },
  { href: "/markets", label: "Markets" },
  { href: "/", label: "About" },
];

const tab =
  "relative isolate font-bold text-[13px] px-3 py-1.5 rounded-full transition-colors sm:px-4 sm:py-2";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();
  return (
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
          const on = isActive(pathname, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={cn(tab, on ? "text-paper" : "text-red hover:bg-red/[0.08]")}
            >
              {on && (
                // Shared layout id: the red pill morphs (slides + resizes) between
                // tabs of different widths as the route changes, since the Nav is
                // one persistent instance in the root layout.
                <motion.span
                  layoutId="nav-pill"
                  transition={SPRING_SNAPPY}
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
