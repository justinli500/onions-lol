"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useBalance, useWriteContract, useSendTransaction } from "wagmi";
import { parseUnits, parseEther, formatEther } from "viem";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { USDC_ADDRESS } from "@/lib/contracts";
import { useWalletUsdc } from "@/lib/useExchange";
import { fmtUSD } from "@/lib/format";
import { msgOf } from "@/lib/err";
import { cn } from "@/lib/cn";
import { SPRING_SNAPPY } from "@/lib/animations";

// abi/ERC20.json does NOT include `transfer`, so we use a minimal inline ABI for
// the cash-out call (everything else — balanceOf/approve — stays on erc20Abi).
const transferAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const isAddr = (s: string) => ADDR_RE.test(s);

function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function CopyIcon({ done }: { done: boolean }) {
  return done ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function WalletMenu() {
  const { user, logout, exportWallet } = usePrivy();
  const { wallets } = useWallets();
  const addr = wallets[0]?.address as `0x${string}` | undefined;

  const { usdc, refetch } = useWalletUsdc();
  const ethBal = useBalance({ address: addr, query: { enabled: !!addr } });
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const [open, setOpen] = useState(false);
  const [dest, setDest] = useState("");
  const [usdcAmt, setUsdcAmt] = useState("");
  const [ethAmt, setEthAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  // Close on outside-click and Escape while open.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Let other parts of the app (e.g. the trade panel's "Cash out" link) open this menu.
  useEffect(() => {
    const openMenu = () => setOpen(true);
    window.addEventListener("onions:open-wallet", openMenu);
    return () => window.removeEventListener("onions:open-wallet", openMenu);
  }, []);

  const ethNum = ethBal.data ? Number(formatEther(ethBal.data.value)) : 0;
  const ethSym = ethBal.data?.symbol ?? "ETH";
  const ethDisplay = ethBal.data ? `${ethNum.toFixed(4)} ${ethSym}` : "—";

  const destOk = isAddr(dest);
  const usdcNum = Number(usdcAmt);
  const ethSend = Number(ethAmt);
  const usdcOk = destOk && usdcNum > 0 && usdcNum <= usdc;
  const ethOk = destOk && ethSend > 0 && ethSend <= ethNum;

  function copy() {
    if (!addr) return;
    navigator.clipboard
      .writeText(addr)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => toast.error("Couldn't copy"));
  }

  async function sendUsdc() {
    if (!destOk) return toast.error("Enter a valid 0x address");
    if (!(usdcNum > 0)) return toast.error("Enter an amount");
    if (usdcNum > usdc) return toast.error("Amount exceeds USDC balance");
    setBusy(true);
    try {
      await writeContractAsync({
        address: USDC_ADDRESS,
        abi: transferAbi,
        functionName: "transfer",
        args: [dest as `0x${string}`, parseUnits(String(usdcNum), 6)],
      });
      toast.success(`Sent ${fmtUSD(usdcNum)} to ${short(dest)}`);
      setUsdcAmt("");
      refetch();
    } catch (e) {
      toast.error(msgOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendEth() {
    if (!destOk) return toast.error("Enter a valid 0x address");
    if (!(ethSend > 0)) return toast.error("Enter an amount");
    if (ethSend > ethNum) return toast.error("Amount exceeds ETH balance");
    setBusy(true);
    try {
      await sendTransactionAsync({
        to: dest as `0x${string}`,
        value: parseEther(String(ethSend)),
      });
      toast.success(`Sent ${ethSend} ${ethSym} to ${short(dest)}`);
      setEthAmt("");
      ethBal.refetch();
    } catch (e) {
      toast.error(msgOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    try {
      await (addr ? exportWallet({ address: addr }) : exportWallet());
    } catch (e) {
      toast.error(msgOf(e));
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 bg-card text-red border-2 border-red font-extrabold text-sm px-2.5 py-2 rounded-full sm:px-[18px] active:scale-[0.96] transition-transform tabular"
        title={user?.email?.address ?? "Wallet — balance, cash out, export"}
        aria-expanded={open}
      >
        <span>{short(addr) || "Wallet"}</span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={cn("transition-transform", open && "rotate-180")}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={SPRING_SNAPPY}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 z-50 mt-2 w-[300px] rounded-2xl surface-card p-4"
          >
            {/* Header */}
            <div className="flex items-center gap-1.5">
              <span className="tabular text-sm font-extrabold text-ink">{short(addr)}</span>
              <button
                onClick={copy}
                title="Copy address"
                className="grid h-5 w-5 place-items-center rounded text-ink/50 transition-colors hover:text-red"
              >
                <CopyIcon done={copied} />
              </button>
            </div>
            {user?.email?.address && (
              <div className="mt-0.5 truncate text-xs text-ink/60">{user.email.address}</div>
            )}

            {/* Balances */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl surface-inset px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-ink/50">USDC</div>
                <div className="tabular text-sm font-semibold text-ink">{fmtUSD(usdc)}</div>
              </div>
              <div className="rounded-xl surface-inset px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-ink/50">{ethSym}</div>
                <div className="tabular text-sm font-semibold text-ink">{ethDisplay}</div>
              </div>
            </div>

            {/* Cash out */}
            <div className="mt-4">
              <div className="mb-1 text-xs text-ink/60">Cash out to</div>
              <input
                value={dest}
                onChange={(e) => setDest(e.target.value.trim())}
                placeholder="0x… destination address"
                spellCheck={false}
                className={cn(
                  "tabular w-full rounded-xl surface-inset px-3 py-2 text-xs text-ink outline-none placeholder:text-ink/40",
                  dest && !destOk && "ring-1 ring-red",
                )}
              />
              {dest && !destOk && (
                <p className="mt-1 text-[11px] font-semibold text-red">Enter a valid 0x address</p>
              )}
            </div>

            {/* USDC send */}
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-ink/60">
                <span>Send USDC</span>
                <button
                  type="button"
                  onClick={() => setUsdcAmt(String(usdc))}
                  className="font-semibold text-mustard-dp hover:underline"
                >
                  Max
                </button>
              </div>
              <div className="flex gap-2">
                <label className="flex flex-1 items-center gap-1 rounded-xl surface-inset px-3">
                  <span className="text-sm text-ink/50">$</span>
                  <input
                    type="number"
                    min={0}
                    value={usdcAmt}
                    onChange={(e) => setUsdcAmt(e.target.value)}
                    placeholder="0.00"
                    className="tabular w-full bg-transparent py-2 text-sm text-ink outline-none"
                  />
                </label>
                <button
                  onClick={sendUsdc}
                  disabled={busy || !usdcOk}
                  className="shrink-0 rounded-full border-2 border-red px-3 py-2 text-xs font-bold text-red transition hover:bg-red/[0.08] active:scale-[0.97] disabled:opacity-50"
                >
                  {busy ? "…" : "Send USDC"}
                </button>
              </div>
            </div>

            {/* ETH send */}
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-ink/60">
                <span>Send {ethSym}</span>
                <span className="tabular text-ink/50">{ethDisplay}</span>
              </div>
              <div className="flex gap-2">
                <label className="flex flex-1 items-center gap-1 rounded-xl surface-inset px-3">
                  <input
                    type="number"
                    min={0}
                    value={ethAmt}
                    onChange={(e) => setEthAmt(e.target.value)}
                    placeholder="0.0000"
                    className="tabular w-full bg-transparent py-2 text-sm text-ink outline-none"
                  />
                </label>
                <button
                  onClick={sendEth}
                  disabled={busy || !ethOk}
                  className="shrink-0 rounded-full border-2 border-red px-3 py-2 text-xs font-bold text-red transition hover:bg-red/[0.08] active:scale-[0.97] disabled:opacity-50"
                >
                  {busy ? "…" : `Send ${ethSym}`}
                </button>
              </div>
            </div>

            {/* Export + Disconnect */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <button
                onClick={onExport}
                className="rounded-full border-2 border-red px-3 py-2 text-xs font-bold text-red transition hover:bg-red/[0.08] active:scale-[0.97]"
              >
                Export key
              </button>
              <button
                onClick={() => logout()}
                className="rounded-full bg-red px-3 py-2 text-xs font-bold text-paper transition hover:brightness-110 active:scale-[0.97]"
              >
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
