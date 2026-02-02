import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemPrompt, AgentTraitData } from "@/lib/agentTraits";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";

// POST /api/agents/mint/save - Save minted agent to database
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  try {
    const body = await req.json();
    const {
      agentId,
      name,
      description,
      imageUrl,
      traits,
      tokenMint,
      tokenSymbol,
      tokenMetadata,
      launchWallet,
      launchSignature,
    } = body as {
      agentId?: string;
      name: string;
      description: string;
      imageUrl: string;
      traits: AgentTraitData;
      tokenMint: string;
      tokenSymbol: string;
      tokenMetadata: string;
      launchWallet: string;
      launchSignature: string;
    };

    // Validate required fields
    if (
      !name ||
      !traits ||
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

    // If agentId provided, check it doesn't already exist
    if (agentId) {
      const existingById = await prisma.agent.findUnique({
        where: { id: agentId },
      });
      if (existingById) {
        return NextResponse.json(
          { error: "Agent with this ID already exists" },
          { status: 409 },
        );
      }
    }

    // Check if token mint already exists
    const existingAgent = await prisma.agent.findUnique({
      where: { tokenMint },
    });

    if (existingAgent) {
      return NextResponse.json(
        { error: "Agent with this token mint already exists" },
        { status: 409 },
      );
    }

    // Generate system prompt from traits
    const systemPrompt = generateSystemPrompt(traits);

    // Create the agent (use provided agentId if available for consistent website URL)
    const agent = await prisma.agent.create({
      data: {
        ...(agentId && { id: agentId }), // Use pre-generated ID if provided
        name,
        description: description || null,
        systemPrompt,
        imageUrl: imageUrl || null,
        isPublic: true, // Minted agents are public by default
        isMinted: true,

        // Traits
        personality: traits.personality,
        traits: traits.traits,
        skills: traits.skills,
        tools: traits.tools,
        specialAbility: traits.specialAbility,
        rarity: traits.rarity,

        // Token launch fields
        tokenMint,
        tokenSymbol,
        tokenMetadata,
        launchWallet,
        launchSignature,
        launchedAt: new Date(),

        // Creator
        createdById: auth.userId,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error("Error saving minted agent:", error);
    return NextResponse.json(
      { error: "Failed to save minted agent" },
      { status: 500 },
    );
  }
}
