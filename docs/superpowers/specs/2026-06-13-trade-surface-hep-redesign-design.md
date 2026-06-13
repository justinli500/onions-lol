# Trade Surface — HEP Vintage Redesign

**Date:** 2026-06-13
**Branch:** `ui/trading-surface`
**Scope:** Frontend only. No backend/core changes (see "Boundaries").
**Status:** Approved direction (interactive mockup signed off). Ready for implementation plan.

---

## Intent

- **Who:** a crypto-curious internet native who gets the joke — onions are the one commodity the U.S. federally banned from futures trading (Onion Futures Act, 1958). They want to trade the forbidden bulb and have fun doing it.
- **What they do:** read the live onion price, pick a side, set margin/leverage/expiry, open a dated futures position, watch PnL, close/settle.
- **Feel:** warm 1950s flea-market Americana — bold, characterful, playful, hand-made. The opposite of a sterile dark trading terminal. The 1958 ban and the vintage aesthetic are the same era; the look *is* the joke.

Aesthetic adapted from HEP Vintage Club (hepvintageclub.it, Particolare Studio). We adapt the **design language** (palette, type treatment, pill nav, marquee, stamp/sticker motifs, order-ticket framing) — not their content. Fonts are free analogues, not their licensed faces.

## Design System

**Palette** (warm, from the HEP world — onion skin, tomato, mustard, cream paper):
| Token | Value | Role |
|---|---|---|
| `--paper` | `#f5ead0` | canvas (cream) |
| `--paper-2` | `#efe1bd` | secondary surface |
| `--card` | `#fbf3df` | cards / panels |
| `--red` | `#a11e21` | primary ink, borders, brand |
| `--red-br` | `#d8392b` | bright accents |
| `--mustard` | `#f0b42a` | secondary accent / chart fill / highlights |
| `--mustard-dp` | `#e0962a` | mustard text on cream |
| `--ink` | `#2a100c` | body text (dark brown-red) |
| `--green` | `#2f8f4e` | up / Long / onion leaves (vintage green, not neon) |

Up/down semantics: **green = up/Long**, **red = down/Short**. (Note: `--red` is also the brand ink, so down-state red is the brighter `--red-br`/green-vs-red pairing stays legible on cream.)

**Typography** (free Google Fonts standing in for PP Agrandir / Portuguesa Script):
- **Archivo Black** — display: big price, section headers, ticket labels, marquee.
- **Archivo** (500–800) — UI text, buttons, stats.
- **Yellowtail** (script) — decorative signage accents only ("the onion index", brand wordmark, section flourishes). Used sparingly so it stays special.
- **Tabular numerics** for all prices/figures.

**Depth & shape:** thick (2–2.5px) red rounded borders define cards (borders-only depth, fits the print/sticker feel — not soft shadows). Radius scale: pills `999px`, cards/inputs `10–18px`. Dotted leader/divider lines (`2px dotted`) echo receipts/ledgers.

**Motifs:** pill-capsule nav, a scrolling marquee ticker band, starburst "stamp" badges (e.g. `SINCE 1958`), the trade panel framed as an **ORDER TICKET № 1958**, flat-leek onion sticker art.

## Layout (trade screen)

Two-column on desktop (`1fr / 360px`), single column stacked on mobile.

1. **Pill nav bar** — brand wordmark left (`🧅 onions.lol`, script + bold), center nav pills (Trade / Markets / About / Shop — Trade active = red fill), `Connect Wallet` pill right (mustard). `Markets`/`Shop` may link nowhere yet (single market today) — keep or drop per build.
2. **Marquee band** — red bar, cream/mustard scrolling text: `VINTAGE · BANNED IN AMERICA · SINCE 1958 · CASH-SETTLED vs USDA · TRADE THE FORBIDDEN BULB ·`. Linear infinite scroll; paused under `prefers-reduced-motion`.
3. **Hero (left col):**
   - `● LIVE · settles vs USDA` tag.
   - Tilted Yellowtail script label *"the onion index"*.
   - Huge Archivo-Black price (live), up/down arrow + % today, USDA provenance subline.
   - **Stat stamp-chips** (outlined): Mark · synthetic / USDA Settlement / 24h Range / Settles in (countdown).
4. **Chart card (left col):** thick red border, dashed-ledger grid, `SINCE 1958` starburst stamp, timeframe pills (15m/1H/4H/1D/1W), and the **chart-mode toggle**.
5. **Order Ticket (right col):** red ticket header (`ORDER TICKET № 1958`), collateral row, LONG/SHORT stamp toggle (green/red), Margin input + MAX, Leverage pills, Expiry pills, big `OPEN LONG/SHORT` CTA, dotted-leader summary (Entry, Notional, Settles against USDA).

## Chart — three modes behind a toggle

Default **Line** (smooth area, red ink line + mustard gradient fill on cream). Toggle to **Candles** (vintage green/red) or **🧅 Onions** (flat-leek candles: mustard bulb body + ink outline for cream legibility, green leaves at the high / red when down, root wisps at the low). Switching crossfades with a brief blur mask; Line redraws its stroke.

All three render the **same OHLC dataset** so modes stay cohesive (the line traces the candle closes). Data source is the existing deterministic mark — see Implementation.

## Stats: real data only

The HEP/reference layout implies Open Interest / Funding Rate / Market Skew. **These do not exist** in onions.lol's contracts (dated futures, vault is sole counterparty, no funding/OI/liquidations). We do **not** fabricate them. We surface what is real:
- **Mark** (synthetic intraday) vs **USDA Settlement** (the real anchor) — the two-layer price is the actual story.
- **24h range**, **expiry countdown** (dated futures are first-class).

## Motion principles (Benji + Emil)

- Selection indicators **morph/slide**, never jump (chart toggle, leverage/expiry pills, Long/Short).
- Press feedback `scale(0.97)` on all controls; custom easing token `--ease-out: cubic-bezier(0.23,1,0.32,1)`; UI transitions < 300ms; animate `transform`/`opacity` only.
- Presence: pulsing live head on the line, live price tick (arrow flip + subtle flash), ticking settle countdown, scrolling marquee.
- Blur-masks the chart-mode crossfade. Full `prefers-reduced-motion` guard.
- Delight budget: subtle on high-frequency (price tick), richer on low-frequency (mode toggle, starburst).

## Implementation notes (for the plan)

Files in play (all frontend):
- `app/trade/page.tsx` — new layout (nav, marquee, hero, grid).
- `app/globals.css` — replace dark tokens with HEP tokens above; add `--ease-out`, dotted-line helpers.
- `app/layout.tsx` — register Archivo / Archivo Black / Yellowtail (next/font), keep existing providers untouched.
- `components/PriceChart.tsx` — add Line + Candles + Onion modes and the mode toggle; reskin to HEP palette.
- `components/TradePanel.tsx` — reskin as Order Ticket. **Presentation only — do not change the wagmi `open()` / contract-call logic** (gray-zone rule).
- `components/PositionsList.tsx`, `ConnectButton.tsx`, `DepositButton.tsx` — reskin to vintage.
- New: a `Marquee` component and the pill `Nav` (extract from page if reused).

**Chart library decision (to confirm in plan):** keep `lightweight-charts` (v5.2) for Line + Candles — it already drives the real-time mark updates, autoscale, crosshair via the existing `@shared/mark` pipeline (`buildCandles` / `markAtUsd`, imported read-only). Implement **Onion mode** as a v5 custom series (`ICustomSeriesPaneView`) drawing flat leeks. Alternative: custom SVG/canvas for all three (full styling control, but reimplements real-time + autoscale). Recommend the first.

**Data stays read-only:** `@shared/mark`, `@shared/constants`, `lib/usePrice`, `lib/useExchange`, `lib/contracts` are consumed, not modified.

## Design skills driving the build

Not a single skill — the suite, each where it fits:
- **interface-design** — token architecture, surface/border systems, the craft checks (swap/squint/signature tests).
- **frontend-design** — production-grade component construction during implementation.
- **baseline-ui** — enforce the anti-slop UI baseline (this is the direct counter to "vibe coded").
- **benji-design** + **emil-design-eng** — motion, transitions, press states, easing, presence.
- **design-review** + **audit** — run after the build for visual QA, accessibility, performance, anti-pattern detection; fix what they flag.

## Production quality bar — no "vibe coding"

The mockup is throwaway; the shipped code must be production-grade. Hard requirements:

- **Tokens, not magic values.** Every color/spacing/radius traces to a CSS variable or the Tailwind theme. No inline hex or one-off pixel values scattered in components. The palette above lives in `globals.css` + `@theme`.
- **Small, single-purpose components.** Extract `Nav`, `Marquee`, `StatChip`, `ChartToggle`, `OrderTicket`, leek-renderer. Each understandable in isolation; no 300-line page component.
- **TypeScript clean.** No new `any`; typed props; `tsc --noEmit` and ESLint pass with zero new warnings.
- **All states designed.** hover / active / focus-visible / disabled, plus data states loading / empty / error for chart, positions, and balances. Missing states read as broken.
- **Accessibility is a gate, not a nicety.** Keyboard operable controls, visible focus rings, `prefers-reduced-motion` honored. **Contrast must be verified** — cream + mustard is a real WCAG risk; mustard text/`--mustard-dp` on cream and red-on-cream must meet AA for their size, or we darken the token. Onion-mode leeks carry an ink outline specifically so they're not color-only signals.
- **No dead/commented-out code, no placeholder TODOs, no fabricated data.** If a value isn't real (OI/funding/skew), it doesn't appear.
- **Follow existing repo conventions.** Client-only pieces stay behind `dynamic(..., { ssr:false })` as today; fonts via `next/font`; reuse `lib/format`, `lib/usePrice`, etc. rather than re-rolling.
- **Verified, not vibed.** Build + lint + typecheck green, and the screen dogfooded in the browser (responsive at mobile/tablet/desktop) before it's called done.

## Boundaries (out of scope)

- No edits to `contracts/`, `oracle/`, `shared/`, `abi/`, `app/api/`.
- No new backend data (OI/funding/skew remain absent, not faked).
- No new market data; single market (ONION). A multi-market "Markets" list (HEP Image #3) is **not** in this scope.
- Trade/position contract logic unchanged — only its presentation.

## Open questions for the plan

1. Keep `Markets`/`Shop` nav pills as inert/coming-soon, or drop them?
2. Timeframe pills (15m/1H/4H/1D/1W): wire all to the deterministic mark window, or ship a subset that reads well for an intraday synthetic series?
3. Confirm the chart-library decision above.
