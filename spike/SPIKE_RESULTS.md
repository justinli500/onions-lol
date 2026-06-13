# Phase 1 Blink Spike — Empirical Results (2026-06-13)

All facts below were proven against the **live** Blink sandbox, not from docs.
Method: registered a real sandbox merchant, signed payloads with our P-256 key,
loaded the hosted flow headlessly (Playwright + system Chrome) and captured the
backend calls. Scripts: `sign.mjs`, `test-signer.mjs`, `probe-hosted.mjs`.

## VERIFIED (gates for contracts — all resolved)

| Unknown | Result | Evidence |
|---|---|---|
| **Chain serviced** | Base Sepolia **84532** ✅ (and Sepolia **11155111** ✅) | `/v1/manual-transfers/sources` lists both; a 201 session was created for 84532 |
| **USDC token (84532)** | **`0x036CbD53842c5426634e7929541eC2318f3dCF7e`**, 6 decimals | Returned by Blink's own `sources` + the created session (NOT the SDK's mainnet example). = Circle canonical Base Sepolia USDC (supports EIP-2612 permit) |
| **Signature encoding** | **DER / ASN.1** (Node `createSign().sign()` default) ✅ | DER → 201 session created; **IEEE-P1363 → `422 MERCHANT_SIGNATURE_INVALID`** |
| **Sig algorithm** | `ECDSA_P256_SHA256` over the **base64url payload string** | `/v1/merchants/{id}/public-key` reports `algorithm: ECDSA_P256_SHA256`; our key round-trips |
| **Merchant registration** | Auto-**APPROVED** instantly | `POST /v1/merchants/applications` → `202` `status: "APPROVED"` |
| **Settlement model** | "manual-transfer session": `awaiting_deposit` → user sends to `depositAddress` → Relay routes → `destinationTxHash`/`deliveredAmountUsd` set | full 201 session body |

## Captured constants (for .env / contracts)
- `MERCHANT_ID = d3da8dad-f912-4323-83b9-837f23df90e4` (sandbox; tied to the keypair in `.keys/`, gitignored)
- `BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e` (6 decimals)
- Sandbox source min: **USDC $1.00**, ETH $3.00. Sources: 84532 ETH/USDC, 11155111 ETH/USDC.
- Sepolia USDC (fallback) = `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

## Integration contract (verified from package source @swype-org/deposit@0.3.19, zero-dep)
- Signer receives `SignerRequest {amount, chainId, address, token, callbackScheme, url, version:'v1', reference?, metadata?}`.
- Signer returns `SignerResponse {merchantId, payload, signature, preview:{amount,chainId,address,token,idempotencyKey}}`.
- Inner payload (base64url'd then DER-signed): `{amount, chainId, address, token, idempotencyKey(uuidv4), callbackScheme, signatureTimestamp(ISO-8601), version:'v1'}`. Max sig age 15 min.
- `DepositResult.transfer.destinations[].token.address` = actual landed token (capture path).
- `requestDeposit` must be from a user gesture. `environment:'sandbox'` → `pay-sandbox.blink.cash`.

## NOT yet physically demonstrated (needs a funded source wallet)
- An actual USDC transfer **landing** in a destination wallet + the terminal `transfer.status` string. The session reaches `awaiting_deposit` with a `depositAddress`; for a **same-chain 84532 USDC source, depositAddress == destination** (user sends USDC directly to their own embedded wallet). Confirming the final landing requires sending real testnet USDC. Risk is low (infra live, session creates, chain+token confirmed). → **The balance-watch gating on the embedded wallet's on-chain USDC balance is load-bearing** (cross-chain routing is real).
