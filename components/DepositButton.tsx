"use client";

import { useState } from "react";
import { useWallets, usePrivy } from "@privy-io/react-auth";
import { usePublicClient, useWriteContract } from "wagmi";
import { useBlinkDeposit } from "@swype-org/deposit/react";
import type { SignerRequest, SignerResponse } from "@swype-org/deposit";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { USDC_ADDRESS, VAULT_ADDRESS, erc20Abi, vaultAbi } from "@/lib/contracts";
import { useWalletUsdc } from "@/lib/useExchange";
import { fmtUSD } from "@/lib/format";
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
  const { getAccessToken } = usePrivy();
  const addr = wallets[0]?.address as `0x${string}` | undefined;
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { usdc: walletUsdc, refetch: refetchWallet } = useWalletUsdc();
  const [amount, setAmount] = useState(25);
  const [busy, setBusy] = useState(false);

  const signer = async (data: SignerRequest): Promise<SignerResponse> => {
    const token = await getAccessToken().catch(() => null);
    const res = await fetch("/api/sign-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(e.error ?? `signer ${res.status}`);
    }
    return res.json();
  };

  const { requestDeposit, status } = useBlinkDeposit({
    signer,
    environment: BLINK_ENV,
    preload: false,
    flowTimeoutMs: 90_000, // don't spin forever if Blink's flow stalls
  });

  async function readUsdc(): Promise<bigint> {
    if (!addr || !publicClient) return 0n;
    return (await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [addr],
    })) as bigint;
  }

  async function ensureGas() {
    const token = await getAccessToken().catch(() => null);
    await fetch("/api/faucet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ address: addr }),
    }).catch(() => {});
  }

  // approve + deposit whatever USDC is in the embedded wallet into the Vault.
  async function creditToVault(value: bigint) {
    if (!VAULT_ADDRESS) throw new Error("Vault not deployed");
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
  }

  async function onDepositBlink() {
    if (!addr) return toast.error("Sign in first");
    if (!VAULT_ADDRESS) return toast.error("Vault not deployed yet");
    setBusy(true);
    try {
      await ensureGas();
      const before = await readUsdc();
      const value = parseUnits(String(amount), 6);
      await requestDeposit({ amount, chainId: 84532, address: addr, token: USDC_ADDRESS });
      toast.message("Funds on the way — waiting for settlement…");
      const ok = await waitForBalance(readUsdc, before + value, 120_000);
      if (!ok) return toast.error("Deposit didn't arrive — try again or use the direct option");
      toast.success("USDC received — crediting collateral…");
      await creditToVault(value);
      toast.success(`Deposited $${amount} to your collateral`);
      onDeposited?.();
    } catch (e) {
      toast.error(msgOf(e));
    } finally {
      setBusy(false);
    }
  }

  // Fallback while Blink's sandbox routing is down: credit USDC the user has
  // already sent to their embedded wallet, straight into the Vault (our half).
  async function onCreditExisting() {
    if (!addr || !VAULT_ADDRESS) return;
    setBusy(true);
    try {
      await ensureGas();
      const bal = await readUsdc();
      if (bal <= 0n) return toast.error("No USDC in your embedded wallet yet");
      await creditToVault(bal);
      toast.success(`Credited ${fmtUSD(Number(bal) / 1e6)} to your collateral`);
      refetchWallet();
      onDeposited?.();
    } catch (e) {
      toast.error(msgOf(e));
    } finally {
      setBusy(false);
    }
  }

  const loading = busy || status === "signer-loading" || status === "iframe-active";

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3">
        <span className="text-sm text-ink/55">$</span>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
          className="tabular w-full bg-transparent py-2 text-sm outline-none"
        />
      </label>
      <button
        onClick={onDepositBlink}
        disabled={loading}
        className="w-full bg-green text-white font-display rounded-[12px] py-3 active:scale-[0.985] transition hover:brightness-105 disabled:opacity-60"
      >
        {loading ? "Depositing…" : "Deposit with Blink"}
      </button>

      {/* Fallback path — Blink sandbox routing is currently flaky */}
      {addr && (
        <details className="rounded-lg border border-line bg-paper p-3 text-xs text-ink/55">
          <summary className="cursor-pointer select-none">
            Blink stuck? Deposit directly instead
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            <p>
              Send Base Sepolia USDC to your embedded wallet, then credit it:
            </p>
            <code className="break-all rounded bg-card px-2 py-1 text-[11px]">
              {addr}
            </code>
            <p>In wallet now: {fmtUSD(walletUsdc)}</p>
            <button
              onClick={onCreditExisting}
              disabled={busy || walletUsdc <= 0}
              className="w-full bg-green text-white font-display rounded-[12px] py-3 active:scale-[0.985] transition hover:brightness-105 disabled:opacity-50"
            >
              {busy ? "Crediting…" : `Credit ${fmtUSD(walletUsdc)} to collateral`}
            </button>
          </div>
        </details>
      )}
    </div>
  );
}

export function DepositButton(props: { onDeposited?: () => void }) {
  if (!PRIVY_ENABLED) {
    return (
      <button
        disabled
        title="Set NEXT_PUBLIC_PRIVY_APP_ID to enable deposits"
        className="w-full cursor-not-allowed bg-green/40 text-white font-display rounded-[12px] py-3 text-sm"
      >
        Deposit with Blink
      </button>
    );
  }
  return <DepositInner {...props} />;
}
