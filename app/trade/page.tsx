"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

// Wallet UI is client-only: it reads Privy state and must not run during SSG.
const ConnectButton = dynamic(
  () => import("@/components/ConnectButton").then((m) => m.ConnectButton),
  { ssr: false },
);

export default function TradePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <Link href="/" className="text-base font-bold tracking-tight">
          onions<span className="text-onion">.lol</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-md border border-border px-2.5 py-1 text-xs text-muted sm:block">
            ONION · Base Sepolia
          </span>
          <ConnectButton />
        </div>
      </header>

      <main className="grid flex-1 gap-3 p-3 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          <section className="min-h-[420px] rounded-xl border border-border bg-surface p-4">
            <p className="text-sm text-muted">Chart — coming next</p>
          </section>
          <section className="min-h-[200px] rounded-xl border border-border bg-surface p-4">
            <p className="text-sm text-muted">Positions — coming next</p>
          </section>
        </div>
        <aside className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Trade panel — coming next</p>
        </aside>
      </main>
    </div>
  );
}
