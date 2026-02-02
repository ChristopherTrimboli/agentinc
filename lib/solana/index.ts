import { PrivyClient } from "@privy-io/node";
import { Connection } from "@solana/web3.js";
import bs58 from "bs58";

// Server-side Solana RPC (not exposed to client)
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

// Jito block engine endpoints for priority transaction landing
const JITO_ENDPOINTS = [
  "https://mainnet.block-engine.jito.wtf/api/v1/transactions",
  "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/transactions",
  "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/transactions",
  "https://ny.mainnet.block-engine.jito.wtf/api/v1/transactions",
  "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/transactions",
];

// Fallback RPC endpoints
const FALLBACK_RPC_URLS = [SOLANA_RPC_URL, "https://rpc.ankr.com/solana"];

// Singleton Privy client
let _privyClient: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (!_privyClient) {
    _privyClient = new PrivyClient({
      appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      appSecret: process.env.PRIVY_APP_SECRET!,
    });
  }
  return _privyClient;
}

// Get Solana connection
export function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

// Sign a transaction server-side using Privy embedded wallet
export async function signTransaction(
  walletId: string,
  transaction: string, // base64 encoded unsigned transaction
): Promise<string> {
  const privy = getPrivyClient();

  console.log("[Solana] Signing transaction with wallet:", walletId);

  const response = await privy.wallets().solana().signTransaction(walletId, {
    transaction,
  });

  // Response type uses snake_case
  const data = response as unknown as { signed_transaction: string };
  return data.signed_transaction;
}

// Sign and send transaction in one call (Privy handles sending)
// Note: We don't use this - we sign then send via Jito for priority
export async function signAndSendTransaction(
  walletId: string,
  transaction: string, // base64 encoded unsigned transaction
): Promise<{ signature: string }> {
  const privy = getPrivyClient();

  // caip2 is the Chain Agnostic Improvement Proposal 2 identifier
  // For Solana mainnet: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp
  const response = await privy
    .wallets()
    .solana()
    .signAndSendTransaction(walletId, {
      transaction,
      caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", // Solana mainnet
    });

  const data = response as unknown as { signature: string };
  return {
    signature: data.signature,
  };
}

// Send via Jito for priority landing
async function sendViaJito(base58Tx: string): Promise<string | null> {
  for (const jitoEndpoint of JITO_ENDPOINTS) {
    try {
      const response = await fetch(jitoEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendTransaction",
          params: [
            base58Tx,
            {
              encoding: "base58",
              skipPreflight: true,
              maxRetries: 0,
            },
          ],
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (data.error) continue;

      if (data.result) {
        console.log(`[Jito] Transaction sent via ${jitoEndpoint}`);
        return data.result;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// Send via standard RPC
async function sendViaRpc(base58Tx: string): Promise<string | null> {
  for (const rpcUrl of FALLBACK_RPC_URLS) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendTransaction",
          params: [
            base58Tx,
            {
              encoding: "base58",
              skipPreflight: false,
              preflightCommitment: "confirmed",
              maxRetries: 3,
            },
          ],
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();

      if (data.error) {
        if (data.error.message?.includes("insufficient")) {
          throw new Error(data.error.message);
        }
        continue;
      }

      if (data.result) {
        console.log(`[RPC] Transaction sent via ${rpcUrl}`);
        return data.result;
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("insufficient")) {
        throw err;
      }
      continue;
    }
  }
  return null;
}

// Send a signed transaction (base64) with Jito priority + RPC fallback
export async function sendSignedTransaction(
  signedTransaction: string, // base64 encoded signed transaction
  options: { useJito?: boolean } = { useJito: true },
): Promise<{ signature: string; method: "jito" | "rpc" }> {
  const txBytes = Buffer.from(signedTransaction, "base64");
  const base58Tx = bs58.encode(txBytes);

  // Try Jito first
  if (options.useJito) {
    const signature = await sendViaJito(base58Tx);
    if (signature) {
      return { signature, method: "jito" };
    }
  }

  // Fallback to RPC
  const signature = await sendViaRpc(base58Tx);
  if (signature) {
    return { signature, method: "rpc" };
  }

  throw new Error("Failed to send transaction via all endpoints");
}

// Full server-side flow: sign + send with Jito priority
export async function serverSignAndSend(
  walletId: string,
  transaction: string, // base64 encoded unsigned transaction
  options: { useJito?: boolean } = { useJito: true },
): Promise<{ signature: string; method: "jito" | "rpc" | "privy" }> {
  if (!walletId) {
    throw new Error("Wallet ID is required for server-side signing");
  }

  // Sign the transaction server-side
  const signedTransaction = await signTransaction(walletId, transaction);

  // Send with Jito priority
  const result = await sendSignedTransaction(signedTransaction, options);

  return result;
}

// Verify auth from request headers
export async function verifyAuth(
  idToken: string | null,
): Promise<{ userId: string; walletAddress: string; walletId: string } | null> {
  if (!idToken) return null;

  const privy = getPrivyClient();

  try {
    const user = await privy.users().get({ id_token: idToken });

    // Find the Solana embedded wallet - check multiple possible property names
    const solanaWallet = user.linked_accounts?.find((account) => {
      if (account.type !== "wallet") return false;

      const wallet = account as {
        chain_type?: string;
        chainType?: string;
        chain?: string;
      };

      return (
        wallet.chain_type === "solana" ||
        wallet.chainType === "solana" ||
        wallet.chain === "solana"
      );
    });

    if (!solanaWallet) {
      console.error(
        "[Solana] No Solana wallet found. Available accounts:",
        JSON.stringify(
          user.linked_accounts?.filter((a) => a.type === "wallet"),
          null,
          2,
        ),
      );
      return null;
    }

    const walletData = solanaWallet as { id: string; address: string };

    return {
      userId: user.id,
      walletAddress: walletData.address,
      walletId: walletData.id,
    };
  } catch (error) {
    console.error("[Solana] verifyAuth error:", error);
    return null;
  }
}

// Get recent blockhash
export async function getRecentBlockhash(): Promise<{
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const connection = getConnection();
  return connection.getLatestBlockhash("confirmed");
}
