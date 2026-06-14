"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CHAIN } from "@/lib/chain";
import { Toaster } from "sonner";
import { wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

  // Dev fallback: without an app id, run the app sans wallet so the landing page
  // and chart still work (wallet/deposit features need NEXT_PUBLIC_PRIVY_APP_ID).
  if (!appId) {
    return (
      <>
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
      </>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: { theme: "dark", accentColor: "#a3e635", logo: undefined },
        loginMethods: ["email", "google", "wallet"],
        defaultChain: CHAIN,
        supportedChains: [CHAIN],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
          <Toaster theme="dark" position="bottom-right" richColors />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
