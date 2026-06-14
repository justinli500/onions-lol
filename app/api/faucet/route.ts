// Gas faucet: drips a little Base Sepolia ETH to a user's embedded wallet so it
// can pay for approve/deposit/open/close (Blink funds it with USDC but no ETH).
// Not an open spigot: same-origin, idempotent (only when low), and — when Privy
// server creds are set — bound to the authenticated user's own wallet.
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN, RPC_URL } from "@/lib/chain";

export const runtime = "nodejs";

const RPC = RPC_URL;
const FAUCET_KEY = (process.env.FAUCET_PRIVATE_KEY || process.env.KEEPER_PRIVATE_KEY) as
  | `0x${string}`
  | undefined;
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
const DRIP = parseEther(process.env.FAUCET_DRIP_ETH || "0.0003");
const MIN = parseEther(process.env.FAUCET_MIN_ETH || "0.0001"); // skip if already funded

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const o = new URL(origin).host;
    if (o === new URL(req.url).host) return true;
    return ALLOWED_ORIGINS.some((a) => {
      try { return new URL(a).host === o; } catch { return a === o; }
    });
  } catch { return false; }
}

async function authedOk(req: Request, address: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    if (process.env.NODE_ENV === "production") return { ok: false, status: 500, error: "faucet auth not configured" };
    return { ok: true };
  }
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!token) return { ok: false, status: 401, error: "missing auth token" };
  try {
    const { PrivyClient } = await import("@privy-io/server-auth");
    const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    const claims = await privy.verifyAuthToken(token);
    const owner = await privy.getUserByWalletAddress(address);
    if (!owner || owner.id !== claims.userId) return { ok: false, status: 403, error: "address not owned by user" };
    return { ok: true };
  } catch {
    return { ok: false, status: 401, error: "invalid auth token" };
  }
}

export async function POST(req: Request) {
  if (!FAUCET_KEY) return Response.json({ error: "faucet not configured" }, { status: 500 });
  if (!originAllowed(req)) return Response.json({ error: "forbidden origin" }, { status: 403 });

  let body: { address?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "invalid JSON" }, { status: 400 }); }
  const address = String(body.address ?? "");
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return Response.json({ error: "invalid address" }, { status: 400 });

  const auth = await authedOk(req, address);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
  const bal = await pub.getBalance({ address: address as `0x${string}` });
  if (bal >= MIN) return Response.json({ ok: true, skipped: true, balance: formatEther(bal) });

  const wallet = createWalletClient({ account: privateKeyToAccount(FAUCET_KEY), chain: CHAIN, transport: http(RPC) });
  const hash = await wallet.sendTransaction({ to: address as `0x${string}`, value: DRIP });
  return Response.json({ ok: true, hash, dripped: formatEther(DRIP) }, { headers: { "Cache-Control": "no-store" } });
}
