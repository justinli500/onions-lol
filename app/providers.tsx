"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseSepolia } from "viem/chains";
import { Toaster } from "sonner";
import { wagmiConfig } from "@/lib/wagmi";
import { DEMO_MODE, DemoProvider } from "@/lib/demo";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

  // Demo mode: bypass Privy + wagmi entirely and run on mocked in-memory state
  // so the full trading UI is interactive with no wallet or deployed backend.
  if (DEMO_MODE) {
    return (
      <DemoProvider>
        {children}
        <Toaster theme="light" position="bottom-right" richColors />
      </DemoProvider>
    );
  }

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
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia],
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
