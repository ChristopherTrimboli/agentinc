import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import prisma from "@/lib/prisma";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

// Helper to verify auth and get user ID
async function verifyAuth(req: NextRequest): Promise<string | null> {
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) return null;

  try {
    const privyUser = await privy.users().get({ id_token: idToken });
    return privyUser.id;
  } catch {
    return null;
  }
}

// POST /api/incorporate/save - Save corporation to database
export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    if (!name || !tokenMint || !tokenSymbol || !launchWallet || !launchSignature) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length < 2) {
      return NextResponse.json(
        { error: "At least two agents are required for a corporation" },
        { status: 400 }
      );
    }

    if (agentIds.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 agents allowed" },
        { status: 400 }
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
        { status: 400 }
      );
    }

    // Check if token mint already exists
    const existingCorp = await prisma.corporation.findUnique({
      where: { tokenMint },
    });

    if (existingCorp) {
      return NextResponse.json(
        { error: "Corporation with this token mint already exists" },
        { status: 409 }
      );
    }

    // Create the corporation and swarm agents in a transaction
    const corporation = await prisma.$transaction(async (tx) => {
      // Create the corporation
      const corp = await tx.corporation.create({
        data: {
          name,
          description,
          logo,
          tokenMint,
          tokenSymbol,
          tokenMetadata,
          launchWallet,
          launchSignature,
          launchedAt: new Date(),
        },
      });

      // Create SwarmAgents from the user's minted agents and link them to the corporation
      // This populates the swarm visualization with the user's real agents
      for (const agent of userAgents) {
        // Map agent traits to capabilities for swarm visualization
        const capabilities = [
          ...(agent.skills || []),
          ...(agent.traits || []).slice(0, 2),
        ].slice(0, 4);

        // Generate a color based on rarity
        const rarityColors: Record<string, string> = {
          common: "#6b7280",
          uncommon: "#22c55e",
          rare: "#3b82f6",
          epic: "#a855f7",
          legendary: "#f59e0b",
        };

        await tx.swarmAgent.create({
          data: {
            name: agent.name,
            description: agent.description,
            capabilities,
            color: rarityColors[agent.rarity || "common"] || "#6b7280",
            size: agent.rarity === "legendary" ? 50 : agent.rarity === "epic" ? 45 : 40,
            corporationId: corp.id,
          },
        });
      }

      // Fetch the corporation with its agents
      return tx.corporation.findUnique({
        where: { id: corp.id },
        include: { agents: true },
      });
    });

    return NextResponse.json({ corporation }, { status: 201 });
  } catch (error) {
    console.error("Error saving corporation:", error);
    return NextResponse.json(
      { error: "Failed to save corporation" },
      { status: 500 }
    );
  }
}
