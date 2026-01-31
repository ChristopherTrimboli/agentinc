import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/incorporate/save - Save corporation to database
export async function POST(request: Request) {
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
    if (!name || !tokenMint || !tokenSymbol || !launchWallet || !launchSignature) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return NextResponse.json(
        { error: "At least one agent is required" },
        { status: 400 }
      );
    }

    if (agentIds.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 agents allowed" },
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

    // Create the corporation and assign agents in a transaction
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

      // Update agents to belong to this corporation
      await tx.swarmAgent.updateMany({
        where: {
          id: { in: agentIds },
          corporationId: null, // Only assign unassigned agents
        },
        data: {
          corporationId: corp.id,
        },
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
    return NextResponse.json(
      { error: "Failed to save corporation" },
      { status: 500 }
    );
  }
}
