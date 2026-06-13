"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";

function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

export function ConnectButton() {
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
