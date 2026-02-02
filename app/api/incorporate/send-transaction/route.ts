import { NextRequest, NextResponse } from "next/server";
import bs58 from "bs58";
import { JITO_ENDPOINTS, FALLBACK_RPC_URLS } from "@/lib/constants/solana";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";

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

      if (!response.ok) continue;

      const data = await response.json();

      if (data.error) continue;

      if (data.result) {
        return data.result;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// Send transaction via standard RPC as fallback
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

// POST /api/incorporate/send-transaction - Send a signed transaction to Solana
export async function POST(request: NextRequest) {
  // Require authentication
  const auth = await requireAuth(request);
  if (!isAuthResult(auth)) return auth;

  try {
    const body = await request.json();
    const { signedTransaction, useJito = true } = body;

    if (!signedTransaction) {
      return NextResponse.json(
        { error: "Missing signedTransaction" },
        { status: 400 },
      );
    }

    // Decode base64 transaction and encode to base58 for RPC
    const txBytes = Buffer.from(signedTransaction, "base64");
    const base58Tx = bs58.encode(txBytes);

    let signature: string | null = null;

    // Try Jito first for priority landing (if enabled)
    if (useJito) {
      signature = await sendViaJito(base58Tx);

      if (signature) {
        return NextResponse.json({
          signature,
          method: "jito",
        });
      }
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
      { status: 500 },
    );
  } catch (error) {
    console.error("Error sending transaction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
