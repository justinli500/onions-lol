"use client";

import { useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { usePublicClient, useWriteContract } from "wagmi";
import { useBlinkDeposit } from "@swype-org/deposit/react";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { USDC_ADDRESS, VAULT_ADDRESS, erc20Abi, vaultAbi } from "@/lib/contracts";
import { msgOf } from "@/lib/err";

const PRIVY_ENABLED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const BLINK_ENV =
  (process.env.NEXT_PUBLIC_BLINK_ENV as "sandbox" | "production") ?? "sandbox";

async function waitForBalance(
  read: () => Promise<bigint>,
  target: bigint,
  timeoutMs: number,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((await read()) >= target) return true;
    await new Promise((r) => setTimeout(r, 2500));
  }
  return false;
}

function DepositInner({ onDeposited }: { onDeposited?: () => void }) {
  const { wallets } = useWallets();
  const addr = wallets[0]?.address as `0x${string}` | undefined;
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { requestDeposit, status } = useBlinkDeposit({
    signer: "/api/sign-payment",
    environment: BLINK_ENV,
  });
  const [amount, setAmount] = useState(25);
  const [busy, setBusy] = useState(false);

  async function readUsdc(): Promise<bigint> {
    if (!addr || !publicClient) return 0n;
    return (await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [addr],
    })) as bigint;
  }

  async function onDeposit() {
    if (!addr) return toast.error("Sign in first");
    if (!VAULT_ADDRESS) return toast.error("Vault not deployed yet");
    setBusy(true);
    try {
      const before = await readUsdc();
      const value = parseUnits(String(amount), 6);

      // 1) Blink pulls USDC into the embedded wallet via its hosted flow.
      await requestDeposit({
        amount,
        chainId: 84532,
        address: addr,
        token: USDC_ADDRESS,
      });
      toast.message("Funds on the way — waiting for settlement…");

      // 2) Wait for the on-chain balance to actually arrive (routing can lag).
      const ok = await waitForBalance(readUsdc, before + value, 120_000);
      if (!ok) return toast.error("Deposit didn't arrive in time — try again");
      toast.success("USDC received — crediting collateral…");

      // 3) Credit it to the Vault (embedded wallet signs both, seamlessly).
      await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [VAULT_ADDRESS, value],
      });
      await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "deposit",
        args: [value],
      });
      toast.success(`Deposited $${amount} to your collateral`);
      onDeposited?.();
    } catch (e) {
      toast.error(msgOf(e));
    } finally {
      setBusy(false);
    }
  }

  const loading = busy || status === "signer-loading" || status === "iframe-active";

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3">
        <span className="text-sm text-muted">$</span>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
          className="tabular w-full bg-transparent py-2 text-sm outline-none"
        />
      </label>
      <button
        onClick={onDeposit}
        disabled={loading}
        className="h-11 rounded-xl bg-accent font-semibold text-black transition hover:brightness-110 active:scale-95 disabled:opacity-60"
      >
        {loading ? "Depositing…" : "Deposit with Blink"}
      </button>
    </div>
  );
}

export function DepositButton(props: { onDeposited?: () => void }) {
  if (!PRIVY_ENABLED) {
    return (
      <button
        disabled
        title="Set NEXT_PUBLIC_PRIVY_APP_ID to enable deposits"
        className="h-11 w-full cursor-not-allowed rounded-xl border border-border bg-surface text-sm font-medium text-muted"
      >
        Deposit with Blink
      </button>
    );
  }
  return <DepositInner {...props} />;
}
