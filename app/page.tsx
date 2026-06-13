import Link from "next/link";

export default function Landing() {
  return (
    <main className="flex flex-1 flex-col">
      {/* nav */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-10">
        <span className="text-lg font-bold tracking-tight">
          onions<span className="text-onion">.lol</span>
        </span>
        <Link
          href="/trade"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Launch app
        </Link>
      </nav>

      {/* hero */}
      <section className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <span className="mb-6 rounded-full border border-onion/40 bg-onion/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-onion">
          Banned in America since 1958
        </span>
        <h1 className="text-balance text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
          The one future the U.S. government{" "}
          <span className="text-onion">forbids.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-lg text-muted md:text-xl">
          Onion futures are the only commodity contract with a dedicated federal
          ban — illegal since the Onion Futures Act of 1958. Trade them here,
          cash-settled against the real USDA onion price.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/trade"
            className="rounded-xl bg-accent px-7 py-3.5 text-base font-semibold text-black transition hover:brightness-110 active:scale-95"
          >
            Start trading
          </Link>
          <a
            href="#story"
            className="rounded-xl border border-border px-7 py-3.5 text-base font-medium text-foreground transition hover:bg-surface"
          >
            The story
          </a>
        </div>
      </section>

      {/* story */}
      <section id="story" className="mx-auto max-w-3xl px-6 py-20 text-left">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-onion">
          How onions got banned
        </h2>
        <div className="mt-6 space-y-5 text-lg leading-relaxed text-muted">
          <p>
            In 1955, two traders — Vincent Kosuga and Sam Siegel — cornered the
            entire Chicago onion market, hoarding so many onions they controlled
            98% of those in the city.
          </p>
          <p>
            Then they flooded the market and crashed it so hard that a 50-pound
            bag of onions sold for less than the empty sack that held it. Growers
            were wiped out.
          </p>
          <p>
            The fallout was so severe that Congress passed the{" "}
            <span className="text-foreground">Onion Futures Act of 1958</span>.
            Eisenhower signed it. To this day, onions remain the only commodity
            in America you legally cannot trade as a future.
          </p>
        </div>
      </section>

      {/* honesty note */}
      <section className="border-t border-border bg-surface/40 px-6 py-14">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 text-sm text-muted">
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
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-xs text-muted">
        onions.lol · built for ETHGlobal New York 2026 · not financial advice (or
        legal advice)
      </footer>
    </main>
  );
}
