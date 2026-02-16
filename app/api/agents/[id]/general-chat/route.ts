import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ── GET /api/agents/[id]/general-chat ───────────────────────────────

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    // Fetch agent to verify it exists and has a token
    // Supports both database ID and tokenMint for dual-use URLs
    const [agentById, agentByMint] = await Promise.all([
      prisma.agent.findUnique({
        where: { id },
        select: { id: true, isMinted: true },
        cacheStrategy: { ttl: 60, swr: 120 },
      }),
      prisma.agent.findUnique({
        where: { tokenMint: id },
        select: { id: true, isMinted: true },
        cacheStrategy: { ttl: 60, swr: 120 },
      }),
    ]);

    const agent = agentById || agentByMint;

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.isMinted) {
      return NextResponse.json(
        { error: "This agent has not been minted" },
        { status: 400 },
      );
    }

    // Check optional auth
    const authResult = await requireAuth(req);
    const isAuthenticated = isAuthResult(authResult);

    // General chat is readable by anyone (even unauthenticated)
    const messages = await prisma.agentChatMessage.findMany({
      where: { agentId: agent.id, isVip: false },
      orderBy: { createdAt: "desc" },
      take: 100,
      cacheStrategy: { ttl: 30, swr: 60 },
    });

    return NextResponse.json({
      messages: messages.reverse(),
      isAuthenticated,
    });
  } catch (error) {
    console.error("[GeneralChat] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load general chat" },
      { status: 500 },
    );
  }
}

// ── POST /api/agents/[id]/general-chat ──────────────────────────────

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Require authentication to post
  const authResult = await requireAuth(req);
  if (!isAuthResult(authResult)) return authResult;

  // Rate limit: 10 messages per minute per user
  const rlResponse = await rateLimitByUser(
    authResult.userId,
    "general-chat",
    10,
  );
  if (rlResponse) return rlResponse;

  try {
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

    // Fetch agent — supports both database ID and tokenMint
    const [postAgentById, postAgentByMint] = await Promise.all([
      prisma.agent.findUnique({
        where: { id },
        select: { id: true, isMinted: true },
      }),
      prisma.agent.findUnique({
        where: { tokenMint: id },
        select: { id: true, isMinted: true },
      }),
    ]);

    const agent = postAgentById || postAgentByMint;

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.isMinted) {
      return NextResponse.json(
        { error: "This agent has not been minted" },
        { status: 400 },
      );
    }

    // Get user's active wallet address
    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      select: { activeWallet: { select: { address: true } } },
    });

    if (!user?.activeWallet?.address) {
      return NextResponse.json(
        { error: "No wallet connected. Please connect your wallet." },
        { status: 400 },
      );
    }

    // Save message (no token gate for general chat)
    const message = await prisma.agentChatMessage.create({
      data: {
        content: content.trim(),
        walletAddress: user.activeWallet.address,
        agentId: agent.id,
        userId: authResult.userId,
        isVip: false,
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("[GeneralChat] POST error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
