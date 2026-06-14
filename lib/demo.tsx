"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Frontend-only DEMO MODE. When NEXT_PUBLIC_DEMO_MODE=1, the trade surface
 * bypasses Privy login + the Blink/Vault deposit and runs on mocked, in-memory
 * collateral and positions so the full trading UI is interactive without any
 * deployed backend. Entirely isolated — remove the flag and the demo files to
 * revert to the real contract paths.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

export const DEMO_ADDRESS = "0xDEMO0000000000000000000000000000000beef";

export interface DemoPosition {
  id: number;
  side: 0 | 1; // 0 = long, 1 = short
  margin: number;
  lev: number;
  entry: number; // mark price at open
  openedAt: number; // ms
  expiry: number; // ms
}

interface DemoCtx {
  collateral: number;
  positions: DemoPosition[];
  deposit: (amount: number) => void;
  openPosition: (p: Omit<DemoPosition, "id" | "openedAt">) => void;
  closePosition: (id: number, settledPnl: number) => void;
}

const Ctx = createContext<DemoCtx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [collateral, setCollateral] = useState(1000);
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [seq, setSeq] = useState(1);

  const value = useMemo<DemoCtx>(
    () => ({
      collateral,
      positions,
      deposit: (amount) => setCollateral((c) => c + amount),
      openPosition: (p) => {
        setPositions((ps) => [
          ...ps,
          { ...p, id: seq, openedAt: Date.now() },
        ]);
        setSeq((s) => s + 1);
        setCollateral((c) => c - p.margin);
      },
      closePosition: (id, settledPnl) => {
        setPositions((ps) => {
          const pos = ps.find((x) => x.id === id);
          if (pos) setCollateral((c) => c + pos.margin + settledPnl);
          return ps.filter((x) => x.id !== id);
        });
      },
    }),
    [collateral, positions, seq],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo(): DemoCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemo must be used within <DemoProvider>");
  return ctx;
}

/** PnL of a position at a given mark, mirroring the contract: notional·(p−entry)/entry, capped ±margin. */
export function demoPnl(pos: DemoPosition, price: number): number {
  const notional = pos.margin * pos.lev;
  const raw = (notional * (price - pos.entry)) / pos.entry;
  const signed = pos.side === 0 ? raw : -raw;
  return Math.max(-pos.margin, Math.min(pos.margin, signed));
}
