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
