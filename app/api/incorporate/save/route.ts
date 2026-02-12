import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { PublicKey } from "@solana/web3.js";

// POST /api/incorporate/save - Save corporation to database
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthResult(auth)) return auth;
  const userId = auth.userId;

  const limited = await rateLimitByUser(userId, "incorporate-save", 10);
  if (limited) return limited;

  try {
    const body = await request.json();
    const {
      name,
      description,
      tokenMint,
      tokenSymbol,
      tokenMetadata,
      launchWallet,
      launchSignature,
      agentIds,
      logo,
    } = body;

    // Validate required fields
    if (
      !name ||
      !tokenMint ||
      !tokenSymbol ||
      !launchWallet ||
      !launchSignature
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate Solana public keys
    try {
      new PublicKey(tokenMint);
      new PublicKey(launchWallet);
    } catch {
      return NextResponse.json(
        { error: "Invalid Solana public key format" },
        { status: 400 },
      );
    }

    // Validate signature format
    if (
      typeof launchSignature !== "string" ||
      launchSignature.length < 87 ||
      launchSignature.length > 88
    ) {
      return NextResponse.json(
        { error: "Invalid transaction signature format" },
        { status: 400 },
      );
    }

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length < 2) {
      return NextResponse.json(
        { error: "At least two agents are required for a corporation" },
        { status: 400 },
      );
    }

    if (agentIds.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 agents allowed" },
        { status: 400 },
      );
    }

    // Validate agent IDs are valid UUIDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!agentIds.every((id: string) => uuidRegex.test(id))) {
      return NextResponse.json(
        { error: "Invalid agent ID format" },
        { status: 400 },
      );
    }

    // Verify the user owns all these agents
    const userAgents = await prisma.agent.findMany({
      where: {
        id: { in: agentIds },
        createdById: userId,
      },
    });

    if (userAgents.length !== agentIds.length) {
      return NextResponse.json(
        { error: "One or more agents not found or not owned by you" },
        { status: 400 },
      );
    }

    // Create the corporation and swarm agents in a transaction (prevents race conditions)
    const corporation = await prisma.$transaction(async (tx) => {
      // Check if token mint already exists (within transaction to prevent race condition)
      const existingCorp = await tx.corporation.findUnique({
        where: { tokenMint },
      });

      if (existingCorp) {
        throw new Error(
          "CONFLICT:Corporation with this token mint already exists",
        );
      }

      // Create the corporation
      const corp = await tx.corporation.create({
        data: {
          name,
          description,
          logo,
          tokenMint,
          // Remove leading $ from symbol if present (stored without $ prefix in DB)
          tokenSymbol: tokenSymbol.replace(/^\$+/, ""),
          tokenMetadata,
          launchWallet,
          launchSignature,
          launchedAt: new Date(),
        },
      });

      // Create SwarmAgents from the user's minted agents and link them to the corporation
      // This populates the swarm visualization with the user's real agents
      // Using createMany for better performance (avoids N+1 queries)
      const { getRarityHexColor } = await import("@/lib/utils/rarity");

      const swarmAgentData = userAgents.map((agent) => {
        // Map agent data to capabilities for swarm visualization
        // Use enabled skills and personality as capabilities
        const capabilities = [
          ...agent.enabledSkills.slice(0, 2),
          ...(agent.personality ? [agent.personality] : []),
        ].slice(0, 4);

        return {
          name: agent.name,
          description: agent.description,
          capabilities,
          color: getRarityHexColor(agent.rarity),
          size:
            agent.rarity === "legendary"
              ? 50
              : agent.rarity === "epic"
                ? 45
                : 40,
          corporationId: corp.id,
        };
      });

      await tx.swarmAgent.createMany({
        data: swarmAgentData,
      });

      // Fetch the corporation with its agents
      return tx.corporation.findUnique({
        where: { id: corp.id },
        include: { agents: true },
      });
    });

    return NextResponse.json({ corporation }, { status: 201 });
  } catch (error) {
    console.error("Error saving corporation:", error);

    // Handle conflict errors from transaction
    if (error instanceof Error && error.message.startsWith("CONFLICT:")) {
      return NextResponse.json(
        { error: error.message.replace("CONFLICT:", "") },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to save corporation" },
      { status: 500 },
    );
  }
}
