// Blink merchant signer (spike). Mirrors the documented scheme exactly:
// base64url(JSON payload) -> ECDSA P-256 / SHA-256 sign the ENCODED STRING.
// Node's createSign(...).sign(pem) emits DER by default (the doc's reference code).
// We also expose an IEEE-P1363 (raw r||s) variant so the hosted-flow probe can
// prove empirically which encoding Blink's verifier actually accepts.
import { createSign, sign as cryptoSign, createPrivateKey, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const PRIV_PEM = readFileSync(new URL('./.keys/merchant_private.pem', import.meta.url));
const reg = JSON.parse(readFileSync(new URL('./registration.json', import.meta.url), 'utf8'));
export const MERCHANT_ID = reg.merchantId;

export function buildSignedDeposit({
  amount,
  chainId,
  address,
  token,
  callbackScheme = null,
  encoding = 'der', // 'der' | 'ieee-p1363'
}) {
  const idempotencyKey = randomUUID();
  const payloadObject = {
    amount,
    chainId,
    address,
    token,
    idempotencyKey,
    callbackScheme,
    signatureTimestamp: new Date().toISOString(), // ISO-8601 per docs
    version: 'v1',
  };
  const payload = Buffer.from(JSON.stringify(payloadObject), 'utf8').toString('base64url');

  let signature;
  if (encoding === 'ieee-p1363') {
    signature = cryptoSign('sha256', Buffer.from(payload), {
      key: createPrivateKey(PRIV_PEM),
      dsaEncoding: 'ieee-p1363',
    }).toString('base64url');
  } else {
    const s = createSign('SHA256');
    s.update(payload);
    s.end();
    signature = s.sign(PRIV_PEM).toString('base64url'); // DER (Node default)
  }

  return {
    merchantId: MERCHANT_ID,
    payload,
    signature,
    preview: { amount, chainId, address, token, idempotencyKey },
  };
}

export function hostedUrl({ merchantId, payload, signature }, base = 'https://pay-sandbox.blink.cash') {
  const u = new URL(base);
  u.searchParams.set('merchantId', merchantId);
  u.searchParams.set('payload', payload);
  u.searchParams.set('signature', signature);
  return u.toString();
}
