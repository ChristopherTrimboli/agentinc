import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import prisma from "@/lib/prisma";
import { generateSystemPrompt, AgentTraitData } from "@/lib/agentTraits";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

// Helper to verify auth
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

// POST /api/agents/mint/save - Save minted agent to database
export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
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

    // Create the agent
    const agent = await prisma.agent.create({
      data: {
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
        createdById: userId,
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
