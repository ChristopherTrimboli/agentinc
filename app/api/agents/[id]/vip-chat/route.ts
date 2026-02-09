import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Minimum token ownership percentage (0.1% = 0.001) to access VIP chat */
const VIP_THRESHOLD_PERCENT = 0.001;

// ── Solana helpers ──────────────────────────────────────────────────

function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

async function getTokenSupply(tokenMint: string): Promise<number> {
  const connection = getConnection();
  const mint = new PublicKey(tokenMint);
  const supply = await connection.getTokenSupply(mint);
  return supply.value.uiAmount ?? 0;
}

async function getTokenBalance(
  walletAddress: string,
  tokenMint: string,
): Promise<number> {
  const connection = getConnection();
  try {
    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(tokenMint);
    const ata = await getAssociatedTokenAddress(mint, wallet);
    const account = await connection.getTokenAccountBalance(ata);
    return account.value.uiAmount ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Check if a wallet holds >= 0.1% of an agent's token supply.
 */
async function checkVipAccess(
  walletAddress: string,
  tokenMint: string,
): Promise<{
  hasAccess: boolean;
  balance: number;
  totalSupply: number;
  threshold: number;
}> {
  const [balance, totalSupply] = await Promise.all([
    getTokenBalance(walletAddress, tokenMint),
    getTokenSupply(tokenMint),
  ]);

  const threshold = totalSupply * VIP_THRESHOLD_PERCENT;
  return {
    hasAccess: balance >= threshold && balance > 0,
    balance,
    totalSupply,
    threshold,
  };
}

// ── GET /api/agents/[id]/vip-chat ───────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    // Fetch agent to verify it exists and has a token
    const agent = await prisma.agent.findUnique({
      where: { id },
      select: { id: true, tokenMint: true, isMinted: true },
      cacheStrategy: { ttl: 60, swr: 120 },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.isMinted || !agent.tokenMint) {
      return NextResponse.json(
        { error: "This agent does not have a token" },
        { status: 400 },
      );
    }

    // Check optional auth for VIP access status
    const authResult = await requireAuth(req);
    let vipAccess = null;

    if (isAuthResult(authResult)) {
      // Look up user's wallet
      const user = await prisma.user.findUnique({
        where: { id: authResult.userId },
        select: { walletAddress: true },
      });

      if (user?.walletAddress) {
        vipAccess = await checkVipAccess(user.walletAddress, agent.tokenMint);
      }
    }

    // Only return messages if user has verified VIP access
    let messages: {
      id: string;
      content: string;
      walletAddress: string;
      createdAt: Date;
    }[] = [];
    if (vipAccess?.hasAccess) {
      const dbMessages = await prisma.agentChatMessage.findMany({
        where: { agentId: id, isVip: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      messages = dbMessages.reverse();
    }

    return NextResponse.json({
      messages,
      vipAccess,
      thresholdPercent: VIP_THRESHOLD_PERCENT * 100,
    });
  } catch (error) {
    console.error("[VipChat] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load VIP chat" },
      { status: 500 },
    );
  }
}

// ── POST /api/agents/[id]/vip-chat ──────────────────────────────────

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Require authentication
  const authResult = await requireAuth(req);
  if (!isAuthResult(authResult)) return authResult;

  // Rate limit: 10 messages per minute per user
  const rlResponse = await rateLimitByUser(authResult.userId, "vip-chat", 10);
  if (rlResponse) return rlResponse;

  try {
    // Parse body
    const { content } = await req.json();

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 },
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: "Message is too long (max 500 characters)" },
        { status: 400 },
      );
    }

    // Fetch agent
    const agent = await prisma.agent.findUnique({
      where: { id },
      select: { id: true, tokenMint: true, isMinted: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.isMinted || !agent.tokenMint) {
      return NextResponse.json(
        { error: "This agent does not have a token" },
        { status: 400 },
      );
    }

    // Get user's wallet address
    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      select: { walletAddress: true },
    });

    if (!user?.walletAddress) {
      return NextResponse.json(
        { error: "No wallet connected. Please connect your wallet." },
        { status: 400 },
      );
    }

    // Verify VIP access (on-chain token check)
    const access = await checkVipAccess(user.walletAddress, agent.tokenMint);

    if (!access.hasAccess) {
      return NextResponse.json(
        {
          error: `You need at least ${VIP_THRESHOLD_PERCENT * 100}% of the token supply to access VIP chat`,
          balance: access.balance,
          threshold: access.threshold,
        },
        { status: 403 },
      );
    }

    // Save message
    const message = await prisma.agentChatMessage.create({
      data: {
        content: content.trim(),
        walletAddress: user.walletAddress,
        agentId: agent.id,
        userId: authResult.userId,
        isVip: true,
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("[VipChat] POST error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
