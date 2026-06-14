# Base Mainnet Transaction Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get onions.lol's on-chain transaction flow (deposit real USDC → open/close OnionFutures → withdraw) working on Base mainnet (chainId 8453) via the direct-deposit path, with no Blink dependency.

**Architecture:** Collapse the five hardcoded `baseSepolia` references into a single env-driven switch (`shared/chain.ts` pure resolver + `lib/chain.ts` web reader, both consumed everywhere). Deploy the existing immutable contracts fresh to Base mainnet via the already-parametrized Foundry script. Fund embedded-wallet gas with the existing faucet pointed at mainnet (a few dollars of real ETH), and run the oracle keeper only during test sessions with a slower on-chain push cadence decoupled from the price-curve tick.

**Tech Stack:** Next.js 16 (App Router) + Privy embedded wallets + wagmi/viem on the client; Foundry (Solidity 0.8.28) for contracts; a Node/viem keeper process; canonical Circle USDC on Base (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, 6 decimals, EIP-2612).

**Scope boundaries:** Blink production, the merchant signer (`onDepositBlink`, `app/api/sign-payment`), and the one-click experience are OUT. The direct-deposit path (`DepositButton.tsx` → `onCreditExisting`) stays primary. Target scale is <5 users / a prove-the-flow milestone — favor simplicity over infra.

**Testing approach:** This is overwhelmingly config + deploy work with no JS unit-test harness in the repo. Each layer is verified with the repo's existing tooling, not a new framework: contracts via `forge test`; the web refactor via `npx tsc --noEmit`, `npm run lint`, `npm run build`; page health via the existing `spike/shot.mjs` Playwright smoke; on-chain state via `cast`. Tasks 1–3 are verifiable on testnet (zero spend); Tasks 4–7 touch real money.

---

## File Structure

**New files:**
- `shared/chain.ts` — pure `resolveChain(chainId)` mapping (8453→base, 84532→baseSepolia) returning the viem `Chain`, a default RPC, and the canonical USDC. Dependency: `viem/chains`. Consumed by both the web (`lib/chain.ts`) and the oracle keeper (relative import). One responsibility: chain identity.
- `lib/chain.ts` — web-side env reader. Reads `NEXT_PUBLIC_CHAIN_ID` / `NEXT_PUBLIC_RPC_URL` / `NEXT_PUBLIC_USDC_ADDRESS`, calls `resolveChain`, and exports `CHAIN`, `CHAIN_ID`, `RPC_URL`, `USDC_ADDRESS`. The single web switch.

**Modified files:**
- `lib/wagmi.ts` — import `CHAIN`/`RPC_URL` from `lib/chain` instead of literal `baseSepolia`.
- `lib/contracts.ts` — source `CHAIN`/`USDC_ADDRESS` from `lib/chain` and re-export (keeps its public import surface).
- `app/providers.tsx` — Privy `defaultChain`/`supportedChains` from `CHAIN`.
- `app/api/faucet/route.ts` — chain/RPC from `lib/chain`; Base-appropriate drip defaults.
- `oracle/src/keeper.ts` — `resolveChain` + `CHAIN_ID`/`RPC_URL` env; decouple on-chain push cadence (`KEEPER_PUSH_MS`) from the shared `TICK_MS` price curve.
- `contracts/foundry.toml` — add `base` rpc endpoint + Basescan verify config.
- `contracts/script/Deploy.s.sol` — chainid-safe USDC default so a mainnet deploy can't be wired to a Sepolia token.
- `.env.example` — document the new var names + mainnet values.

---

## Task 1: Shared chain resolver

**Files:**
- Create: `shared/chain.ts`

- [ ] **Step 1: Create the resolver**

Create `shared/chain.ts`:

```ts
// Single source of truth for which chain the whole stack targets, selected by
// chainId. Imported by the web (lib/chain.ts) and the oracle keeper so they can
// never disagree. 8453 = Base mainnet, 84532 = Base Sepolia.
import { base, baseSepolia } from "viem/chains";
import type { Chain } from "viem";

// Circle canonical USDC (6 decimals, EIP-2612 permit) per chain.
export const USDC_BY_CHAIN: Record<number, `0x${string}`> = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

export function resolveChain(
  chainId: number,
): { chain: Chain; defaultRpcUrl: string; usdc: `0x${string}` } {
  switch (chainId) {
    case 8453:
      return { chain: base, defaultRpcUrl: "https://mainnet.base.org", usdc: USDC_BY_CHAIN[8453] };
    case 84532:
      return { chain: baseSepolia, defaultRpcUrl: "https://sepolia.base.org", usdc: USDC_BY_CHAIN[84532] };
    default:
      throw new Error(`resolveChain: unsupported chainId ${chainId}`);
  }
}
```

- [ ] **Step 2: Verify it compiles (web includes `shared/`)**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). The web tsconfig already compiles `shared/` (e.g. `@shared/mark`).

- [ ] **Step 3: Commit**

```bash
git add shared/chain.ts
git commit -m "feat(shared): chainId->chain resolver for base/base-sepolia"
```

---

## Task 2: Web single-switch + rewire all four consumers

**Files:**
- Create: `lib/chain.ts`
- Modify: `lib/wagmi.ts`, `lib/contracts.ts:1-17`, `app/providers.tsx:6,33`, `app/api/faucet/route.ts:6-18,66,70`

- [ ] **Step 1: Create `lib/chain.ts`**

```ts
// The single web switch. Flip NEXT_PUBLIC_CHAIN_ID to retarget the whole client
// (wagmi, Privy, contracts, faucet). NOTE: these MUST be read with static
// NEXT_PUBLIC_ literals so Next inlines them into the browser bundle.
import { resolveChain } from "@shared/chain";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532);
const resolved = resolveChain(CHAIN_ID);

export const CHAIN = resolved.chain;
// Fixes the prior latent bug: wagmi read NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL which
// was never set. Standardize on NEXT_PUBLIC_RPC_URL, falling back to the public RPC.
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || resolved.defaultRpcUrl;
export const USDC_ADDRESS =
  (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`) || resolved.usdc;
```

- [ ] **Step 2: Rewire `lib/wagmi.ts`**

Replace the entire file with:

```ts
import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { CHAIN, RPC_URL } from "@/lib/chain";

// @privy-io/wagmi's createConfig so wagmi's read/write hooks drive the Privy
// embedded wallet. Chain + RPC come from the single switch in lib/chain.
export const wagmiConfig = createConfig({
  chains: [CHAIN],
  transports: { [CHAIN.id]: http(RPC_URL) },
});
```

- [ ] **Step 3: Rewire `lib/contracts.ts` head**

Replace lines 1–17 (the `baseSepolia` import + `CHAIN` + `USDC_ADDRESS` block) with:

```ts
import type { Abi } from "viem";
import { CHAIN, USDC_ADDRESS } from "@/lib/chain";
import OnionOracleAbi from "@/abi/OnionOracle.json";
import VaultAbi from "@/abi/Vault.json";
import OnionFuturesAbi from "@/abi/OnionFutures.json";
import ERC20Abi from "@/abi/ERC20.json";

// Re-export so existing consumers (`import { CHAIN, USDC_ADDRESS } from "@/lib/contracts"`)
// keep working; the values now flow from the single switch in lib/chain.
export { CHAIN, USDC_ADDRESS };

// NEXT_PUBLIC_* read with STATIC literal keys so Next inlines them client-side.
const undef = (v?: string) => (v && v.length ? (v as `0x${string}`) : undefined);
```

Leave lines 19+ (`ORACLE_ADDRESS`, `VAULT_ADDRESS`, `FUTURES_ADDRESS`, abis, `SIDE`) unchanged.

- [ ] **Step 4: Rewire `app/providers.tsx`**

At line 6 replace `import { baseSepolia } from "viem/chains";` with:

```ts
import { CHAIN } from "@/lib/chain";
```

At line 33 replace the two chain fields:

```ts
        defaultChain: CHAIN,
        supportedChains: [CHAIN],
```

- [ ] **Step 5: Rewire `app/api/faucet/route.ts`**

At line 6 replace `import { baseSepolia } from "viem/chains";` with:

```ts
import { CHAIN, RPC_URL } from "@/lib/chain";
```

Replace line 11 (`const RPC = ...`) with:

```ts
const RPC = RPC_URL;
```

Replace lines 17–18 (drip defaults) with Base-appropriate amounts:

```ts
const DRIP = parseEther(process.env.FAUCET_DRIP_ETH || "0.0003");
const MIN = parseEther(process.env.FAUCET_MIN_ETH || "0.0001"); // skip if already funded
```

At line 66 and line 70, replace `chain: baseSepolia` with `chain: CHAIN` (two occurrences).

- [ ] **Step 6: Typecheck, lint, build (env still testnet → behavior preserved)**

Ensure `.env.local` still has `NEXT_PUBLIC_CHAIN_ID=84532` (unchanged), then run:

Run: `npx tsc --noEmit`
Expected: PASS

Run: `npm run lint`
Expected: PASS (no errors)

Run: `npm run build`
Expected: build completes; no "module not found" / type errors

- [ ] **Step 7: Smoke the pages still render (existing tooling)**

Run the dev server in the background, then the existing Playwright smoke:

```bash
npm run dev &          # wait until "Ready" / localhost:3000
BASE=http://localhost:3000 node spike/shot.mjs
```

Expected: `landing -> /tmp/onions-landing.png`, `trade -> /tmp/onions-trade.png`, and `no console/page errors`. Stop the dev server afterward.

- [ ] **Step 8: Commit**

```bash
git add lib/chain.ts lib/wagmi.ts lib/contracts.ts app/providers.tsx app/api/faucet/route.ts
git commit -m "feat(web): single chain switch via lib/chain; fix RPC env name; base-tuned faucet drip"
```

---

## Task 3: Contracts — mainnet endpoint + chainid-safe USDC default

**Files:**
- Modify: `contracts/foundry.toml`
- Modify: `contracts/script/Deploy.s.sol:13-22`

- [ ] **Step 1: Add the `base` RPC + verify config to `foundry.toml`**

In `[rpc_endpoints]`, add below the `base_sepolia` line:

```toml
base = "${BASE_RPC_URL}"
```

In `[etherscan]`, add below the `base_sepolia` line:

```toml
base = { key = "${BASESCAN_API_KEY}", chain = 8453, url = "https://api.basescan.org/api" }
```

- [ ] **Step 2: Make the USDC default chainid-safe in `Deploy.s.sol`**

The contracts are immutable, so a mainnet deploy accidentally wired to the Sepolia USDC address would be permanently bricked. Add a mainnet constant and a chainid-based default.

Replace line 17 (`address constant BASE_SEPOLIA_USDC = ...;`) with:

```solidity
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
```

Replace line 22 (`address usdc = vm.envOr("USDC_ADDRESS", BASE_SEPOLIA_USDC);`) with:

```solidity
        address defaultUsdc = block.chainid == 8453 ? BASE_MAINNET_USDC : BASE_SEPOLIA_USDC;
        address usdc = vm.envOr("USDC_ADDRESS", defaultUsdc);
```

Update the contract doc comment (lines 12–15) so it no longer says USDC defaults only to the Sepolia token — it now picks per chainid (Base mainnet → canonical Circle USDC; Base Sepolia → the spike-confirmed token), overridable by `USDC_ADDRESS`.

- [ ] **Step 3: Build + existing tests still pass**

Run: `cd contracts && forge build`
Expected: compiles clean

Run: `cd contracts && forge test`
Expected: all existing tests PASS (the change is a default value + an added constant; behavior on the existing test chain is unchanged)

- [ ] **Step 4: Commit**

```bash
git add contracts/foundry.toml contracts/script/Deploy.s.sol
git commit -m "feat(contracts): base mainnet rpc/verify + chainid-safe USDC default in Deploy"
```

---

## Task 4: Deploy contracts to Base mainnet (real money)

**Files:** none (deploy action). Records addresses into `.env.local` (gitignored).

**Pre-requisites (the engineer/operator must have these ready):**
- A funded deployer wallet: real ETH for gas + the `HOUSE_SEED_USDC` amount of USDC (for a <5-user test, ~$50–100 of USDC is plenty; it caps total open interest).
- Env exported in the shell for the script: `DEPLOYER_PRIVATE_KEY`, `BASE_RPC_URL` (a real RPC; public `https://mainnet.base.org` works to start), `BASESCAN_API_KEY`, `KEEPER_ADDRESS` (the keeper's address), `HOUSE_SEED_USDC` (USDC base units, 6 decimals — e.g. `50000000` for $50).

- [ ] **Step 1: Dry-run the deploy (simulation, no broadcast)**

```bash
cd contracts && forge script script/Deploy.s.sol:Deploy --rpc-url base
```

Expected: simulation succeeds and logs simulated `OnionOracle`, `Vault`, `OnionFutures`, `USDC` (must be `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`), `keeper`, `houseSeed`. If `USDC` is wrong, stop and fix env before broadcasting.

- [ ] **Step 2: Broadcast + verify**

```bash
cd contracts && forge script script/Deploy.s.sol:Deploy --rpc-url base --broadcast --verify
```

Expected: three contracts deployed + verified on Basescan. Copy the three addresses from the console output.

- [ ] **Step 3: Verify wiring on-chain with `cast`**

Substitute the deployed addresses:

```bash
cast call <VAULT> "usdc()(address)" --rpc-url base       # -> 0x833589...2913
cast call <VAULT> "futures()(address)" --rpc-url base     # -> <FUTURES>
cast call <VAULT> "houseLiquidity()(uint256)" --rpc-url base  # -> HOUSE_SEED_USDC
cast call <ORACLE> "keeper()(address)" --rpc-url base      # -> KEEPER_ADDRESS
```

Expected: all four match. If `houseLiquidity` is 0 you forgot `HOUSE_SEED_USDC` — provide house via `cast send <VAULT> "provideHouse(uint256)" <amt>` after approving, or redeploy.

- [ ] **Step 4: Record addresses**

Write the three addresses into `.env.local` (gitignored) as `NEXT_PUBLIC_ORACLE_ADDRESS`, `NEXT_PUBLIC_VAULT_ADDRESS`, `NEXT_PUBLIC_FUTURES_ADDRESS`. (No git commit — addresses are environment, and `contracts/broadcast/` is gitignored.)

---

## Task 5: Flip the web to mainnet + document env

**Files:**
- Modify: `.env.local` (gitignored — local only)
- Modify: `.env.example` (tracked)

- [ ] **Step 1: Set mainnet env in `.env.local`**

```
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_ORACLE_ADDRESS=<from Task 4>
NEXT_PUBLIC_VAULT_ADDRESS=<from Task 4>
NEXT_PUBLIC_FUTURES_ADDRESS=<from Task 4>
MAX_DEPOSIT_USD=200
```

- [ ] **Step 2: Enable Base mainnet in the Privy dashboard**

In dashboard.privy.io for this app, add Base (8453) to the allowed/default chains. (External step — the SDK config already follows `CHAIN` from Step 1, but Privy must permit the chain server-side.)

- [ ] **Step 3: Update `.env.example` (tracked)**

Replace the chain block and Blink-era notes so the template reflects the env-driven switch. Set the chain section to:

```
# --- Chain: 8453 = Base mainnet, 84532 = Base Sepolia ---
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
# Oracle keeper (separate process) reads its own:
CHAIN_ID=8453
RPC_URL=https://mainnet.base.org
KEEPER_PUSH_MS=60000
# Foundry deploy/verify:
BASE_RPC_URL=https://mainnet.base.org
```

Keep the existing Privy / faucet / deploy / keeper / USDA sections; just ensure the faucet section notes `FAUCET_DRIP_ETH` defaults to `0.0003` on Base and the wallet behind `FAUCET_PRIVATE_KEY` must hold real ETH.

- [ ] **Step 4: Build with mainnet env**

Run: `npm run build`
Expected: build succeeds with `NEXT_PUBLIC_CHAIN_ID=8453`.

- [ ] **Step 5: Smoke that the mainnet app loads + reads chain**

```bash
npm run dev &
BASE=http://localhost:3000 node spike/shot.mjs
```

Expected: `no console/page errors`; the trade page renders (collateral reads as 0 for a fresh wallet, not an error). Stop the dev server.

- [ ] **Step 6: Commit (template only)**

```bash
git add .env.example
git commit -m "chore(env): document base mainnet env + keeper push cadence"
```

---

## Task 6: Point the keeper at mainnet + decouple push cadence

**Files:**
- Modify: `oracle/src/keeper.ts:11,18,30-31,117`

- [ ] **Step 1: Replace the hardcoded chain + RPC**

At line 11 remove `import { baseSepolia } from "viem/chains";` and add at the top of the local imports:

```ts
import { resolveChain } from "../../shared/chain";
```

Replace line 18 (`const RPC = ...`) with the chain-driven block:

```ts
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 84532);
const { chain, defaultRpcUrl } = resolveChain(CHAIN_ID);
const RPC = process.env.RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || defaultRpcUrl;
// On-chain push cadence, decoupled from the shared TICK_MS price curve so we can
// push less often on mainnet without changing the deterministic mark math.
const PUSH_MS = Number(process.env.KEEPER_PUSH_MS ?? TICK_MS);
```

At lines 30–31 replace `chain: baseSepolia` with `chain` (the resolved variable) in both `createWalletClient` and `createPublicClient`.

At line 117 replace `setInterval(pushMark, TICK_MS);` with:

```ts
  setInterval(pushMark, PUSH_MS);
```

(`TICK_MS` is still imported from `@shared`/`../../shared/constants` and still defines the curve; only the push interval changes.)

- [ ] **Step 2: Typecheck the oracle package**

Run: `cd oracle && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Set keeper env + fund the keeper wallet**

In the oracle's env (`oracle/.env` or the deploy host): `CHAIN_ID=8453`, `RPC_URL=https://mainnet.base.org`, `KEEPER_PUSH_MS=60000`, `KEEPER_PRIVATE_KEY=<keeper key>`, `ORACLE_ADDRESS=<from Task 4>`, `FUTURES_ADDRESS=<from Task 4>`, `USDA_MARS_API_KEY=<key>`. Send a small amount of real ETH (a couple dollars) to the keeper address for gas.

- [ ] **Step 4: Run the keeper and confirm marks land**

```bash
cd oracle && npm run start   # or: npx tsx src/keeper.ts
```

Expected logs: `keeper up · oracle <ORACLE> · keeper <addr>`, `[anchor] $… (real USDA: true|false)`. After one push, confirm on-chain:

```bash
cast call <ORACLE> "getMark()(uint64,uint64)" --rpc-url base   # -> non-zero price + recent ts
```

Expected: non-zero mark. Leave the keeper running for the smoke test; stop it when done (it's run-on-demand, not 24/7).

- [ ] **Step 5: Commit**

```bash
git add oracle/src/keeper.ts
git commit -m "feat(oracle): keeper follows CHAIN_ID/RPC_URL; decouple push cadence (KEEPER_PUSH_MS)"
```

---

## Task 7: End-to-end mainnet smoke (real money)

**Files:** none (manual verification of the full flow). Keeper from Task 6 must be running.

- [ ] **Step 1: Fund a test embedded wallet**

Sign in to the running app (email/Google) to create a Privy embedded wallet. Note its address `<W>`. Send it a few dollars of real USDC (canonical Base USDC) from any wallet/exchange. The first on-chain action will trigger `/api/faucet` to drip gas ETH; or pre-fund `<W>` with ~`0.0005` ETH.

```bash
cast call 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 "balanceOf(address)(uint256)" <W> --rpc-url base   # -> your USDC (6dp)
```

- [ ] **Step 2: Deposit (UI)**

In the app, click the primary "Deposit <amount>" button (`DepositButton.tsx` → `onCreditExisting`: `approve` + `Vault.deposit`). Then verify collateral landed:

```bash
cast call <VAULT> "balanceOf(address)(uint256)" <W> --rpc-url base   # -> deposited amount (6dp)
```

Expected: equals what you deposited; wallet USDC dropped by the same.

- [ ] **Step 3: Open a position (UI)**

On the trade page open a small LONG (`TradePanel.tsx:54` → `OnionFutures.open(side, margin, leverage, expiry)`). Verify:

```bash
cast call <FUTURES> "nextId()(uint256)" --rpc-url base                # -> incremented
cast call <FUTURES> "getUserPositions(address)(uint256[])" <W> --rpc-url base   # -> [id]
```

Expected: a position id exists; `Vault.balanceOf(<W>)` dropped by the margin (locked).

- [ ] **Step 4: Close the position (UI)**

In `PositionsList.tsx`, close the open position (`OnionFutures.close(id)`, valued vs the live mark — requires the keeper's mark to be fresh, which Task 6 provides). Verify:

```bash
cast call <FUTURES> "positions(uint256)(address,uint128,uint128,uint64,uint64,uint64,uint8,bool)" <id> --rpc-url base   # -> last field (closed) = true
cast call <VAULT> "balanceOf(address)(uint256)" <W> --rpc-url base   # -> margin ± pnl returned
```

Expected: position `closed == true`; collateral reflects the payout.

- [ ] **Step 5: Withdraw (cast — no UI button exists)**

`Vault.withdraw` is not wired to the UI, so confirm the round-trip with `cast` from the embedded wallet key (export it from Privy, or sign via your tooling):

```bash
cast send <VAULT> "withdraw(uint256)" <amount> --rpc-url base --private-key <W_KEY>
cast call 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 "balanceOf(address)(uint256)" <W> --rpc-url base   # -> USDC back in wallet
```

Expected: USDC returns to the embedded wallet; `Vault.balanceOf(<W>)` decreases by `<amount>`. The full deposit → trade → withdraw loop is proven on mainnet.

- [ ] **Step 6: Stop the keeper**

Stop the keeper process (run-on-demand). Record the deployed addresses somewhere durable for the next session.

---

## Self-Review

**Spec coverage:**
- Chain switch (5 hardcoded sites) → Tasks 1–2 (web: wagmi, contracts, providers, faucet) + Task 6 (keeper). ✓
- RPC env-name bug → Task 2 Step 1 (`NEXT_PUBLIC_RPC_URL`). ✓
- Contract mainnet deploy → Tasks 3–4. ✓
- Canonical USDC / immutability footgun → Task 1 (`USDC_BY_CHAIN`) + Task 3 (chainid default). ✓
- Gas (funded drip, not paymaster) → Task 2 (Base-tuned faucet) + Task 7 Step 1. ✓
- Keeper cost lever (slower cadence, run-on-demand) → Task 6 (`KEEPER_PUSH_MS`) + Task 7 Step 6. ✓
- House seed → Task 4. ✓
- Real-money bound (`MAX_DEPOSIT_USD`) → Task 5 Step 1. ✓
- End-to-end flow incl. withdraw → Task 7. ✓
- Out-of-scope (Blink, one-click) → untouched (no task modifies `sign-payment` or `onDepositBlink`). ✓

**Placeholder scan:** `<W>`, `<VAULT>`, etc. are runtime values from the live deploy (Task 4) / login (Task 7), not unfilled plan placeholders — they cannot be known at authoring time and each is defined where introduced.

**Type consistency:** `resolveChain` returns `{ chain, defaultRpcUrl, usdc }` in Task 1 and is destructured with those exact names in `lib/chain.ts` (Task 2) and `keeper.ts` (Task 6). `CHAIN`/`RPC_URL`/`USDC_ADDRESS` exported by `lib/chain.ts` match the imports in wagmi/contracts/providers/faucet.
