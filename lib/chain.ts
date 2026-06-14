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
