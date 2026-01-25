"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import UserSync from "./components/UserSync";

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
      }}
    >
      <UserSync />
      {children}
    </PrivyProvider>
  );
}
