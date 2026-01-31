import { NextResponse } from "next/server";

const SOLANA_RPC_URLS = [
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  "https://rpc.ankr.com/solana",
  "https://solana-mainnet.g.alchemy.com/v2/demo",
];

// POST /api/incorporate/send-transaction - Send a signed transaction to Solana
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signedTransaction } = body;

    if (!signedTransaction) {
      return NextResponse.json(
        { error: "Missing signedTransaction" },
        { status: 400 }
      );
    }

    // Decode the base64 transaction to base58 for RPC
    const txBytes = Buffer.from(signedTransaction, "base64");
    
    // Convert to base58 for the RPC call
    const bs58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let num = BigInt(0);
    for (const byte of txBytes) {
      num = num * BigInt(256) + BigInt(byte);
    }
    
    let base58 = "";
    while (num > 0) {
      base58 = bs58Chars[Number(num % BigInt(58))] + base58;
      num = num / BigInt(58);
    }
    
    // Add leading '1's for leading zeros
    for (const byte of txBytes) {
      if (byte === 0) base58 = "1" + base58;
      else break;
    }

    // Try each RPC endpoint
    let lastError: Error | null = null;
    
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
              base58,
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
          throw new Error(`RPC request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message || "Transaction failed");
        }

        if (data.result) {
          return NextResponse.json({
            signature: data.result,
          });
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("Unknown error");
        console.error(`RPC ${rpcUrl} failed:`, lastError.message);
        continue;
      }
    }

    return NextResponse.json(
      { error: lastError?.message || "Failed to send transaction" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error sending transaction:", error);
    return NextResponse.json(
      { error: "Failed to send transaction" },
      { status: 500 }
    );
  }
}
