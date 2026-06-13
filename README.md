# onions.lol 🧅

**Banned in America since 1958. Trade them here.**

A fully on-chain **onion-futures exchange** — the one futures contract the U.S.
government forbids. Onion futures are the only commodity with a dedicated federal
ban (the **Onion Futures Act of 1958**, after the Kosuga–Siegel corner of 1955).
onions.lol lets you trade dated onion futures on Base Sepolia, **cash-settled
against the real USDA onion price**.

Built for **ETHGlobal New York 2026** — targeting the **Blink** consumer-app
prize (the deposit *is* the front door: you can't trade until you fund).

---

## The two-layer price (the heart of it)

| Layer | Source | Drives |
|---|---|---|
| **Settlement (REAL)** | USDA MARS API — NY Terminal yellow onions, 50-lb sacks, US No.1 | What dated contracts cash-settle against at expiry |
| **Mark (SYNTHETIC)** | Deterministic mean-reverting walk around the daily USDA anchor | Live chart + intraday PnL |

> *Disclosed in-app:* "Intraday prices are simulated for the demo; contracts
> settle against official USDA onion prices."

The mark is a **pure function** `markAt(anchor, t)` (`shared/mark.ts`) seeded by
the UTC date. The web app, the chart, and the on-chain keeper all import the same
function and read the same on-chain anchor, so they compute byte-identical
prices — **no drift, no shared runtime state**, and a keeper restart can't cause
a price step.

---

## Architecture

```
                 ┌─────────────────────────── Next.js (Vercel) ───────────────────────────┐
   Landing  ───▶ │  /trade: live candlestick chart · trade panel · positions · DEPOSIT     │
                 │  Privy embedded wallet ──┐                                               │
                 │  /api/sign-payment  ◀────┼── Blink hosted flow (pulls USDC → wallet)     │
                 │  /api/price/history  (deterministic candles from shared/mark)            │
                 └──────────┬───────────────┴───────────────────────────────────────────────┘
                            │ viem / wagmi (read + write)
                 ┌──────────▼─────────── Base Sepolia ───────────┐      ┌──── VPS ────┐
                 │  OnionOracle  (mark · anchor · settlement)     │◀─────│  keeper     │
                 │  Vault        (USDC, sole counterparty)        │      │  setMark/12s│
                 │  OnionFutures (dated long/short, ±margin PnL)  │      │  USDA anchor│
                 └───────────────────────────────────────────────┘      └─────────────┘
```

- **OnionOracle** — keeper-pushed `mark`/`anchor`/`settlement` (1e8). No
  Chainlink: there is no onion feed, by design and honestly disclosed.
- **Vault** — holds all USDC and is the sole counterparty. On open it reserves an
  equal `margin` from the house, so max payout (`2×margin`) is pre-funded — PnL is
  bounded to ±margin, so the vault is trivially solvent (no liquidation engine).
- **OnionFutures** — dated futures (true to the meme: the Act bans *futures*, not
  perps). PnL = `notional·(price−entry)/entry`, capped at ±margin; valued against
  the synthetic mark pre-expiry, cash-settled against the real USDA index at
  expiry. 16 Foundry tests incl. fuzz proofs of the PnL bound and vault
  conservation.

---

## How Blink is used (the hero flow)

The deposit is the featured interaction. Using `@swype-org/deposit`:

1. User signs in with **Privy** → an embedded wallet is created (no seed phrase).
2. Taps **Deposit** → `useBlinkDeposit().requestDeposit({ amount, chainId: 84532, address: <embedded wallet>, token: USDC })` opens Blink's hosted flow, which pulls USDC into the embedded wallet.
3. We **watch the embedded wallet's on-chain USDC balance** until the funds actually land (Blink routes cross-chain, so the resolved result is *initiation*, not settlement), then credit them into the Vault as collateral.
4. Balance updates — now you can trade.

The merchant signer (`app/api/sign-payment/route.ts`, Node runtime) signs the
base64url payload with **ECDSA P-256 / SHA-256, DER encoding** — verified against
Blink's live sandbox (IEEE-P1363 is rejected). See `spike/SPIKE_RESULTS.md` for
the full empirical verification.

---

## Repo layout

```
app/         Next.js App Router (landing, /trade, API routes)
components/  ConnectButton, PriceChart, DepositButton, TradePanel, PositionsList
lib/         wagmi/privy config, contracts (addresses+ABI), formatting, hooks
shared/      deterministic mark (imported by web AND keeper) — the single source
contracts/   Foundry: OnionOracle, Vault, OnionFutures + tests + deploy script
oracle/      Node/TS keeper: pushes mark + USDA anchor + settlement on-chain
abi/         committed ABIs (read by web + keeper)
spike/       Phase-1 empirical Blink verification (scripts + results)
```

---

## Setup

**Prereqs:** Node 22+, Foundry, a Privy app id, a Base Sepolia RPC, USDC from
[faucet.circle.com](https://faucet.circle.com).

```bash
# 1. contracts
cd contracts && forge test
forge script script/Deploy.s.sol:Deploy --rpc-url base_sepolia --broadcast --verify

# 2. web  (copy .env.example -> .env.local, fill keys + deployed addresses)
npm install && npm run dev

# 3. keeper (on a VPS)  (set KEEPER_PRIVATE_KEY, ORACLE_ADDRESS, FUTURES_ADDRESS, USDA_MARS_API_KEY)
cd oracle && npm install && npm start
```

Key env vars are documented in `.env.example`. The USDA key is the HTTP
Basic-auth **username with an empty password** (a MARS API gotcha).

---

## Scope (honest)

**Real:** the Blink deposit flow, the live chart, open/close long & short, the
positions table, the two-layer oracle, USDA settlement, on-chain mark.

**Faked (by design):** vault as sole counterparty, synthetic intraday mark,
bounded PnL instead of liquidations, seeded vault liquidity, short expiries.

Not built (out of scope): order book, matching engine, liquidation engine,
funding rates, governance/token, mainnet.

---

*Not financial advice. Not legal advice. Onions remain federally un-tradeable as
futures in the United States — which is the whole point.*
