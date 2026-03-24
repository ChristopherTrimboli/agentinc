import { NextRequest, NextResponse } from "next/server";
import { VersionedTransaction } from "@solana/web3.js";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import {
  signTransaction,
  sendSignedTransaction,
  simulateSignedTransaction,
  confirmTransactionBySignature,
  getRecentBlockhash,
} from "@/lib/solana";
import { rateLimitByUser } from "@/lib/rateLimit";

/**
 * Replace the blockhash in an unsigned base64 transaction with a fresh one.
 * Works with both legacy and versioned transactions.
 */
async function refreshBlockhash(txBase64: string): Promise<string> {
  const txBytes = Buffer.from(txBase64, "base64");
  const tx = VersionedTransaction.deserialize(txBytes);
  const { blockhash } = await getRecentBlockhash();
  tx.message.recentBlockhash = blockhash;
  return Buffer.from(tx.serialize()).toString("base64");
}

/**
 * POST /api/incorporate/send-transaction
 *
 * Two modes:
 *   1. `transaction` (unsigned base64) — server refreshes blockhash, signs via
 *      Privy, simulates, sends, and optionally confirms. Eliminates stale-
 *      blockhash issues entirely. Preferred for fee-config transactions.
 *   2. `signedTransaction` (signed base64) — legacy path for client-signed
 *      launch transactions. Simulates (soft-fail on BlockhashNotFound) and sends.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "incorporate-send-tx", 20);
  if (limited) return limited;

  try {
    const body = await request.json();
    const {
      transaction,
      signedTransaction,
      useJito = true,
      confirm = false,
    } = body;

    // ── Path 1: unsigned transaction → server signs ──────────────────
    if (transaction) {
      if (!auth.walletId) {
        return NextResponse.json(
          { error: "No wallet found for server-side signing" },
          { status: 400 },
        );
      }

      const freshTx = await refreshBlockhash(transaction);
      const signed = await signTransaction(auth.walletId, freshTx);

      const sim = await simulateSignedTransaction(signed);
      if (sim.err) {
        const logSummary = sim.logs?.slice(-5).join(" | ") ?? "no logs";
        console.error(
          "[Incorporate Send Tx] Simulation failed:",
          JSON.stringify(sim.err),
          logSummary,
        );
        return NextResponse.json(
          {
            error: `Transaction simulation failed: ${JSON.stringify(sim.err)}`,
            logs: sim.logs?.slice(-5),
          },
          { status: 400 },
        );
      }

      const result = await sendSignedTransaction(signed, { useJito });

      if (confirm) {
        try {
          await confirmTransactionBySignature(result.signature, 60_000, 1_500);
        } catch {
          console.warn(
            `[Incorporate Send Tx] Confirmation timed out for ${result.signature} — tx was sent`,
          );
          return NextResponse.json({
            signature: result.signature,
            method: result.method,
            confirmed: false,
          });
        }
      }

      return NextResponse.json({
        signature: result.signature,
        method: result.method,
        confirmed: confirm,
      });
    }

    // ── Path 2: signed transaction → send directly ───────────────────
    if (signedTransaction) {
      const sim = await simulateSignedTransaction(signedTransaction);
      if (sim.err) {
        const errStr = JSON.stringify(sim.err);
        if (!errStr.includes("BlockhashNotFound")) {
          const logSummary = sim.logs?.slice(-5).join(" | ") ?? "no logs";
          console.error(
            "[Incorporate Send Tx] Simulation failed:",
            errStr,
            logSummary,
          );
          return NextResponse.json(
            {
              error: `Transaction simulation failed: ${errStr}`,
              logs: sim.logs?.slice(-5),
            },
            { status: 400 },
          );
        }
        console.warn(
          "[Incorporate Send Tx] Stale blockhash in simulation — proceeding to send",
        );
      }

      const result = await sendSignedTransaction(signedTransaction, {
        useJito,
      });

      if (confirm) {
        try {
          await confirmTransactionBySignature(result.signature, 60_000, 1_500);
        } catch {
          console.warn(
            `[Incorporate Send Tx] Confirmation timed out for ${result.signature} — tx was sent`,
          );
          return NextResponse.json({
            signature: result.signature,
            method: result.method,
            confirmed: false,
          });
        }
      }

      return NextResponse.json({
        signature: result.signature,
        method: result.method,
        confirmed: confirm,
      });
    }

    return NextResponse.json(
      { error: "Missing transaction or signedTransaction" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[Incorporate Send Tx] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
