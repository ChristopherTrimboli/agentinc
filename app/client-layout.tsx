"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import UserSync from "./components/UserSync";
import SessionExpiredModal from "./components/SessionExpiredModal";

// Configure Solana connectors (required even if not using external wallets)
const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: false,
});

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // Only allow email login
        loginMethods: ["email"],
        // Appearance customization
        appearance: {
          theme: "dark",
          accentColor: "#a855f7", // Purple to match your brand
        },
        // Create Solana embedded wallet automatically, disable Ethereum
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
          solana: {
            createOnLogin: "all-users",
          },
        },
        // Configure external Solana connectors (suppresses warning)
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        // Solana RPC configuration - using Helius for reliable client-side RPC
        solana: {
          rpcs: {
            "solana:mainnet": {
              rpc: createSolanaRpc(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                process.env.NEXT_PUBLIC_SOLANA_RPC_URL!.replace(
                  "https://",
                  "wss://",
                ),
              ),
            },
          },
        },
      }}
    >
      <AuthProvider>
        <UserSync />
        <SessionExpiredModal />
        {children}
      </AuthProvider>
    </PrivyProvider>
  );
}
