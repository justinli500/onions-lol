// Blink merchant signer. Signing scheme PROVEN in the Phase 1 spike against the
// live sandbox: base64url(payload) -> ECDSA P-256/SHA-256, DER encoding.
//
// Security: this endpoint signs with the merchant key, so it must NOT be an open
// signature oracle. Defenses (always on): allow-list token + chainId, bound the
// amount, validate the address, and same-origin check. When Privy server creds
// are configured it ALSO requires a valid Privy session and binds the signed
// `address` to that authenticated user. In production it refuses to sign at all
// unless that auth is configured.
import { createSign, randomUUID } from "node:crypto";

export const runtime = "nodejs";

const MERCHANT_ID = process.env.MERCHANT_ID;
const MERCHANT_PRIVATE_KEY = process.env.MERCHANT_PRIVATE_KEY?.replace(/\\n/g, "\n");
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
const USDC = (
  process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
).toLowerCase();
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532);
const MAX_AMOUNT = Number(process.env.MAX_DEPOSIT_USD ?? 10_000);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin requests may omit Origin / non-browser
  try {
    const o = new URL(origin).host;
    if (o === new URL(req.url).host) return true;
    return ALLOWED_ORIGINS.some((a) => {
      try {
        return new URL(a).host === o;
      } catch {
        return a === o;
      }
    });
  } catch {
    return false;
  }
}

type AuthResult =
  | { kind: "ok"; userId: string }
  | { kind: "skip" }
  | { kind: "deny"; status: number; error: string };

// Verify the Privy session and bind `address` to the authenticated user.
async function checkAuth(req: Request, address: string): Promise<AuthResult> {
  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) return { kind: "skip" };
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { kind: "deny", status: 401, error: "missing auth token" };
  try {
    const { PrivyClient } = await import("@privy-io/server-auth");
    const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    const claims = await privy.verifyAuthToken(token);
    const owner = await privy.getUserByWalletAddress(address);
    if (!owner || owner.id !== claims.userId) {
      return { kind: "deny", status: 403, error: "address not owned by authenticated user" };
    }
    return { kind: "ok", userId: claims.userId };
  } catch {
    return { kind: "deny", status: 401, error: "invalid auth token" };
  }
}

export async function POST(req: Request) {
  if (!MERCHANT_ID || !MERCHANT_PRIVATE_KEY) {
    return Response.json({ error: "signer not configured" }, { status: 500 });
  }
  if (!originAllowed(req)) {
    return Response.json({ error: "forbidden origin" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const amount = (body.amount as number | null) ?? null;
  const chainId = Number(body.chainId);
  const address = String(body.address ?? "");
  const token = String(body.token ?? "");
  const callbackScheme = (body.callbackScheme as string | null) ?? null;

  // allow-lists + bounds (always enforced)
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return Response.json({ error: "invalid address" }, { status: 400 });
  }
  if (chainId !== CHAIN_ID) {
    return Response.json({ error: "unsupported chainId" }, { status: 400 });
  }
  if (token.toLowerCase() !== USDC) {
    return Response.json({ error: "unsupported token" }, { status: 400 });
  }
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT)) {
    return Response.json({ error: "amount out of range" }, { status: 400 });
  }

  // authentication (required when configured; never an open oracle in prod)
  const auth = await checkAuth(req, address);
  if (auth.kind === "deny") {
    return Response.json({ error: auth.error }, { status: auth.status });
  }
  if (auth.kind === "skip" && process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "signer auth not configured (set PRIVY_APP_SECRET)" },
      { status: 500 },
    );
  }

  const idempotencyKey = randomUUID();
  const payloadObject = {
    amount,
    chainId,
    address,
    token,
    idempotencyKey,
    callbackScheme,
    signatureTimestamp: new Date().toISOString(),
    version: "v1",
  };
  const payload = Buffer.from(JSON.stringify(payloadObject), "utf8").toString("base64url");
  const signer = createSign("SHA256");
  signer.update(payload); // sign the ENCODED string, not the raw JSON
  signer.end();
  const signature = signer.sign(MERCHANT_PRIVATE_KEY).toString("base64url"); // DER

  return Response.json(
    {
      merchantId: MERCHANT_ID,
      payload,
      signature,
      preview: { amount, chainId, address, token, idempotencyKey },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
