"use client";

import { useAccount, useReadContract } from "wagmi";
import { VAULT_ADDRESS, USDC_ADDRESS, vaultAbi, erc20Abi } from "@/lib/contracts";
import { fromUSDC } from "@/lib/format";

/** User's collateral balance held in the Vault (USD). */
export function useCollateral() {
  const { address } = useAccount();
  const q = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!VAULT_ADDRESS, refetchInterval: 5000 },
  });
  return {
    collateral: q.data !== undefined ? fromUSDC(q.data as bigint) : 0,
    refetch: q.refetch,
    address,
  };
}

/** USDC sitting in the user's embedded wallet (pre-deposit). */
export function useWalletUsdc() {
  const { address } = useAccount();
  const q = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 4000 },
  });
  return {
    usdc: q.data !== undefined ? fromUSDC(q.data as bigint) : 0,
    refetch: q.refetch,
    address,
  };
}
