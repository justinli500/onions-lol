"use client";

import { usePrivy } from "@privy-io/react-auth";
import { DEMO_MODE, DEMO_ADDRESS } from "@/lib/demo";
import { WalletMenu } from "@/components/WalletMenu";

// NEXT_PUBLIC_ vars are inlined at build, so this matches providers.tsx exactly:
// when there's no app id, Privy isn't mounted, so we must NOT call its hooks.
const PRIVY_ENABLED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function ConnectButtonInner() {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) {
    return <div className="h-9 w-24 animate-pulse sm:w-28 rounded-full bg-card border-2 border-red" />;
  }
  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="border-2 border-red bg-mustard text-red font-extrabold text-sm px-2.5 py-2 rounded-full sm:px-[18px] active:scale-[0.96] transition-transform"
      >
        Sign in
      </button>
    );
  }
  return <WalletMenu />;
}

export function ConnectButton() {
  if (DEMO_MODE) {
    return (
      <button
        title="Demo mode — login bypassed"
        className="bg-card text-red border-2 border-red font-extrabold text-sm px-2.5 py-2 rounded-full sm:px-[18px] tabular"
      >
        {short(DEMO_ADDRESS)}
      </button>
    );
  }
  if (!PRIVY_ENABLED) {
    return (
      <button
        disabled
        title="Set NEXT_PUBLIC_PRIVY_APP_ID to enable sign-in"
        className="bg-card text-red border-2 border-red font-extrabold text-sm px-2.5 py-2 rounded-full sm:px-[18px] cursor-not-allowed opacity-50"
      >
        Sign in
      </button>
    );
  }
  return <ConnectButtonInner />;
}
