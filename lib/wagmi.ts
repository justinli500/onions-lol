import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { CHAIN, RPC_URL } from "@/lib/chain";

// @privy-io/wagmi's createConfig so wagmi's read/write hooks drive the Privy
// embedded wallet. Chain + RPC come from the single switch in lib/chain.
export const wagmiConfig = createConfig({
  chains: [CHAIN],
  transports: { [CHAIN.id]: http(RPC_URL) },
});
