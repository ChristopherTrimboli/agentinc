import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { registerAgentOn8004 } from "@/lib/erc8004";

/**
 * POST /api/agents/register-8004
 *
 * Register an existing minted agent on the 8004 Solana agent registry.
 * The user's Privy wallet pays rent (~0.014 SOL) and becomes the NFT owner.
 *
 * Body: { agentId: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  if (!auth.walletAddress || !auth.walletId) {
    return NextResponse.json(
      { error: "No active wallet found — connect a wallet first" },
      { status: 400 },
    );
  }

  const limited = await rateLimitByUser(auth.userId, "register-8004", 5);
  if (limited) return limited;

  let body: { agentId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { agentId } = body;
  if (!agentId) {
    return NextResponse.json(
      { error: "agentId is required" },
      { status: 400 },
    );
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.createdById !== auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!agent.isMinted) {
      return NextResponse.json(
        { error: "Agent must be minted before registering on 8004" },
        { status: 400 },
      );
    }

    if (agent.erc8004Asset) {
      return NextResponse.json(
        {
          error: "Agent is already registered on 8004",
          asset: agent.erc8004Asset,
        },
        { status: 409 },
      );
    }

    const result = await registerAgentOn8004({
      name: agent.name,
      description: agent.description || "",
      imageUrl: agent.imageUrl || undefined,
      tokenMint: agent.tokenMint || undefined,
      agentId: agent.id,
      walletAddress: auth.walletAddress,
      walletId: auth.walletId,
    });

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: {
        erc8004Asset: result.asset,
        erc8004Uri: result.metadataUri,
        erc8004CollectionPointer: result.collectionPointer || null,
        erc8004AtomEnabled: true,
        erc8004RegisteredAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        agent: updated,
        erc8004: {
          asset: result.asset,
          metadataUri: result.metadataUri,
          collectionPointer: result.collectionPointer,
          signature: result.signature,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[ERC8004] Registration failed:", error);
    return NextResponse.json(
      { error: "Failed to register agent on 8004" },
      { status: 500 },
    );
  }
}
