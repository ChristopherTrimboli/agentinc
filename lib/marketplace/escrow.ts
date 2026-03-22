/**
 * Marketplace Escrow — Server-Managed SOL Escrow
 *
 * Uses the treasury wallet to hold funds in escrow.
 * SOL is transferred from the poster's wallet to treasury on task creation,
 * and from treasury to the worker's wallet on approval.
 *
 * Built on top of the existing x402 payment infrastructure.
 */

import prisma from "@/lib/prisma";
import {
  sendSolFromWallet,
  hasEnoughBalance,
  withWalletLock,
  getWalletBalance,
} from "@/lib/privy/wallet-service";
import {
  SOL_TREASURY_ADDRESS,
  issueRefund,
} from "@/lib/x402/sol-server-middleware";
import type { EscrowResult } from "./types";

const LAMPORTS_PER_SOL = 1_000_000_000;
const TREASURY_WALLET_ID = process.env.X402_TREASURY_WALLET_ID ?? "";

function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * LAMPORTS_PER_SOL));
}

/**
 * Resolve a user's active wallet for escrow operations.
 */
async function getUserWallet(
  userId: string,
): Promise<{ walletId: string; walletAddress: string } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeWallet: {
        select: { privyWalletId: true, address: true },
      },
    },
  });

  if (!user?.activeWallet?.privyWalletId || !user.activeWallet.address) {
    return null;
  }

  return {
    walletId: user.activeWallet.privyWalletId,
    walletAddress: user.activeWallet.address,
  };
}

/**
 * Create escrow: transfer SOL from poster's wallet to treasury.
 * Updates the task with escrow details on success.
 */
export async function createEscrow(
  userId: string,
  taskId: string,
  amountSol: number,
): Promise<EscrowResult> {
  if (!SOL_TREASURY_ADDRESS) {
    return { success: false, error: "Treasury not configured" };
  }

  const wallet = await getUserWallet(userId);
  if (!wallet) {
    return { success: false, error: "No wallet associated with account" };
  }

  const lamports = solToLamports(amountSol);

  return withWalletLock(wallet.walletAddress, async () => {
    const hasBalance = await hasEnoughBalance(wallet.walletAddress, lamports);
    if (!hasBalance) {
      return {
        success: false,
        error: `Insufficient balance: need ${amountSol} SOL`,
      };
    }

    const result = await sendSolFromWallet(
      wallet.walletId,
      wallet.walletAddress,
      SOL_TREASURY_ADDRESS,
      lamports,
    );

    if (!result.success) {
      return { success: false, error: result.error || "Transfer failed" };
    }

    await prisma.marketplaceTask.update({
      where: { id: taskId },
      data: {
        escrowAmount: amountSol,
        escrowTxSignature: result.signature,
        escrowStatus: "held",
      },
    });

    return { success: true, txSignature: result.signature };
  });
}

/**
 * Release escrow: transfer SOL from treasury to worker's wallet.
 * Optionally skip the DB status update (used by releaseMilestone which manages status itself).
 */
export async function releaseEscrow(
  taskId: string,
  workerWalletAddress: string,
  amountSol: number,
  options?: { skipStatusUpdate?: boolean },
): Promise<EscrowResult> {
  if (!SOL_TREASURY_ADDRESS || !TREASURY_WALLET_ID) {
    return {
      success: false,
      error: "Treasury wallet not configured for escrow release",
    };
  }

  const lamports = solToLamports(amountSol);

  return withWalletLock(SOL_TREASURY_ADDRESS, async () => {
    const treasuryBalance = await getWalletBalance(SOL_TREASURY_ADDRESS);
    if (treasuryBalance < lamports) {
      return { success: false, error: "Treasury insufficient balance" };
    }

    const result = await sendSolFromWallet(
      TREASURY_WALLET_ID,
      SOL_TREASURY_ADDRESS,
      workerWalletAddress,
      lamports,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Release transfer failed",
      };
    }

    if (!options?.skipStatusUpdate) {
      await prisma.marketplaceTask.update({
        where: { id: taskId },
        data: {
          escrowStatus: "released",
          settleTxSignature: result.signature,
        },
      });
    }

    return { success: true, txSignature: result.signature };
  });
}

/**
 * Refund escrow: return SOL from treasury to poster's wallet.
 */
export async function refundEscrow(
  taskId: string,
  posterWalletAddress: string,
  amountSol: number,
): Promise<EscrowResult> {
  if (!SOL_TREASURY_ADDRESS || !TREASURY_WALLET_ID) {
    return {
      success: false,
      error: "Treasury wallet not configured for refund",
    };
  }

  const lamports = solToLamports(amountSol);

  const task = await prisma.marketplaceTask.findUnique({
    where: { id: taskId },
    select: { escrowTxSignature: true, posterId: true },
  });

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  return withWalletLock(SOL_TREASURY_ADDRESS, async () => {
    const refundResult = await issueRefund(
      task.posterId,
      posterWalletAddress,
      lamports,
      amountSol,
      "Marketplace task escrow refund",
      task.escrowTxSignature || "",
    );

    if (!refundResult.success) {
      return { success: false, error: refundResult.error || "Refund failed" };
    }

    await prisma.marketplaceTask.update({
      where: { id: taskId },
      data: {
        escrowStatus: "refunded",
        settleTxSignature: refundResult.refundTxSignature,
      },
    });

    return { success: true, txSignature: refundResult.refundTxSignature };
  });
}

/**
 * Release a single milestone payment from escrow.
 */
export async function releaseMilestone(
  taskId: string,
  milestoneIndex: number,
  workerWalletAddress: string,
): Promise<EscrowResult> {
  const task = await prisma.marketplaceTask.findUnique({
    where: { id: taskId },
    select: { milestones: true, escrowStatus: true },
  });

  if (!task || task.escrowStatus !== "held") {
    return { success: false, error: "Task not found or escrow not held" };
  }

  const milestones = task.milestones as Array<{
    title: string;
    amountSol: number;
    status: string;
  }> | null;

  if (
    !milestones ||
    milestoneIndex < 0 ||
    milestoneIndex >= milestones.length
  ) {
    return { success: false, error: "Invalid milestone index" };
  }

  const milestone = milestones[milestoneIndex];
  if (milestone.status === "released") {
    return { success: false, error: "Milestone already released" };
  }

  const result = await releaseEscrow(
    taskId,
    workerWalletAddress,
    milestone.amountSol,
    { skipStatusUpdate: true },
  );
  if (!result.success) return result;

  milestones[milestoneIndex].status = "released";
  const allReleased = milestones.every((m) => m.status === "released");

  await prisma.marketplaceTask.update({
    where: { id: taskId },
    data: {
      milestones: milestones,
      escrowStatus: allReleased ? "released" : "held",
      ...(result.txSignature && { settleTxSignature: result.txSignature }),
    },
  });

  return result;
}

/**
 * Claim accumulated Bags creator fees for a task token and
 * forward the SOL to the worker. Returns the total SOL claimed.
 */
export async function claimTaskTokenFees(
  taskId: string,
  tokenMint: string,
  workerWalletAddress: string,
): Promise<EscrowResult & { claimedSol?: number }> {
  if (!SOL_TREASURY_ADDRESS || !TREASURY_WALLET_ID) {
    return {
      success: false,
      error: "Treasury wallet not configured for fee claiming",
    };
  }

  try {
    const { BagsSDK } = await import("@bagsfm/bags-sdk");
    const { Connection, PublicKey } = await import("@solana/web3.js");
    const { SOLANA_RPC_URL } = await import("@/lib/constants/solana");
    const { signTransaction, sendSignedTransaction } =
      await import("@/lib/solana");

    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return { success: false, error: "Bags API key not configured" };
    }

    const connection = new Connection(SOLANA_RPC_URL);
    const sdk = new BagsSDK(apiKey, connection, "confirmed");
    const treasuryPubkey = new PublicKey(SOL_TREASURY_ADDRESS);

    const allPositions = await sdk.fee.getAllClaimablePositions(treasuryPubkey);
    const taskPositions = allPositions.filter((p) => p.baseMint === tokenMint);

    if (taskPositions.length === 0) {
      await prisma.marketplaceTask.update({
        where: { id: taskId },
        data: { tokenFeesClaimed: 0 },
      });
      return { success: true, claimedSol: 0 };
    }

    // Hold wallet lock for the entire claim+forward cycle to prevent
    // balance measurement corruption from concurrent treasury operations
    const claimResult = await withWalletLock(SOL_TREASURY_ADDRESS, async () => {
      const balanceBefore = await getWalletBalance(SOL_TREASURY_ADDRESS);

      const claimTxs = await sdk.fee.getClaimTransactions(
        treasuryPubkey,
        new PublicKey(tokenMint),
      );

      if (claimTxs && claimTxs.length > 0) {
        for (const tx of claimTxs) {
          const txBase64 = Buffer.from(
            tx.serialize({
              requireAllSignatures: false,
              verifySignatures: false,
            }),
          ).toString("base64");

          const signedTx = await signTransaction(TREASURY_WALLET_ID, txBase64);
          await sendSignedTransaction(signedTx, { useJito: false });
        }
      }

      const balanceAfter = await getWalletBalance(SOL_TREASURY_ADDRESS);
      const claimedLamports = balanceAfter - balanceBefore;
      const claimedSol =
        claimedLamports > 0n ? Number(claimedLamports) / LAMPORTS_PER_SOL : 0;

      if (claimedSol > 0) {
        const sendResult = await sendSolFromWallet(
          TREASURY_WALLET_ID,
          SOL_TREASURY_ADDRESS,
          workerWalletAddress,
          claimedLamports,
        );

        if (!sendResult.success) {
          console.error(
            "[Task Token Fees] Failed to forward claimed fees:",
            sendResult.error,
          );
          return {
            success: false as const,
            error: `Claimed ${claimedSol} SOL but failed to forward: ${sendResult.error}`,
            claimedSol,
          };
        }
      }

      return { success: true as const, claimedSol };
    });

    if (!claimResult.success) {
      return claimResult;
    }

    const { claimedSol } = claimResult;

    await prisma.marketplaceTask.update({
      where: { id: taskId },
      data: { tokenFeesClaimed: claimedSol },
    });

    return { success: true, claimedSol, txSignature: undefined };
  } catch (error) {
    console.error("[Task Token Fees] Error claiming fees:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to claim token fees",
    };
  }
}
