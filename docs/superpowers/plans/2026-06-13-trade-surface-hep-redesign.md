# Trade Surface — HEP Vintage Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the `/trade` surface into the approved HEP vintage aesthetic (cream/tomato/mustard, bold + script type, pill nav, marquee, order-ticket panel) with a live Line / Candles / 🧅 Onions chart toggle.

**Architecture:** Keep `lightweight-charts` (already wired to the deterministic mark via `@shared/mark`) for the Line (AreaSeries) and Candles (CandlestickSeries) modes; add a v5 custom series for the Onion-leek mode. Presentational components are extracted under `components/trade/`. Design tokens live in `app/globals.css`; fonts via `next/font/google`. **Contract/transaction logic in `TradePanel`/`PositionsList` is reskinned only — never changed.**

**Tech Stack:** Next 16 (App Router, React 19), Tailwind v4, lightweight-charts 5.2, Framer Motion 12 (`motion`), lucide-react, clsx + tailwind-merge. Pure-logic tests via Vitest.

**Design source of truth:** the approved prototype at `docs/superpowers/prototypes/2026-06-13-trade-hep.html`. Spec: `docs/superpowers/specs/2026-06-13-trade-surface-hep-redesign-design.md`.

**Scope guardrail (every task):** edit only frontend files. NEVER touch `contracts/`, `oracle/`, `shared/`, `abi/`, `app/api/`. `lib/usePrice`, `lib/useExchange`, `lib/contracts`, `@shared/*` are imported read-only.

---

## File Structure

Create:
- `lib/cn.ts` — `clsx` + `tailwind-merge` class merger.
- `lib/chartWindow.ts` — pure timeframe → `{ fromMs, toMs, intervalMs }` mapping.
- `lib/leek.ts` — pure leek geometry: OHLC bar + y-converter → SVG/canvas segment coords.
- `components/trade/onionSeries.ts` — lightweight-charts v5 custom series drawing leeks (uses `lib/leek`).
- `components/trade/ChartToolbar.tsx` — timeframe pills + mode segmented toggle (morphing indicator).
- `components/trade/Marquee.tsx` — scrolling ticker band.
- `components/trade/Nav.tsx` — pill nav (Trade/About + ConnectButton).
- `components/trade/StatChip.tsx` — stamp stat chip.
- `components/trade/PriceHeader.tsx` — live price, script label, change, stat chips.
- `lib/chartWindow.test.ts`, `lib/leek.test.ts` — Vitest unit tests.

Modify:
- `app/globals.css` — HEP tokens + helpers.
- `app/layout.tsx` — register Archivo / Archivo Black / Yellowtail.
- `components/PriceChart.tsx` — 3 modes + timeframe windows + reskin.
- `components/TradePanel.tsx` — Order Ticket reskin (logic untouched).
- `components/PositionsList.tsx`, `components/ConnectButton.tsx`, `components/DepositButton.tsx` — vintage reskin.
- `app/trade/page.tsx` — new layout assembly.
- `package.json` — add `vitest`, `test` + `typecheck` scripts.

---

## Task 1: Install deps + dev tooling

**Files:** Modify `package.json`.

- [ ] **Step 1: Install existing deps** (node_modules is absent)

Run: `npm install`
Expected: installs cleanly, `node_modules/` present.

- [ ] **Step 2: Add Vitest + scripts**

Run: `npm install -D vitest`
Then edit `package.json` `scripts` to add:

```json
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
```

- [ ] **Step 3: Verify tooling**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0 (baseline green before changes).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(web): add vitest + typecheck script"
```

---

## Task 2: Design tokens + fonts

**Files:** Modify `app/globals.css`, `app/layout.tsx`.

- [ ] **Step 1: Replace tokens in `app/globals.css`**

Replace the `:root` and `@theme inline` blocks (keep `@import "tailwindcss";` at top). Light theme now (cream paper), not dark:

```css
@import "tailwindcss";

:root {
  --paper: #f5ead0;
  --paper-2: #efe1bd;
  --card: #fbf3df;
  --red: #a11e21;
  --red-br: #d8392b;     /* down state / bright accent */
  --mustard: #f0b42a;
  --mustard-dp: #b9791a; /* darkened for AA text on cream — verify in Task 15 */
  --ink: #2a100c;
  --green: #2f8f4e;
  --line: rgba(161, 30, 33, 0.14);
  --bd: rgba(161, 30, 33, 0.85);
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}

@theme inline {
  --color-paper: var(--paper);
  --color-paper-2: var(--paper-2);
  --color-card: var(--card);
  --color-red: var(--red);
  --color-red-br: var(--red-br);
  --color-mustard: var(--mustard);
  --color-mustard-dp: var(--mustard-dp);
  --color-ink: var(--ink);
  --color-green: var(--green);
  --font-sans: var(--font-archivo);
  --font-display: var(--font-archivo-black);
  --font-script: var(--font-yellowtail);
}

html { color-scheme: light; }

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans), system-ui, sans-serif;
  background-image:
    radial-gradient(circle at 12% 8%, rgba(240,180,42,.18), transparent 30%),
    radial-gradient(circle at 92% 84%, rgba(161,30,33,.07), transparent 35%);
}

.tabular { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
.font-script { font-family: var(--font-script), cursive; }
.font-display { font-family: var(--font-display), sans-serif; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; }
}
```

- [ ] **Step 2: Register fonts in `app/layout.tsx`**

Replace the Geist imports/usage:

```tsx
import { Archivo, Archivo_Black, Yellowtail } from "next/font/google";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["500","600","700","800"] });
const archivoBlack = Archivo_Black({ variable: "--font-archivo-black", subsets: ["latin"], weight: "400" });
const yellowtail = Yellowtail({ variable: "--font-yellowtail", subsets: ["latin"], weight: "400" });
```

And update the `<html className=...>` to:

```tsx
className={`${archivo.variable} ${archivoBlack.variable} ${yellowtail.variable} h-full antialiased`}
```

Leave `<Providers>` and metadata as-is.

- [ ] **Step 3: Verify**

Run: `npm run dev` then load `http://localhost:3000/trade` in the browser tool; confirm cream background renders and no font 404s in console. (Layout will look unstyled until later tasks — that's fine.)
Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat(web): HEP vintage design tokens + fonts"
```

---

## Task 3: `cn()` class helper

**Files:** Create `lib/cn.ts`.

- [ ] **Step 1: Implement**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, de-duplicating Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Verify + commit**

Run: `npm run typecheck`

```bash
git add lib/cn.ts
git commit -m "chore(web): add cn() class merge helper"
```

---

## Task 4: `chartWindow` — timeframe → window mapping (TDD)

**Files:** Create `lib/chartWindow.ts`, `lib/chartWindow.test.ts`.

Maps a timeframe id to the `buildCandles(anchorUsd, fromMs, toMs, intervalMs)` window. ~150 candles per view.

- [ ] **Step 1: Write the failing test** (`lib/chartWindow.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { TIMEFRAMES, windowFor } from "./chartWindow";

describe("windowFor", () => {
  const now = 1_700_000_000_000;
  it("exposes the five timeframes in order", () => {
    expect(TIMEFRAMES.map((t) => t.id)).toEqual(["15m", "1H", "4H", "1D", "1W"]);
  });
  it("1D spans 24h ending at now, aligned to the interval", () => {
    const w = windowFor("1D", now);
    expect(w.toMs).toBeGreaterThanOrEqual(now);
    expect(w.toMs - w.fromMs).toBeCloseTo(24 * 3600_000, -3);
    expect(w.fromMs % w.intervalMs).toBe(0);
  });
  it("each timeframe yields 100-200 candles", () => {
    for (const t of TIMEFRAMES) {
      const w = windowFor(t.id, now);
      const n = (w.toMs - w.fromMs) / w.intervalMs;
      expect(n).toBeGreaterThanOrEqual(100);
      expect(n).toBeLessThanOrEqual(200);
    }
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npx vitest run lib/chartWindow.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/chartWindow.ts`**

```ts
export type TimeframeId = "15m" | "1H" | "4H" | "1D" | "1W";

export interface ChartWindow {
  fromMs: number;
  toMs: number;
  intervalMs: number;
}

/** Each timeframe targets ~150 candles: total span / candle count. */
export const TIMEFRAMES: { id: TimeframeId; label: string; spanMs: number; intervalMs: number }[] = [
  { id: "15m", label: "15m", spanMs: 15 * 60_000, intervalMs: 6_000 },        // 150 @ 6s
  { id: "1H",  label: "1H",  spanMs: 60 * 60_000, intervalMs: 24_000 },       // 150 @ 24s
  { id: "4H",  label: "4H",  spanMs: 4 * 3600_000, intervalMs: 96_000 },      // 150 @ 96s
  { id: "1D",  label: "1D",  spanMs: 24 * 3600_000, intervalMs: 576_000 },    // 150 @ 9.6m
  { id: "1W",  label: "1W",  spanMs: 7 * 24 * 3600_000, intervalMs: 4_032_000 }, // 150 @ 67.2m
];

export function windowFor(id: TimeframeId, nowMs: number): ChartWindow {
  const tf = TIMEFRAMES.find((t) => t.id === id) ?? TIMEFRAMES[3];
  const toAligned = Math.ceil(nowMs / tf.intervalMs) * tf.intervalMs;
  return { fromMs: toAligned - tf.spanMs, toMs: toAligned, intervalMs: tf.intervalMs };
}
```

- [ ] **Step 4: Run, verify it passes**

Run: `npx vitest run lib/chartWindow.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/chartWindow.ts lib/chartWindow.test.ts
git commit -m "feat(web): timeframe window mapping for chart"
```

---

## Task 5: `leek` geometry (TDD)

**Files:** Create `lib/leek.ts`, `lib/leek.test.ts`.

Pure geometry: given an OHLC bar, an x-center, a bar width, and a `priceToY` converter, return the coordinates needed to draw a flat leek (bulb ellipse, stalk rect, leaf blades, root wisps) for either canvas or SVG. No drawing here — just math, so it's testable and reused by the custom series.

- [ ] **Step 1: Write the failing test** (`lib/leek.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { leekGeometry } from "./leek";

const bar = { open: 10, high: 14, low: 8, close: 12 }; // up bar
const y = (p: number) => 100 - p; // higher price = smaller y

describe("leekGeometry", () => {
  const g = leekGeometry(bar, 50, 20, y);
  it("is bullish when close >= open", () => {
    expect(g.up).toBe(true);
  });
  it("stalk spans the body (open..close)", () => {
    expect(g.stalk.yTop).toBeCloseTo(y(12)); // close (top of body)
    expect(g.stalk.yBottom).toBeCloseTo(y(10)); // open (bottom of body)
  });
  it("leaves reach the high, roots reach the low", () => {
    expect(g.leaves.every((l) => Math.abs(l.tipY - y(14)) < 0.001)).toBe(true);
    expect(g.roots.every((r) => Math.abs(r.tipY - y(8)) < 0.001)).toBe(true);
    expect(g.leaves).toHaveLength(3);
    expect(g.roots).toHaveLength(3);
  });
  it("bulb sits at the body bottom, centered on x", () => {
    expect(g.bulb.cx).toBe(50);
    expect(g.bulb.cy).toBeCloseTo(y(10));
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npx vitest run lib/leek.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/leek.ts`**

```ts
export interface OHLC { open: number; high: number; low: number; close: number; }
export interface Blade { ctrlX: number; ctrlY: number; tipX: number; tipY: number; baseY: number; }
export interface LeekGeometry {
  up: boolean;
  cx: number;
  stalk: { x: number; width: number; yTop: number; yBottom: number };
  bulb: { cx: number; cy: number; rx: number; ry: number };
  leaves: Blade[];
  roots: Blade[];
}

/**
 * Flat-leek geometry for one OHLC bar. `priceToY` maps a price to a y pixel
 * (y grows downward). Bulb + stalk = body (open..close); leaves = upper wick
 * (body top..high); roots = lower wick (body bottom..low).
 */
export function leekGeometry(
  bar: OHLC,
  cx: number,
  width: number,
  priceToY: (p: number) => number,
): LeekGeometry {
  const up = bar.close >= bar.open;
  const half = width / 2;
  const yHigh = priceToY(bar.high);
  const yLow = priceToY(bar.low);
  const yTop = priceToY(Math.max(bar.open, bar.close));
  const yBot = priceToY(Math.min(bar.open, bar.close));

  const blades = (baseY: number, tipY: number): Blade[] =>
    [-1, 0, 1].map((k) => ({
      baseY,
      ctrlX: cx + k * half * 0.5,
      ctrlY: (baseY + tipY) / 2,
      tipX: cx + k * half * 1.15,
      tipY,
    }));

  return {
    up,
    cx,
    stalk: { x: cx - half * 0.6, width: width * 0.6, yTop, yBottom: yBot },
    bulb: { cx, cy: yBot, rx: half * 0.8, ry: half * 0.62 },
    leaves: blades(yTop, yHigh),
    roots: blades(yBot, yLow),
  };
}
```

- [ ] **Step 4: Run, verify it passes**

Run: `npx vitest run lib/leek.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/leek.ts lib/leek.test.ts
git commit -m "feat(web): pure flat-leek geometry helper"
```

---

## Task 6: Onion custom series for lightweight-charts

**Files:** Create `components/trade/onionSeries.ts`.

Implements `ICustomSeriesPaneView<Time, OnionData>` drawing each bar as a leek via `leekGeometry`. Colors: up leaves `--green` `#2f8f4e`, down leaves `--red-br` `#d8392b`, bulb `#eccb6a`, ink outline `rgba(42,16,12,.4)` (so up/down isn't color-only — accessibility).

- [ ] **Step 1: Implement**

```ts
import type {
  ICustomSeriesPaneView, ICustomSeriesPaneRenderer, PaneRendererCustomData,
  CustomSeriesPricePlotValues, CustomData, PriceToCoordinateConverter, Time,
  CustomSeriesOptions, WhitespaceData,
} from "lightweight-charts";
import { customSeriesDefaultOptions } from "lightweight-charts";
import { leekGeometry } from "@/lib/leek";

export interface OnionData extends CustomData<Time> {
  open: number; high: number; low: number; close: number;
}
export interface OnionSeriesOptions extends CustomSeriesOptions {}

const COLORS = {
  leafUp: "#2f8f4e", leafDown: "#d8392b",
  stalkUp: "#3aa15c", stalkDown: "#cf4654",
  bulb: "#eccb6a", edge: "rgba(42,16,12,0.4)",
};

class OnionRenderer implements ICustomSeriesPaneRenderer {
  private _data: PaneRendererCustomData<Time, OnionData> | null = null;
  update(data: PaneRendererCustomData<Time, OnionData>) { this._data = data; }

  draw(target: { useBitmapCoordinateSpace: (cb: (scope: { context: CanvasRenderingContext2D; horizontalPixelRatio: number; verticalPixelRatio: number }) => void) => void }, priceToCoordinate: PriceToCoordinateConverter) {
    const data = this._data;
    if (!data) return;
    target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr }) => {
      const y = (p: number) => ((priceToCoordinate(p) ?? 0) * vr);
      const width = Math.max(6, data.barSpacing * 0.5) * hr;
      for (const item of data.bars) {
        const bar = item.originalData;
        if (!bar) continue;
        const cx = item.x * hr;
        const g = leekGeometry(bar, cx, width, y);
        const leaf = g.up ? COLORS.leafUp : COLORS.leafDown;
        const stalk = g.up ? COLORS.stalkUp : COLORS.stalkDown;
        // roots
        ctx.strokeStyle = stalk; ctx.lineWidth = 1.1 * hr; ctx.lineCap = "round";
        for (const r of g.roots) { ctx.beginPath(); ctx.moveTo(cx, r.baseY); ctx.quadraticCurveTo(r.ctrlX, r.ctrlY, r.tipX, r.tipY); ctx.stroke(); }
        // stalk
        ctx.fillStyle = stalk; ctx.strokeStyle = COLORS.edge; ctx.lineWidth = 0.5 * hr;
        ctx.beginPath(); ctx.rect(g.stalk.x, g.stalk.yTop, g.stalk.width, Math.max(2, g.stalk.yBottom - g.stalk.yTop)); ctx.fill(); ctx.stroke();
        // bulb
        ctx.fillStyle = COLORS.bulb;
        ctx.beginPath(); ctx.ellipse(g.bulb.cx, g.bulb.cy, g.bulb.rx, g.bulb.ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // leaves
        ctx.strokeStyle = leaf; ctx.lineWidth = 2 * hr;
        for (const l of g.leaves) { ctx.beginPath(); ctx.moveTo(cx, l.baseY); ctx.quadraticCurveTo(l.ctrlX, l.ctrlY, l.tipX, l.tipY); ctx.stroke(); }
      }
    });
  }
}

export class OnionSeries implements ICustomSeriesPaneView<Time, OnionData, OnionSeriesOptions> {
  private _renderer = new OnionRenderer();
  priceValueBuilder(d: OnionData): CustomSeriesPricePlotValues { return [d.low, d.high, d.close]; }
  isWhitespace(d: OnionData | WhitespaceData<Time>): d is WhitespaceData<Time> { return (d as OnionData).close === undefined; }
  renderer(): ICustomSeriesPaneRenderer { return this._renderer; }
  update(data: PaneRendererCustomData<Time, OnionData>) { this._renderer.update(data); }
  defaultOptions(): OnionSeriesOptions { return { ...customSeriesDefaultOptions } as OnionSeriesOptions; }
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: 0 errors. (If lightweight-charts v5 type names differ slightly, align imports to the installed `node_modules/lightweight-charts/dist/typings.d.ts` — do not loosen to `any`.)

- [ ] **Step 3: Commit**

```bash
git add components/trade/onionSeries.ts
git commit -m "feat(web): onion-leek custom series for lightweight-charts"
```

---

## Task 7: Rewrite `PriceChart` — 3 modes + timeframes + reskin

**Files:** Modify `components/PriceChart.tsx`.

New props: `anchorUsd: number`, `mode: "line" | "candles" | "onions"`, `timeframe: TimeframeId`. Build candles with `buildCandles(anchorUsd, win.fromMs, win.toMs, win.intervalMs)` from `windowFor(timeframe, Date.now())`. One chart instance; swap the active series when `mode`/`timeframe` change. Keep the per-second live update on the last candle (as the current file does). Vintage styling: transparent background, `--red` area/line, mustard gradient fill, dashed `--line` grid, red crosshair.

- [ ] **Step 1: Implement** (full file)

```tsx
"use client";

import { useEffect, useRef } from "react";
import {
  createChart, AreaSeries, CandlestickSeries, ColorType, CrosshairMode, LineStyle,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from "lightweight-charts";
import { buildCandles, markAtUsd, type Candle } from "@shared/mark";
import { windowFor, type TimeframeId } from "@/lib/chartWindow";
import { OnionSeries, type OnionData } from "@/components/trade/onionSeries";

type Mode = "line" | "candles" | "onions";

const RED = "#c0271f";
const GREEN = "#2f8f4e";

export function PriceChart({ anchorUsd, mode, timeframe }: { anchorUsd: number; mode: Mode; timeframe: TimeframeId }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const lastRef = useRef<Candle | undefined>(undefined);

  // create chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#7a4a1f", attributionLogo: false },
      grid: { vertLines: { color: "rgba(161,30,33,0.10)", style: LineStyle.Dashed }, horzLines: { color: "rgba(161,30,33,0.10)", style: LineStyle.Dashed } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: RED, width: 1 }, horzLine: { color: RED, width: 1 } },
      rightPriceScale: { borderColor: "rgba(161,30,33,0.25)" },
      timeScale: { borderColor: "rgba(161,30,33,0.25)", timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;
    return () => { chart.remove(); chartRef.current = null; seriesRef.current = null; };
  }, []);

  // (re)build series + data when mode / timeframe / anchor change
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (seriesRef.current) { chart.removeSeries(seriesRef.current); seriesRef.current = null; }

    const win = windowFor(timeframe, Date.now());
    const interval = win.intervalMs;
    const candles = buildCandles(anchorUsd, win.fromMs, win.toMs, interval);
    lastRef.current = candles[candles.length - 1];

    if (mode === "line") {
      const s = chart.addSeries(AreaSeries, {
        lineColor: RED, lineWidth: 3, topColor: "rgba(240,180,42,0.55)", bottomColor: "rgba(240,180,42,0.0)",
        priceLineVisible: false, lastValueVisible: true,
      });
      s.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
      seriesRef.current = s;
    } else if (mode === "candles") {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: GREEN, downColor: RED, borderUpColor: GREEN, borderDownColor: RED, wickUpColor: GREEN, wickDownColor: RED,
      });
      s.setData(candles as Parameters<typeof s.setData>[0]);
      seriesRef.current = s;
    } else {
      const s = chart.addCustomSeries(new OnionSeries(), {});
      s.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close }) as OnionData));
      seriesRef.current = s;
    }
    chart.timeScale().fitContent();

    // live tick: update the current bucket each second
    const id = setInterval(() => {
      const s = seriesRef.current; if (!s) return;
      const now = Date.now();
      const v = markAtUsd(anchorUsd, now);
      const bucket = (Math.floor(now / interval) * interval / 1000) as number;
      const prev = lastRef.current;
      const next: Candle = !prev || bucket > prev.time
        ? { time: bucket, open: v, high: v, low: v, close: v }
        : { time: prev.time, open: prev.open, high: Math.max(prev.high, v), low: Math.min(prev.low, v), close: v };
      lastRef.current = next;
      if (mode === "line") (s as ISeriesApi<"Area">).update({ time: next.time as UTCTimestamp, value: next.close });
      else if (mode === "candles") (s as ISeriesApi<"Candlestick">).update(next as never);
      else (s as ReturnType<IChartApi["addCustomSeries"]>).update({ time: next.time as UTCTimestamp, ...next } as never);
    }, 1000);
    return () => clearInterval(id);
  }, [anchorUsd, mode, timeframe]);

  return <div ref={containerRef} className="h-full w-full" />;
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors. Then dogfood in browser at `/trade` (after Task 14 wires props) — defer visual check to Task 15.

- [ ] **Step 3: Commit**

```bash
git add components/PriceChart.tsx
git commit -m "feat(web): line/candles/onion chart modes + timeframes, vintage skin"
```

---

## Task 8: `ChartToolbar` — timeframe pills + mode toggle

**Files:** Create `components/trade/ChartToolbar.tsx`.

Controlled component. Props: `timeframe`, `onTimeframe`, `mode`, `onMode`. Timeframe pills (mustard active). Mode segmented control with a Framer-Motion `layoutId` sliding indicator (morph, not jump — Benji/Emil). `scale(0.97)` press via `whileTap`.

- [ ] **Step 1: Implement**

```tsx
"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { TIMEFRAMES, type TimeframeId } from "@/lib/chartWindow";

type Mode = "line" | "candles" | "onions";
const MODES: { id: Mode; label: string }[] = [
  { id: "line", label: "Line" }, { id: "candles", label: "Candles" }, { id: "onions", label: "🧅 Onions" },
];

export function ChartToolbar({ timeframe, onTimeframe, mode, onMode }: {
  timeframe: TimeframeId; onTimeframe: (t: TimeframeId) => void; mode: Mode; onMode: (m: Mode) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex gap-0.5">
        {TIMEFRAMES.map((t) => (
          <button key={t.id} onClick={() => onTimeframe(t.id)}
            className={cn("text-xs font-bold px-2.5 py-1.5 rounded-full transition-colors",
              timeframe === t.id ? "bg-mustard text-red" : "text-red/55 hover:text-red")}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative inline-flex rounded-full border-[1.5px] border-red/85 p-[3px] bg-paper">
        {MODES.map((m) => (
          <motion.button key={m.id} onClick={() => onMode(m.id)} whileTap={{ scale: 0.96 }}
            className={cn("relative z-[1] text-xs font-bold px-3 py-1.5 rounded-full transition-colors",
              mode === m.id ? "text-paper" : "text-red")}>
            {mode === m.id && (
              <motion.span layoutId="mode-ind" transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
                className="absolute inset-0 -z-[1] rounded-full bg-red" />
            )}
            {m.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

Run: `npm run typecheck`

```bash
git add components/trade/ChartToolbar.tsx
git commit -m "feat(web): chart toolbar — timeframe pills + mode toggle"
```

---

## Task 9: `Marquee`

**Files:** Create `components/trade/Marquee.tsx`.

Red band, cream/mustard scrolling text, duplicated track for seamless loop, paused under reduced-motion (handled by the global CSS rule; also use a CSS animation so it's off main thread).

- [ ] **Step 1: Implement**

```tsx
const ITEMS = ["VINTAGE", "BANNED IN AMERICA", "SINCE 1958", "CASH-SETTLED vs USDA", "TRADE THE FORBIDDEN BULB"];

export function Marquee() {
  const run = (
    <div className="flex shrink-0">
      {[...ITEMS, ...ITEMS].map((t, i) => (
        <span key={i} className="font-display text-sm tracking-[0.06em] text-paper px-[18px]">
          {t} <span className="text-mustard">·</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="my-3.5 overflow-hidden rounded-[14px] border-2 border-red bg-red py-2.5">
      <div className="flex w-max marquee-track">{run}{run}</div>
    </div>
  );
}
```

Add to `app/globals.css`:

```css
.marquee-track { animation: marquee 24s linear infinite; }
@keyframes marquee { to { transform: translateX(-50%); } }
```

- [ ] **Step 2: Verify + commit**

Run: `npm run typecheck`

```bash
git add components/trade/Marquee.tsx app/globals.css
git commit -m "feat(web): marquee ticker band"
```

---

## Task 10: `Nav` + reskin `ConnectButton`

**Files:** Create `components/trade/Nav.tsx`; Modify `components/ConnectButton.tsx`.

Pill nav: brand wordmark left (`🧅` + script "onions" + ".lol"), center pills (Trade active, About → `/`), `ConnectButton` right. Do not change ConnectButton's Privy/wallet logic — only its className/markup to a vintage pill.

- [ ] **Step 1: Read current ConnectButton** to preserve its logic

Run: `Read components/ConnectButton.tsx`. Keep all hooks/handlers; restyle the rendered button(s) to: `border-2 border-red bg-mustard text-red font-extrabold text-sm px-[18px] py-2 rounded-full active:scale-[0.96] transition-transform`.

- [ ] **Step 2: Implement `Nav.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify + commit**

Run: `npm run typecheck && npm run lint`

```bash
git add components/trade/Nav.tsx components/ConnectButton.tsx
git commit -m "feat(web): pill nav + vintage connect button"
```

---

## Task 11: `StatChip` + `PriceHeader`

**Files:** Create `components/trade/StatChip.tsx`, `components/trade/PriceHeader.tsx`.

`PriceHeader` consumes `usePrice()` and `fmtPrice`. Live price ticks already (usePrice). Shows: LIVE tag, tilted script "the onion index", big `font-display` price, up/down change (arrow rotates via class), provenance subline, and four `StatChip`s: Mark (=price), USDA Settlement (=anchorUsd), 24h Range (computed from current session min/max — keep simple: derive from anchor ±BAND or show a static-from-data range), Settles in (countdown to next expiry — for the header, a simple ticking countdown to end-of-day UTC).

- [ ] **Step 1: Implement `StatChip.tsx`**

```tsx
import { cn } from "@/lib/cn";

export function StatChip({ label, value, tone }: { label: string; value: string; tone?: "default" | "gold" | "green" }) {
  return (
    <div className="rounded-[10px] border-[1.5px] border-red/85 bg-card px-3 py-1.5">
      <div className="text-[9.5px] uppercase tracking-[0.08em] font-extrabold text-red">{label}</div>
      <div className={cn("tabular text-[15px] font-extrabold",
        tone === "gold" && "text-mustard-dp", tone === "green" && "text-green", (!tone || tone === "default") && "text-ink")}>
        {value}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `PriceHeader.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { usePrice } from "@/lib/usePrice";
import { fmtPrice } from "@/lib/format";
import { StatChip } from "@/components/trade/StatChip";

function useSettleCountdown() {
  const [label, setLabel] = useState("--");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      const s = Math.max(0, Math.floor((end - now.getTime()) / 1000));
      setLabel(`${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return label;
}

export function PriceHeader() {
  const { price, changePct, anchorUsd } = usePrice();
  const up = changePct >= 0;
  const settle = useSettleCountdown();
  return (
    <div>
      <span className="inline-flex items-center gap-1.5 font-bold text-xs text-red">
        <span className="h-2 w-2 rounded-full bg-red animate-pulse" /> LIVE · settles vs USDA
      </span>
      <div className="font-script text-[34px] text-red leading-none mt-2 -mb-1 inline-block -rotate-2">the onion index</div>
      <div className="font-display tabular text-[72px] leading-[0.95] text-ink tracking-tight my-0.5">{fmtPrice(price)}</div>
      <div className="flex items-center gap-3">
        <span className={`font-extrabold text-[15px] tabular ${up ? "text-green" : "text-red-br"}`}>
          <span className="inline-block">{up ? "▲" : "▼"}</span> {up ? "+" : ""}{changePct.toFixed(2)}% today
        </span>
        <span className="text-ink/55 text-xs font-semibold">NY Terminal · yellow · 50-lb sack · US No.1</span>
      </div>
      <div className="flex gap-2.5 flex-wrap mt-4">
        <StatChip label="Mark · synthetic" value={fmtPrice(price)} />
        <StatChip label="USDA Settlement" value={fmtPrice(anchorUsd)} tone="gold" />
        <StatChip label="Band" value={`${fmtPrice(anchorUsd * 0.97)}–${fmtPrice(anchorUsd * 1.03)}`} />
        <StatChip label="Settles in" value={settle} tone="green" />
      </div>
    </div>
  );
}
```

Note: "Band" uses the real `BAND` concept (±3%) from the mark, not a fabricated range. If `@shared/constants` exports `BAND`, import and use it instead of the `0.97/1.03` literals.

- [ ] **Step 3: Verify + commit**

Run: `npm run typecheck && npm run lint`

```bash
git add components/trade/StatChip.tsx components/trade/PriceHeader.tsx
git commit -m "feat(web): vintage price header + stat chips"
```

---

## Task 12: `TradePanel` → Order Ticket reskin (logic untouched)

**Files:** Modify `components/TradePanel.tsx`.

Reskin ONLY. Keep `TradePanelInner` state, `useCollateral`, `usePrice`, `useWriteContract`, the `open()` handler, `EXPIRIES`, the deposit-gate branch, and `PRIVY_ENABLED` exactly. Replace the markup/classNames to the order-ticket look (use the prototype `docs/superpowers/prototypes/2026-06-13-trade-hep.html` "ORDER TICKET" block as the visual reference): red ticket header bar (`ORDER TICKET № 1958`), LONG/SHORT stamp toggle (selected long=green, short=red), Margin input, Leverage pill row, Expiry pill row (driven by existing `EXPIRIES`), CTA `OPEN LONG/SHORT`, dotted-leader summary rows (Entry/Notional/Settles vs USDA via existing `Row`). Use `cn()` for conditional classes. Use Framer-Motion `whileTap={{ scale: 0.97 }}` on buttons.

- [ ] **Step 1: Reskin markup**

Translate the existing JSX to the order-ticket structure. Concretely:
- Wrap in `<div className="rounded-[18px] border-[2.5px] border-red bg-card overflow-hidden">`.
- Header: `<div className="bg-red text-paper px-4 py-[11px] flex justify-between items-center"><span className="font-display text-sm tracking-[0.04em]">ORDER TICKET</span><span className="font-bold text-xs text-mustard">№ 1958</span></div>`.
- Body `<div className="p-4">` containing the controls.
- Long/Short: two buttons, `border-2 border-red rounded-[11px] py-[11px] font-display text-sm`; selected long → `bg-green border-green text-white`, selected short → `bg-red text-paper`.
- Margin field, leverage pills, expiry pills: pill rows styled like Task 8 (mustard active indicator). Keep the existing `lev`/`expIdx`/`margin` state and setters.
- CTA button: `bg-green` (long) / `bg-red` (short), `font-display text-base py-[15px] rounded-[12px] text-white`; text `Opening…` while `busy`, else `OPEN LONG`/`OPEN SHORT`.
- Summary: reuse the `Row` helper but restyle to dotted leaders.

Keep `fmtPrice`/`fmtUSD` usages and the `collateral <= 0` deposit gate (render the reskinned `DepositButton`).

- [ ] **Step 2: Verify the logic is byte-identical**

Run: `git diff components/TradePanel.tsx` and confirm no changes to: `writeContractAsync({ address: FUTURES_ADDRESS, abi: futuresAbi, functionName: "open", args: [...] })`, the `expiry` computation, `parseUnits`, the toasts, or the gating conditions.
Run: `npm run typecheck && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add components/TradePanel.tsx
git commit -m "feat(web): reskin trade panel as vintage order ticket (logic unchanged)"
```

---

## Task 13: Reskin `PositionsList` + `DepositButton`

**Files:** Modify `components/PositionsList.tsx`, `components/DepositButton.tsx`.

Reskin only — keep all contract reads/writes (`useReadContract`, `markPnl`, `getUserPositions`, `settle`/`close`, deposit flow) exactly. Apply vintage tokens: table on `--card` inside a red-bordered card, dotted row separators (`border-line`), Long=green/Short=red text, action buttons as red-outline pills, PnL green/red. Empty/loading states styled (e.g. "Open a position to see it here." in `text-ink/55`). `DepositButton` becomes a green `font-display` CTA matching the ticket.

- [ ] **Step 1: Reskin both components' markup** (preserve logic; only classNames/wrappers change). Reference the prototype for tone.

- [ ] **Step 2: Verify**

Run: `git diff components/PositionsList.tsx components/DepositButton.tsx` — confirm no contract-call changes.
Run: `npm run typecheck && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add components/PositionsList.tsx components/DepositButton.tsx
git commit -m "feat(web): reskin positions + deposit to vintage (logic unchanged)"
```

---

## Task 14: Assemble `app/trade/page.tsx`

**Files:** Modify `app/trade/page.tsx`.

Compose Nav, Marquee, and a two-column grid: left = PriceHeader + chart card (ChartToolbar + PriceChart) + Positions card; right = TradePanel (order ticket). Hold `mode` and `timeframe` state here and pass to ChartToolbar + PriceChart. Keep the existing `dynamic(..., { ssr:false })` wrappers for client-only pieces (chart, panel, positions, connect).

- [ ] **Step 1: Implement** (full file)

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePrice } from "@/lib/usePrice";
import { Nav } from "@/components/trade/Nav";
import { Marquee } from "@/components/trade/Marquee";
import { PriceHeader } from "@/components/trade/PriceHeader";
import { ChartToolbar } from "@/components/trade/ChartToolbar";
import type { TimeframeId } from "@/lib/chartWindow";

const PriceChart = dynamic(() => import("@/components/PriceChart").then((m) => m.PriceChart), {
  ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-[14px] bg-paper-2" />,
});
const TradePanel = dynamic(() => import("@/components/TradePanel").then((m) => m.TradePanel), { ssr: false });
const PositionsList = dynamic(() => import("@/components/PositionsList").then((m) => m.PositionsList), { ssr: false });

type Mode = "line" | "candles" | "onions";

export default function TradePage() {
  const { anchorUsd } = usePrice();
  const [mode, setMode] = useState<Mode>("line");
  const [timeframe, setTimeframe] = useState<TimeframeId>("1D");

  return (
    <div className="max-w-[1320px] mx-auto px-[26px] pt-[18px] pb-[50px]">
      <Nav />
      <Marquee />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[22px] items-start">
        <div>
          <PriceHeader />
          <div className="mt-4 rounded-[18px] border-[2.5px] border-red bg-card px-3.5 pt-3.5 pb-2 relative">
            <ChartToolbar mode={mode} onMode={setMode} timeframe={timeframe} onTimeframe={setTimeframe} />
            <div className="h-[312px]"><PriceChart anchorUsd={anchorUsd} mode={mode} timeframe={timeframe} /></div>
          </div>
          <div className="mt-4 rounded-[18px] border-[2.5px] border-red bg-card p-4">
            <h2 className="font-display text-sm text-red mb-3">POSITIONS</h2>
            <PositionsList />
          </div>
        </div>
        <TradePanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add app/trade/page.tsx
git commit -m "feat(web): assemble HEP vintage trade page"
```

---

## Task 15: Verification + design QA pass

**Files:** none (or small fixes the QA surfaces).

- [ ] **Step 1: Static gates**

Run: `npm run test && npm run typecheck && npm run lint && npm run build`
Expected: all pass, zero warnings.

- [ ] **Step 2: Dogfood in browser** (use the `/browse` skill)

Start `npm run dev`. With browse: `goto http://localhost:3000/trade`; `console --errors` (zero); toggle Line/Candles/Onions and each timeframe via clicks, `snapshot -D` to confirm the chart updates; flip Long/Short; `responsive /tmp/trade` for mobile/tablet/desktop; `Read` the screenshots.

- [ ] **Step 3: Contrast + accessibility check**

Verify AA contrast for: `--mustard-dp` text on `--card`, `--red` text on `--paper`, `--green`/`--red-br` change text. Use the browse `js` to compute or an inline check; if any fail, darken the token (e.g. `--mustard-dp`) and re-verify. Confirm focus-visible rings on all controls and `prefers-reduced-motion` halts the marquee/animations.

- [ ] **Step 4: Run design skills**

Invoke `/design-review` (visual polish, AI-slop, spacing/hierarchy) and `/audit` (a11y, performance, anti-patterns) against `/trade`. Apply P0/P1 fixes; commit each fix atomically.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix(web): trade-surface QA — contrast, a11y, polish"
```

---

## Self-Review (completed)

- **Spec coverage:** palette/type tokens (T2), pill nav (T10), marquee (T9), hero/price/stats with real data only (T11), chart 3-mode toggle + timeframes (T6/T7/T8), order-ticket panel (T12), positions/deposit reskin (T13), motion via Framer Motion + reduced-motion (T2/T8), accessibility + contrast gate (T15), production bar / no-vibe-code (TDD in T4/T5, typecheck+lint+build throughout, no fabricated data noted in T11). ✓
- **Boundaries:** every task edits only frontend; T12/T13 explicitly diff-check that contract logic is unchanged; `@shared/*` + `lib/use*` imported read-only. ✓
- **Type consistency:** `Mode` = `"line"|"candles"|"onions"` and `TimeframeId` from `lib/chartWindow` used consistently across T7/T8/T14; `windowFor`/`TIMEFRAMES`/`leekGeometry`/`OnionSeries`/`OnionData` names match their definitions. ✓
- **Open items:** lightweight-charts v5 custom-series type names may need minor alignment to the installed typings (flagged in T6, Step 2) — align to real types, do not use `any`.
