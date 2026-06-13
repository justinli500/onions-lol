"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { usePrice } from "@/lib/usePrice";
import { fmtPrice } from "@/lib/format";

const ease = [0.16, 1, 0.3, 1] as const;

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

function LivePriceChip() {
  const { price, changePct } = usePrice();
  const up = changePct >= 0;
  return (
    <div className="tabular inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-up" />
      </span>
      <span className="text-muted">ONION</span>
      <span className="font-semibold">{fmtPrice(price)}</span>
      <span className={up ? "text-up" : "text-down"}>
        {up ? "+" : ""}
        {changePct.toFixed(2)}%
      </span>
    </div>
  );
}

export function Landing() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* ambient onion glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[480px] w-[820px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(201,162,39,0.5), transparent)" }}
      />

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <span className="text-lg font-bold tracking-tight">
          onions<span className="text-onion">.lol</span>
        </span>
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
          <Link
            href="/trade"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black"
          >
            Launch app
          </Link>
        </motion.div>
      </nav>

      <section className="relative z-10 mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-6 rounded-full border border-onion/40 bg-onion/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-onion"
        >
          Banned in America since 1958
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease }}
          className="text-balance text-5xl font-extrabold leading-tight tracking-tight md:text-7xl"
        >
          The one future the U.S. government{" "}
          <span className="text-onion">forbids.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18, ease }}
          className="mt-6 max-w-2xl text-balance text-lg text-muted md:text-xl"
        >
          Onion futures are the only commodity contract with a dedicated federal
          ban — illegal since the Onion Futures Act of 1958. Trade them here,
          cash-settled against the real USDA onion price.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28, ease }}
          className="mt-10 flex flex-col items-center gap-5"
        >
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/trade"
                className="inline-block rounded-xl bg-accent px-7 py-3.5 text-base font-semibold text-black"
              >
                Start trading
              </Link>
            </motion.div>
            <a
              href="#story"
              className="rounded-xl border border-border px-7 py-3.5 text-base font-medium text-foreground transition hover:bg-surface"
            >
              The story
            </a>
          </div>
          <LivePriceChip />
        </motion.div>
      </section>

      <section id="story" className="relative z-10 mx-auto max-w-3xl px-6 py-20 text-left">
        <Reveal>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-onion">
            How onions got banned
          </h2>
        </Reveal>
        <div className="mt-6 space-y-5 text-lg leading-relaxed text-muted">
          <Reveal delay={0.05}>
            <p>
              In 1955, two traders — Vincent Kosuga and Sam Siegel — cornered the
              entire Chicago onion market, hoarding so many onions they controlled
              98% of those in the city.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p>
              Then they flooded the market and crashed it so hard that a 50-pound
              bag of onions sold for less than the empty sack that held it. Growers
              were wiped out.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <p>
              The fallout was so severe that Congress passed the{" "}
              <span className="text-foreground">Onion Futures Act of 1958</span>.
              Eisenhower signed it. To this day, onions remain the only commodity
              in America you legally cannot trade as a future.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative z-10 border-t border-border bg-surface/40 px-6 py-14">
        <Reveal className="mx-auto flex max-w-3xl flex-col gap-3 text-sm text-muted">
          <p className="text-foreground">Two prices, honestly separated:</p>
          <p>
            <span className="text-onion">Settlement (real)</span> — dated
            contracts cash-settle against the USDA New York terminal yellow-onion
            price.
          </p>
          <p>
            <span className="text-onion">Mark (simulated)</span> — intraday
            prices are synthetic for the demo, mean-reverting around the latest
            real USDA print.
          </p>
        </Reveal>
      </section>

      <footer className="relative z-10 px-6 py-8 text-center text-xs text-muted">
        onions.lol · built for ETHGlobal New York 2026 · not financial advice (or
        legal advice)
      </footer>
    </main>
  );
}
