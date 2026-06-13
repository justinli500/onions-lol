"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";

// NEXT_PUBLIC_ vars are inlined at build, so this matches providers.tsx exactly:
// when there's no app id, Privy isn't mounted, so we must NOT call its hooks.
const PRIVY_ENABLED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function ConnectButtonInner() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const addr = wallets[0]?.address;

  if (!ready) {
    return <div className="h-9 w-28 animate-pulse rounded-full bg-card border-2 border-red" />;
  }
  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="border-2 border-red bg-mustard text-red font-extrabold text-sm px-[18px] py-2 rounded-full active:scale-[0.96] transition-transform"
      >
        Sign in
      </button>
    );
  }
  return (
    <button
      onClick={logout}
      className="bg-card text-red border-2 border-red font-extrabold text-sm px-[18px] py-2 rounded-full active:scale-[0.96] transition-transform tabular"
      title={user?.email?.address ?? addr}
    >
      {short(addr) || "Connected"}
    </button>
  );
}

export function ConnectButton() {
  if (!PRIVY_ENABLED) {
    return (
      <button
        disabled
        title="Set NEXT_PUBLIC_PRIVY_APP_ID to enable sign-in"
        className="bg-card text-red border-2 border-red font-extrabold text-sm px-[18px] py-2 rounded-full cursor-not-allowed opacity-50"
      >
        Sign in
      </button>
    );
  }
  return <ConnectButtonInner />;
}
