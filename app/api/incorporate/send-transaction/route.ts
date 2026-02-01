import { NextResponse } from "next/server";
import bs58 from "bs58";

// Jito block engine endpoints for priority transaction landing
const JITO_ENDPOINTS = [
  "https://mainnet.block-engine.jito.wtf/api/v1/transactions",
  "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/transactions",
  "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/transactions",
  "https://ny.mainnet.block-engine.jito.wtf/api/v1/transactions",
  "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/transactions",
];

// Fallback RPC endpoints
const SOLANA_RPC_URLS = [
  process.env.SOLANA_RPC_URL || "https://mainnet.helius-rpc.com",
  "https://rpc.ankr.com/solana",
  "https://solana-mainnet.g.alchemy.com/v2/demo",
];

// Send transaction via Jito for priority landing
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

      if (!response.ok) {
        console.log(`[Jito] ${jitoEndpoint} returned ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.error) {
        console.log(`[Jito] ${jitoEndpoint} error:`, data.error.message);
        continue;
      }

      if (data.result) {
        console.log(`[Jito] Transaction sent successfully via ${jitoEndpoint}`);
        return data.result;
      }
    } catch (err) {
      console.log(`[Jito] ${jitoEndpoint} failed:`, err instanceof Error ? err.message : "Unknown error");
      continue;
    }
  }
  return null;
}

// Send transaction via standard RPC as fallback
async function sendViaRpc(base58Tx: string): Promise<string | null> {
  for (const rpcUrl of SOLANA_RPC_URLS) {
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

      if (!response.ok) {
        console.log(`[RPC] ${rpcUrl} returned ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.error) {
        console.log(`[RPC] ${rpcUrl} error:`, data.error.message);
        if (data.error.message?.includes("insufficient")) {
          throw new Error(data.error.message);
        }
        continue;
      }

      if (data.result) {
        console.log(`[RPC] Transaction sent successfully via ${rpcUrl}`);
        return data.result;
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("insufficient")) {
        throw err;
      }
      console.log(`[RPC] ${rpcUrl} failed:`, err instanceof Error ? err.message : "Unknown error");
      continue;
    }
  }
  return null;
}

// POST /api/incorporate/send-transaction - Send a signed transaction to Solana
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signedTransaction, useJito = true } = body;

    if (!signedTransaction) {
      return NextResponse.json(
        { error: "Missing signedTransaction" },
        { status: 400 }
      );
    }

    // Decode base64 transaction and encode to base58 for RPC
    const txBytes = Buffer.from(signedTransaction, "base64");
    const base58Tx = bs58.encode(txBytes);

    let signature: string | null = null;

    // Try Jito first for priority landing (if enabled)
    if (useJito) {
      console.log("[Send] Attempting Jito submission for priority landing...");
      signature = await sendViaJito(base58Tx);
      
      if (signature) {
        return NextResponse.json({
          signature,
          method: "jito",
        });
      }
      console.log("[Send] Jito failed, falling back to standard RPC...");
    }

    // Fallback to standard RPC
    signature = await sendViaRpc(base58Tx);

    if (signature) {
      return NextResponse.json({
        signature,
        method: "rpc",
      });
    }

    return NextResponse.json(
      { error: "Failed to send transaction via all endpoints" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error sending transaction:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send transaction";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
