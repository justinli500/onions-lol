"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { usePrice } from "@/lib/usePrice";
import { fmtPrice } from "@/lib/format";
import { Nav } from "@/components/trade/Nav";
import { Marquee } from "@/components/trade/Marquee";

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
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/** A vintage broadsheet rule with a centered stamp label overlapping the line. */
function Rule({ label }: { label: string }) {
  return (
    <div className="relative my-10 flex items-center justify-center">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-red/25" />
      <span className="relative bg-paper px-3 font-display text-[11px] uppercase tracking-[0.22em] text-red/70">
        {label}
      </span>
    </div>
  );
}

/**
 * Full-bleed hero backdrop. Plays /hero.mp4 muted+looped, duotone-tinted toward
 * the vintage palette at low opacity, with a paper wash so the headline stays
 * crisp. If no video file exists, the <video> renders nothing and the cream
 * background shows through — a clean, graceful fallback.
 */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/*
        object-cover fills the wide banner and crops the overflow (no letterboxing).
        object-[50%_82%] biases the crop toward the bottom of the frame so the visible
        slice favors the subject (onion baskets / table) and pushes the top of the clip
        — where a top-right watermark lives — out of view. scale-[1.06] zooms slightly
        past any baked-in pillarbox bars. Tune the "82%" up/down to reframe.
      */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="h-full w-full scale-[1.06] object-cover object-[50%_82%] opacity-[0.32] mix-blend-multiply [filter:sepia(0.45)_saturate(1.35)_contrast(1.03)] motion-reduce:hidden"
      >
        <source src="/hero.mp4" type="video/mp4" />
        <source src="/hero.webm" type="video/webm" />
      </video>
      {/* watermark mask: dissolve the top-right corner (where logos sit) back into paper */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(220px 160px at top right, var(--paper) 0%, rgba(245,234,208,0.75) 45%, transparent 78%)",
        }}
      />
      {/* paper wash: keeps copy legible up top, melts into the story section below */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(245,234,208,0.40) 0%, rgba(245,234,208,0.12) 42%, rgba(245,234,208,0.85) 86%, var(--paper) 100%)",
        }}
      />
    </div>
  );
}

function LivePriceChip() {
  const { price, changePct } = usePrice();
  const up = changePct >= 0;
  return (
    <div className="tabular inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-red/85 bg-card px-3.5 py-1.5 text-[13px] font-semibold">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red" />
      </span>
      <span className="font-display text-[10px] uppercase tracking-[0.1em] text-red">
        Onion
      </span>
      <span className="text-ink">{fmtPrice(price)}</span>
      <span className={up ? "text-green" : "text-red"}>
        {up ? "▲ +" : "▼ "}
        {changePct.toFixed(2)}%
      </span>
    </div>
  );
}

const STORY: { year?: string; node: React.ReactNode }[] = [
  {
    year: "1955",
    node: (
      <>
        Two traders — Vincent Kosuga and Sam Siegel — cornered the entire
        Chicago onion market, hoarding so many onions they controlled{" "}
        <span className="font-bold text-red">98%</span> of every bulb in the
        city.
      </>
    ),
  },
  {
    node: (
      <>
        Then they flooded the market and crashed it so hard that a 50-pound bag
        of onions sold for less than the empty sack that held it. Growers were
        wiped out.
      </>
    ),
  },
  {
    year: "1958",
    node: (
      <>
        The fallout was so severe that Congress passed the{" "}
        <span className="font-bold text-ink">Onion Futures Act of 1958</span>.
        Eisenhower signed it. To this day, onions remain the only commodity in
        America you legally cannot trade as a future.
      </>
    ),
  },
];

export function Landing() {
  return (
    <>
      <div className="mx-auto max-w-[1320px] px-[26px] pt-[18px]">
        <Nav active="about" />
      </div>
      {/* full-bleed ticker — spans the whole viewport, edge to edge */}
      <div className="my-3.5">
        <Marquee fullBleed />
      </div>

      {/* ─────────────  MASTHEAD — full-bleed video backdrop  ───────────── */}
      <section className="relative overflow-hidden text-center">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto max-w-[1320px] px-[26px] pb-14 pt-8 md:pt-12">
          <motion.span
            initial={{ opacity: 0, y: 10, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.5, ease }}
            className="inline-block rounded-[6px] border-2 border-red/80 px-3.5 py-1.5 font-display text-[10.5px] uppercase tracking-[0.16em] text-red"
          >
            Docket No. 1958 · U.S. Onion Futures Act
          </motion.span>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease }}
            className="mt-7 -mb-1 inline-block -rotate-2 font-script text-[34px] leading-none text-red md:text-[40px]"
          >
            the forbidden bulb
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            className="mx-auto max-w-4xl text-balance pb-1 font-display text-[34px] uppercase leading-[0.94] tracking-tight text-ink sm:text-[52px] md:text-[78px]"
          >
            The one future
            <br />
            America <span className="text-red">forbade.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="mx-auto mt-6 max-w-2xl text-balance text-[17px] leading-relaxed text-ink/70 md:text-xl"
          >
            Onion futures are the only commodity contract with a dedicated
            federal ban — illegal since the Onion Futures Act of 1958. Trade
            them here, cash-settled against the real USDA onion price.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease }}
            className="mt-9 flex flex-col items-center gap-5"
          >
            <div className="flex flex-wrap items-center justify-center gap-3">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/trade"
                  className="inline-block rounded-full border-2 border-red bg-red px-7 py-3 text-[15px] font-bold text-paper transition-colors hover:bg-red-br"
                >
                  Start trading
                </Link>
              </motion.div>
              <a
                href="#story"
                className="rounded-full border-2 border-red px-7 py-3 text-[15px] font-bold text-red transition-colors hover:bg-red/[0.08]"
              >
                The story
              </a>
            </div>
            <LivePriceChip />
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-[1320px] px-[26px] pb-[60px]">
        {/* ─────────────  THE STORY  ───────────── */}
        <section id="story" className="mx-auto max-w-3xl scroll-mt-6">
          <Rule label="How onions got banned" />
          <div className="space-y-6">
            {STORY.map((item, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="flex gap-4 md:gap-6">
                  <div className="w-[58px] shrink-0 pt-1 text-right">
                    {item.year && (
                      <span className="font-display text-[15px] tabular text-red">
                        {item.year}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "flex-1 border-l-2 border-red/20 pl-4 text-[18px] leading-relaxed text-ink/80 md:pl-6",
                      i === 0 &&
                        "first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:font-display first-letter:text-[52px] first-letter:leading-[0.8] first-letter:text-red",
                    )}
                  >
                    {item.node}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ─────────────  TWO PRICES  ───────────── */}
        <section className="mx-auto mt-4 max-w-3xl">
          <Rule label="Two prices, honestly separated" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-[14px] border-2 border-red bg-card p-5">
                <div className="font-display text-[11px] uppercase tracking-[0.1em] text-green">
                  Settlement · real
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/75">
                  Dated contracts cash-settle against the USDA New York terminal
                  yellow-onion price.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="h-full rounded-[14px] border-2 border-red bg-card p-5">
                <div className="font-display text-[11px] uppercase tracking-[0.1em] text-mustard-dp">
                  Mark · simulated
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/75">
                  Intraday prices are synthetic for the demo, mean-reverting
                  around the latest real USDA print.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <footer className="mt-16 border-t-2 border-red/15 pt-6 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/45">
          onions.lol · built for ETHGlobal New York 2026 · not financial advice
          (or legal advice)
        </footer>
      </main>
    </>
  );
}
