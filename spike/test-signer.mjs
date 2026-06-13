// Unit test for the merchant signer. Asserts the EXACT encoding we produce
// (DER / ASN.1) and that it verifies against the registered public key over the
// base64url payload string. (Which encoding Blink *accepts* is proven separately
// by probe-hosted.mjs against the live sandbox.)
import { buildSignedDeposit, MERCHANT_ID } from './sign.mjs';
import { createVerify, createPublicKey } from 'node:crypto';
import { readFileSync } from 'node:fs';

const PUB = createPublicKey(readFileSync(new URL('./.keys/merchant_public.pem', import.meta.url)));
let pass = 0, fail = 0;
const check = (name, cond) => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}`); };

const args = { amount: 25, chainId: 84532, address: '0x' + 'a'.repeat(40), token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' };

const der = buildSignedDeposit({ ...args, encoding: 'der' });
const decoded = JSON.parse(Buffer.from(der.payload, 'base64url').toString('utf8'));
check('payload base64url round-trips', decoded.chainId === 84532 && decoded.token === args.token);
check('version is "v1"', decoded.version === 'v1');
check('signatureTimestamp is ISO-8601', !Number.isNaN(Date.parse(decoded.signatureTimestamp)));
check('idempotencyKey is UUID v4', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(decoded.idempotencyKey));

const derBytes = Buffer.from(der.signature, 'base64url');
check('DER signature is ASN.1 SEQUENCE (first byte 0x30)', derBytes[0] === 0x30);
check('DER signature length 70-72 bytes', derBytes.length >= 70 && derBytes.length <= 72);
check('DER signature verifies (P-256/SHA-256 over base64url payload)',
  createVerify('SHA256').update(der.payload).end().verify(PUB, derBytes));
check('merchantId present from registration', typeof MERCHANT_ID === 'string' && MERCHANT_ID.length === 36);

const p = buildSignedDeposit({ ...args, encoding: 'ieee-p1363' });
const pBytes = Buffer.from(p.signature, 'base64url');
check('P1363 variant is exactly 64 bytes (raw r||s)', pBytes.length === 64);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
