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

export const ORACLE_ADDRESS = undef(process.env.NEXT_PUBLIC_ORACLE_ADDRESS);
export const VAULT_ADDRESS = undef(process.env.NEXT_PUBLIC_VAULT_ADDRESS);
export const FUTURES_ADDRESS = undef(process.env.NEXT_PUBLIC_FUTURES_ADDRESS);

export const oracleAbi = OnionOracleAbi as Abi;
export const vaultAbi = VaultAbi as Abi;
export const futuresAbi = OnionFuturesAbi as Abi;
export const erc20Abi = ERC20Abi as Abi;

export const SIDE = { LONG: 0, SHORT: 1 } as const;
