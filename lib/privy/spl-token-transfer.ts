/**
 * SPL Token Transfer via Privy
 *
 * Sends SPL tokens from a server-managed Privy wallet to a recipient address.
 * Used for the agent token payment flow where users pay AI inference costs
 * with the agent's own SPL token at a 20% discount vs. paying in SOL.
 *
 * Supports both TOKEN_PROGRAM and TOKEN_2022_PROGRAM mints.
 * Creates the recipient's ATA on-demand when it doesn't exist.
 */

import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import {
  createComputeBudgetInstructions,
  COMPUTE_UNITS,
} from "@/lib/solana/fees";
import { getPrivyClient } from "@/lib/auth/verifyRequest";
import { getAuthorizationContext } from "@/lib/privy/wallet-service";
import { validatePrivySignResponse } from "@/lib/x402/validation";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TokenTransferResult {
  success: boolean;
  signature?: string;
  /** Human-readable error message, present when success is false */
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Determine whether a mint belongs to TOKEN_2022_PROGRAM or legacy TOKEN_PROGRAM */
async function detectTokenProgram(
  connection: Connection,
  mint: PublicKey,
): Promise<PublicKey> {
  try {
    const info = await connection.getAccountInfo(mint);
    if (info?.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      return TOKEN_2022_PROGRAM_ID;
    }
  } catch {
    // Default to legacy program on failure
  }
  return TOKEN_PROGRAM_ID;
}

// ── Transfer ─────────────────────────────────────────────────────────────────

/**
 * Send SPL tokens from a server-owned Privy wallet to a recipient.
 *
 * Steps:
 * 1. Detect token program (TOKEN vs TOKEN_2022)
 * 2. Verify sender holds enough tokens
 * 3. Create recipient's ATA if it doesn't exist
 * 4. Build + sign versioned transaction via Privy
 * 5. Submit and confirm on-chain
 *
 * @param walletId - Privy wallet ID (must be server-owned)
 * @param walletAddress - Sender's Solana address
 * @param recipientAddress - Recipient's Solana address
 * @param mintAddress - SPL token mint address
 * @param tokenAmount - Amount in human-readable units (e.g. 1.5 tokens)
 * @param decimals - Token decimal places (from mint metadata)
 */
export async function sendTokensFromWallet(
  walletId: string,
  walletAddress: string,
  recipientAddress: string,
  mintAddress: string,
  tokenAmount: number,
  decimals: number,
): Promise<TokenTransferResult> {
  try {
    const privy = getPrivyClient();
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");

    const fromPubkey = new PublicKey(walletAddress);
    const toPubkey = new PublicKey(recipientAddress);
    const mintPubkey = new PublicKey(mintAddress);

    const tokenProgram = await detectTokenProgram(connection, mintPubkey);
    const rawAmount = BigInt(Math.round(tokenAmount * Math.pow(10, decimals)));

    if (rawAmount <= 0n) {
      return { success: false, error: "Token amount rounds to zero" };
    }

    // Derive sender's ATA and verify balance
    const senderAta = await getAssociatedTokenAddress(
      mintPubkey,
      fromPubkey,
      false,
      tokenProgram,
    );

    try {
      const balanceResult = await connection.getTokenAccountBalance(senderAta);
      const currentBalance = BigInt(balanceResult.value.amount);
      if (currentBalance < rawAmount) {
        const currentUi = Number(currentBalance) / Math.pow(10, decimals);
        return {
          success: false,
          error: `Insufficient token balance: have ${currentUi}, need ${tokenAmount}`,
        };
      }
    } catch {
      return {
        success: false,
        error: "Token account not found — no balance for this mint",
      };
    }

    // Derive recipient's ATA; allowOwnerOffCurve=true in case treasury is a PDA
    const recipientAta = await getAssociatedTokenAddress(
      mintPubkey,
      toPubkey,
      true,
      tokenProgram,
    );

    const ixs = [];

    // Create recipient ATA on-demand (idempotent at the instruction level)
    const recipientAccount = await connection.getAccountInfo(recipientAta);
    if (!recipientAccount) {
      ixs.push(
        createAssociatedTokenAccountInstruction(
          fromPubkey,
          recipientAta,
          toPubkey,
          mintPubkey,
          tokenProgram,
        ),
      );
    }

    ixs.push(
      createTransferInstruction(
        senderAta,
        recipientAta,
        fromPubkey,
        rawAmount,
        [],
        tokenProgram,
      ),
    );

    const priorityIxs = await createComputeBudgetInstructions(
      COMPUTE_UNITS.TOKEN_TRANSFER,
      [walletAddress, recipientAddress],
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const message = new TransactionMessage({
      payerKey: fromPubkey,
      recentBlockhash: blockhash,
      instructions: [...priorityIxs, ...ixs],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);
    const unsignedTx = Buffer.from(transaction.serialize()).toString("base64");

    const authContext = getAuthorizationContext();
    const rawResult = await privy.wallets().solana().signTransaction(walletId, {
      transaction: unsignedTx,
      authorization_context: authContext,
    });

    const validation = validatePrivySignResponse(rawResult);
    if (!validation.success) {
      return { success: false, error: validation.error || "Signing failed" };
    }

    const signedTxBuffer = Buffer.from(
      validation.data.signed_transaction,
      "base64",
    );

    const signature = await connection.sendRawTransaction(signedTxBuffer, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );

    return { success: true, signature };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SPLTransfer] Token transfer failed:", msg);
    return { success: false, error: msg };
  }
}
