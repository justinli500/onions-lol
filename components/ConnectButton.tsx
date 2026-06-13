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
    return <div className="h-9 w-28 animate-pulse rounded-lg bg-surface-2" />;
  }
  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-black transition hover:brightness-110 active:scale-95"
      >
        Sign in
      </button>
    );
  }
  return (
    <button
      onClick={logout}
      className="tabular h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground transition hover:bg-surface-2"
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
        className="h-9 cursor-not-allowed rounded-lg border border-border bg-surface px-4 text-sm font-medium text-muted"
      >
        Sign in
      </button>
    );
  }
  return <ConnectButtonInner />;
}
