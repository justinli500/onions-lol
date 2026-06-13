// Blink merchant signer. PROVEN in the Phase 1 spike against the live sandbox:
// base64url(payload) -> ECDSA P-256/SHA-256, DER encoding (Node default;
// IEEE-P1363 was rejected with MERCHANT_SIGNATURE_INVALID). Node runtime is
// required for node:crypto P-256 signing; the private key never leaves the server.
import { createSign, randomUUID } from "node:crypto";

export const runtime = "nodejs";

const MERCHANT_ID = process.env.MERCHANT_ID;
// PEM may be stored single-line with literal \n in env — normalize.
const MERCHANT_PRIVATE_KEY = process.env.MERCHANT_PRIVATE_KEY?.replace(/\\n/g, "\n");

export async function POST(req: Request) {
  if (!MERCHANT_ID || !MERCHANT_PRIVATE_KEY) {
    return Response.json({ error: "signer not configured" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const amount = (body.amount as number | null) ?? null;
  const chainId = body.chainId as number;
  const address = body.address as string;
  const token = body.token as string;
  const callbackScheme = (body.callbackScheme as string | null) ?? null;
  if (chainId == null || !address || !token) {
    return Response.json({ error: "missing chainId/address/token" }, { status: 400 });
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
