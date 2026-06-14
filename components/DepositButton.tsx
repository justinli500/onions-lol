"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useWallets, usePrivy } from "@privy-io/react-auth";
import { usePublicClient, useWriteContract } from "wagmi";
import { Deposit } from "@swype-org/deposit";
import type { DepositStatus, DepositRequest, SignerRequest, SignerResponse } from "@swype-org/deposit";
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

// Remount-safe Blink integration. The SDK's own useBlinkDeposit nulls its ref in
// effect cleanup but recreates it only on render, so a re-render/Strict-Mode
// double-invoke crashes on `.on` of null. Here the Deposit is created INSIDE the
// effect, so the instance + subscription live and die together — no null ref.
function useSafeBlinkDeposit(getToken: () => Promise<string | null>) {
  const [status, setStatus] = useState<DepositStatus>("idle");
  const depositRef = useRef<Deposit | null>(null);
  const getTokenRef = useRef(getToken);
  // Keep the latest getToken without resubscribing the Deposit. Updated in an
  // effect (every render, no deps) rather than during render to satisfy
  // react-hooks/refs — behavior is identical since getTokenRef.current is only
  // read inside the async signer, which always runs after this effect.
  useEffect(() => {
    getTokenRef.current = getToken;
  });

  useEffect(() => {
    const signer = async (data: SignerRequest): Promise<SignerResponse> => {
      const token = await getTokenRef.current().catch(() => null);
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
    const d = new Deposit({
      signer,
      environment: BLINK_ENV,
      preload: false,
      flowTimeoutMs: 90_000,
      // One-tap flow (the "one click, never leaves the app" the prize rewards).
      // NOTE: pay with USDC, not native ETH — ETH->USDC needs a testnet swap that
      // can't be priced (MANUAL_TRANSFER_PRICE_PROBE_FAILED); USDC->USDC is direct.
      enableFullWidget: false,
    });
    depositRef.current = d;
    const onStatus = (s: DepositStatus) => setStatus(s);
    d.on("status-change", onStatus);
    return () => {
      try {
        d.off("status-change", onStatus);
        d.destroy();
      } catch {
        /* noop */
      }
      depositRef.current = null;
    };
  }, []);

  const requestDeposit = useCallback((req: DepositRequest) => {
    const d = depositRef.current;
    return d ? d.requestDeposit(req) : Promise.reject(new Error("deposit not ready"));
  }, []);

  return { status, requestDeposit };
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

  const { requestDeposit, status } = useSafeBlinkDeposit(getAccessToken);

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
      {/* PRIMARY: one-click deposit of USDC already in your wallet */}
      <div className="flex justify-between text-xs">
        <span className="text-ink/55">In your wallet</span>
        <span className="tabular text-ink">{fmtUSD(walletUsdc)}</span>
      </div>
      <button
        onClick={onCreditExisting}
        disabled={busy || walletUsdc <= 0}
        className="w-full bg-green text-white font-display rounded-[12px] py-3 active:scale-[0.985] transition hover:brightness-105 disabled:opacity-50"
      >
        {busy ? "Depositing…" : walletUsdc > 0 ? `Deposit ${fmtUSD(walletUsdc)}` : "No USDC in wallet yet"}
      </button>
      {addr && walletUsdc <= 0 && (
        <p className="text-xs text-ink/55">
          Send Base Sepolia USDC to{" "}
          <code className="break-all rounded bg-card px-1 py-0.5 text-[11px] text-ink">{addr}</code>, then deposit.
        </p>
      )}

      {/* SECONDARY: Blink one-tap (showcased; testnet routing flaky — pay with USDC) */}
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-ink/45">
        <span className="h-px flex-1 bg-line" />
        or pay with Blink
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-1 rounded-lg border border-line bg-paper px-3">
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
          className="shrink-0 rounded-full border-2 border-red px-3 py-2 text-sm font-bold text-red transition hover:bg-red/[0.08] active:scale-[0.97] disabled:opacity-50"
        >
          {loading ? "Working…" : "Pay with Blink"}
        </button>
      </div>
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
        Deposit
      </button>
    );
  }
  return <DepositInner {...props} />;
}
