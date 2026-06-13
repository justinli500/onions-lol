# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**onions.lol** — an on-chain onion-futures exchange (ETHGlobal NY 2026, targeting the Blink consumer-app prize). The joke: onion futures are federally banned in the US since 1958; this DEX cash-settles them against the real USDA onion price. A monorepo: Next.js web app at the **root**, Foundry contracts in `contracts/`, a Node keeper in `oracle/`, framework-agnostic price math in `shared/`, and empirical Blink verification scripts in `spike/`.

> Layout note: the parent `../CLAUDE.md` prescribes generic `/src,/tests` dirs — that's deliberately **overridden** here for a Next.js + Foundry monorepo (web in `app/`+`components/`+`lib/`, Solidity in `contracts/src/`, Foundry tests in `contracts/test/`). Don't "fix" the layout back.

## Commands

```bash
# Web (root) — Next 16 / React 19 / Tailwind v4. .npmrc sets legacy-peer-deps.
npm run dev            # localhost:3000
npm run build          # production build (also typechecks)
npx tsc --noEmit       # fast typecheck without a full build

# Contracts (run inside contracts/). Deps are git submodules:
#   git submodule update --init --recursive   (or forge install) after a fresh clone
forge test                                  # full suite
forge test --match-test test_LongProfit -vvv   # single test
# Deploy (sources keys from root .env; rpc alias from contracts/foundry.toml):
set -a && . ../.env && set +a && forge script script/Deploy.s.sol:Deploy --rpc-url base_sepolia --broadcast

# Keeper (oracle/) — reads env via dotenv (KEEPER_PRIVATE_KEY, ORACLE_ADDRESS, FUTURES_ADDRESS, BASE_SEPOLIA_RPC_URL, USDA_MARS_API_KEY)
npm i --prefix oracle && oracle/node_modules/.bin/tsx oracle/src/keeper.ts

# Deploy web to Vercel: vercel:deploy skill (CLI), env vars set in Vercel project (production)
```

After changing contracts, regenerate the committed ABIs the web + keeper import:
`jq '.abi' contracts/out/X.sol/X.json > abi/X.json`.

## Architecture

**The deterministic two-price model is the core invariant.** `shared/mark.ts`'s `markAtUsd(anchorUsd, tMs)` is a *pure* mean-reverting (OU) function seeded by the UTC date. It is imported by **both** the web app (chart + `/api/price/history`) **and** the keeper (on-chain `setMark`), so all three compute byte-identical marks with no shared runtime state. The contract never computes a price — it only stores what the keeper pushes. The daily **anchor** (real USDA price) is the single source read by both keeper and web. If you touch the mark math, every consumer must use the same `shared/` code or they drift.

**Contracts** (`contracts/src/`, scale: price `1e8`, USDC `1e6`):
- `OnionOracle` — keeper-only `setMark`/`setAnchor`/`setSettlement`; `getMark` (pre-expiry valuation) vs `getSettlement(expiry)` (real USDA cash-settle). No Chainlink by design.
- `Vault` — holds all USDC, sole counterparty. On `open` it locks the user's `margin` AND reserves an equal `margin` from the house, so max payout (`2×margin`) is pre-funded. Invariant: `usdc.balanceOf(vault) == ΣbalanceOf + houseLiquidity + lockedMargin + reservedProfit`.
- `OnionFutures` — dated long/short. PnL = `notional·(price−entry)/entry`, **bounded to ±margin** (so the vault is trivially solvent — no liquidation engine). `close()` uses mark pre-expiry; `settle()` uses the USDA settlement index at/after expiry.

**Web** (`app/`, `components/`, `lib/`): Privy embedded wallets via `@privy-io/wagmi`; chart is `lightweight-charts` v5; the deposit flow is the showcased feature. `lib/contracts.ts` holds addresses+ABIs, `lib/usePrice.ts`/`lib/useExchange.ts` are the data hooks.

**Blink deposit**: client uses the `Deposit` class through a remount-safe custom hook (`useSafeBlinkDeposit` in `DepositButton.tsx`); `app/api/sign-payment/route.ts` is the merchant signer (Node runtime, ECDSA P-256/SHA-256, **DER**, over the base64url payload), auth-bound to the Privy user; `app/api/faucet/route.ts` drips gas to the embedded wallet (Blink delivers USDC but no ETH).

## Non-obvious gotchas (hard-won — read before touching these areas)

- **`NEXT_PUBLIC_*` must be read with a STATIC literal key** (`process.env.NEXT_PUBLIC_FOO`). A dynamic `process.env[k]` is **not inlined** by Next and is `undefined` in the browser (symptom: contract addresses missing → "Exchange not deployed").
- **Blink merchant signature is DER, not IEEE-P1363** (verified against the live sandbox; P1363 → `MERCHANT_SIGNATURE_INVALID`). Sign the base64url-encoded payload *string*, not raw JSON.
- **Blink sandbox supports Base Sepolia; USDC = `0x036CbD53842c5426634e7929541eC2318f3dCF7e`** (Circle's, captured from a real deposit — the SDK examples use Base *mainnet* USDC; never copy those).
- **Blink's flow defaults the source token to native ETH → ETH→USDC swap → `MANUAL_TRANSFER_PRICE_PROBE_FAILED` on testnet.** USDC→USDC works but there's **no SDK param to set the source**. This is a Blink-sandbox limitation; the direct deposit (`onCreditExisting` → approve+`deposit`) is the reliable path and is the primary button.
- **Privy needs the origin allow-listed** in its dashboard (`localhost:3000`, the Vercel domain) or it never initializes ("Origin not allowed" → the Sign-in button stays a loading skeleton).
- **`reactStrictMode: false`** (next.config): Blink's own `useBlinkDeposit` nulls its ref on Strict-Mode's double-invoke (`.on` of null); we replaced it with `useSafeBlinkDeposit` and keep Strict Mode off.
- **Wallet/canvas components are `next/dynamic` with `{ ssr: false }`** (ConnectButton, PriceChart, TradePanel, PositionsList) — they use Privy/wagmi/DOM and must not run during SSG.
- **The deposit gates on the observed on-chain balance**, not Blink's resolved result (Blink routes cross-chain; "completed" ≠ settled).
- **tsconfig `target: ES2020`** — required for bigint literals (viem).
- **`vm.prank` footgun (Foundry tests):** evaluate any external getter (e.g. `futures.LONG()`) into a local *before* `vm.prank`, or it consumes the prank.

## Deployed (Base Sepolia, chainId 84532) & env

- OnionOracle `0x4ad251093af5f76358b0d3c22ec36c1848d90556` · Vault `0x1f3d578902767f5f9bd64389fe925c901cba392e` · OnionFutures `0x493fc2d0c7e90c834de3d78a39dd7e15f065f046`. Live: https://onions-lol.vercel.app
- Deployer == keeper == faucet source: `0x9D074225A56657847d2D1db7FA1b987c5431F215` (testnet ETH; runs low).
- Secrets live in gitignored `.env` (deploy/keeper) and `.env.local` (web). `.env.example` is the **tracked** template — never put real values there.

## Scope (intentionally faked)

Vault is the sole counterparty; intraday mark is synthetic; PnL is bounded instead of liquidated; vault liquidity is seeded; expiries are short. Not built: order book, matching engine, liquidation engine, funding rates, token, mainnet.
