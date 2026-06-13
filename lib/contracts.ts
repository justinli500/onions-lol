import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import OnionOracleAbi from "@/abi/OnionOracle.json";
import VaultAbi from "@/abi/Vault.json";
import OnionFuturesAbi from "@/abi/OnionFutures.json";
import ERC20Abi from "@/abi/ERC20.json";

export const CHAIN = baseSepolia;

const env = (k: string) => process.env[k] as `0x${string}` | undefined;

// Phase-1 confirmed Base Sepolia USDC (Blink's sandbox delivers this token).
export const USDC_ADDRESS =
  (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`) ??
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export const ORACLE_ADDRESS = env("NEXT_PUBLIC_ORACLE_ADDRESS");
export const VAULT_ADDRESS = env("NEXT_PUBLIC_VAULT_ADDRESS");
export const FUTURES_ADDRESS = env("NEXT_PUBLIC_FUTURES_ADDRESS");

export const oracleAbi = OnionOracleAbi as Abi;
export const vaultAbi = VaultAbi as Abi;
export const futuresAbi = OnionFuturesAbi as Abi;
export const erc20Abi = ERC20Abi as Abi;

export const SIDE = { LONG: 0, SHORT: 1 } as const;
