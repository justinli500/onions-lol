// Onion oracle keeper. Single persistent process (run on the VPS):
//  - pushes the deterministic synthetic mark on-chain every TICK_MS (so contract
//    PnL matches the chart within one tick)
//  - refreshes the USDA-derived anchor (single on-chain source the web app reads)
//  - settles positions at/after expiry against that anchor (the "real" USDA price)
// The mark math is imported from the SAME shared module the web app uses, so the
// chart and chain never drift.
import "dotenv/config";
import { createWalletClient, createPublicClient, http, type Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { markAtE8, dayStartMs } from "../../shared/mark";
import { PRICE_SCALE, TICK_MS, DEFAULT_ANCHOR_USD } from "../../shared/constants";
import oracleAbi from "../../abi/OnionOracle.json" with { type: "json" };
import futuresAbi from "../../abi/OnionFutures.json" with { type: "json" };
import { fetchOnionAnchorUsd } from "./usda";

const RPC = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const PK = process.env.KEEPER_PRIVATE_KEY as `0x${string}` | undefined;
const ORACLE = process.env.ORACLE_ADDRESS as `0x${string}` | undefined;
const FUTURES = process.env.FUTURES_ADDRESS as `0x${string}` | undefined;
const USDA_KEY = process.env.USDA_MARS_API_KEY;

if (!PK || !ORACLE) {
  console.error("KEEPER_PRIVATE_KEY and ORACLE_ADDRESS are required");
  process.exit(1);
}

const account = privateKeyToAccount(PK);
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const oracle = oracleAbi as Abi;
const futures = futuresAbi as Abi;

let anchorUsd = DEFAULT_ANCHOR_USD;
let anchorE8 = Math.round(anchorUsd * PRICE_SCALE);
const settledExpiries = new Set<string>();

async function refreshAnchor() {
  const real = await fetchOnionAnchorUsd(USDA_KEY);
  if (real != null) anchorUsd = real; // else carry-forward
  anchorE8 = Math.round(anchorUsd * PRICE_SCALE);
  const effectiveTs = Math.floor(dayStartMs(Date.now()) / 1000);
  await wallet.writeContract({
    address: ORACLE!,
    abi: oracle,
    functionName: "setAnchor",
    args: [BigInt(anchorE8), BigInt(effectiveTs)],
  });
  console.log(`[anchor] $${anchorUsd.toFixed(2)} (real USDA: ${real != null})`);
}

async function pushMark() {
  const now = Date.now();
  const mark = markAtE8(anchorE8, now);
  try {
    await wallet.writeContract({
      address: ORACLE!,
      abi: oracle,
      functionName: "setMark",
      args: [BigInt(mark), BigInt(Math.floor(now / 1000))],
    });
  } catch (e) {
    console.error("[mark] push failed:", (e as Error).message);
  }
}

// Settle expired positions against the current anchor so users can claim.
async function settleDue() {
  if (!FUTURES) return;
  try {
    const nextId = (await pub.readContract({
      address: FUTURES,
      abi: futures,
      functionName: "nextId",
    })) as bigint;
    const nowS = BigInt(Math.floor(Date.now() / 1000));
    for (let id = 0n; id < nextId; id++) {
      const p = (await pub.readContract({
        address: FUTURES,
        abi: futures,
        functionName: "positions",
        args: [id],
      })) as readonly [string, bigint, bigint, bigint, bigint, bigint, number, boolean];
      const expiry = p[5];
      const closed = p[7];
      if (closed || expiry > nowS) continue;
      const key = expiry.toString();
      if (settledExpiries.has(key)) continue;
      const existing = (await pub.readContract({
        address: ORACLE!,
        abi: oracle,
        functionName: "getSettlement",
        args: [expiry],
      })) as bigint;
      if (existing > 0n) {
        settledExpiries.add(key);
        continue;
      }
      await wallet.writeContract({
        address: ORACLE!,
        abi: oracle,
        functionName: "setSettlement",
        args: [expiry, BigInt(anchorE8)],
      });
      settledExpiries.add(key);
      console.log(`[settle] expiry ${key} -> $${anchorUsd.toFixed(2)}`);
    }
  } catch (e) {
    console.error("[settle] failed:", (e as Error).message);
  }
}

async function main() {
  console.log(`keeper up · oracle ${ORACLE} · keeper ${account.address}`);
  await refreshAnchor();
  await pushMark();
  setInterval(pushMark, TICK_MS);
  setInterval(refreshAnchor, 6 * 60 * 60 * 1000); // every 6h
  setInterval(settleDue, 30_000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
