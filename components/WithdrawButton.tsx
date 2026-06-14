"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { VAULT_ADDRESS, vaultAbi } from "@/lib/contracts";
import { useCollateral } from "@/lib/useExchange";
import { fmtUSD } from "@/lib/format";
import { msgOf } from "@/lib/err";

export function WithdrawButton({ onWithdrawn }: { onWithdrawn?: () => void }) {
  const { collateral, refetch } = useCollateral();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);

  // Default to the full balance when the field is left empty/zero.
  const amt = amount > 0 ? amount : collateral;

  async function withdraw() {
    if (!VAULT_ADDRESS) return toast.error("Vault not deployed");
    if (amt <= 0) return toast.error("Nothing to withdraw");
    if (amt > collateral) return toast.error("Amount exceeds collateral");
    setBusy(true);
    try {
      await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "withdraw",
        args: [parseUnits(String(amt), 6)],
      });
      toast.success(`Withdrew ${fmtUSD(amt)} to your wallet`);
      refetch();
      onWithdrawn?.();
    } catch (e) {
      toast.error(msgOf(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-xs text-ink/60">
        <span>Amount</span>
        <button
          type="button"
          onClick={() => setAmount(Math.floor(collateral))}
          className="text-mustard-dp font-semibold hover:underline"
        >
          Avail {fmtUSD(collateral)} · MAX
        </button>
      </div>
      <label className="flex items-center gap-2 rounded-xl surface-inset px-3 focus-within:border-red/40 transition-colors">
        <span className="text-sm text-ink/50">$</span>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          className="tabular w-full bg-transparent py-2 text-sm text-ink outline-none"
        />
      </label>
      <button
        onClick={withdraw}
        disabled={busy || amt <= 0 || amt > collateral}
        className="w-full rounded-[12px] border-2 border-red py-3 font-display text-red transition hover:bg-red/[0.08] active:scale-[0.985] disabled:opacity-50"
      >
        {busy
          ? "Withdrawing…"
          : amt > collateral
            ? "Amount exceeds collateral"
            : `Withdraw ${fmtUSD(amt)}`}
      </button>
    </div>
  );
}
