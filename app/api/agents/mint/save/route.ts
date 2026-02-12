import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemPrompt, AgentTraitData } from "@/lib/agentTraits";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { PublicKey } from "@solana/web3.js";

// POST /api/agents/mint/save - Save minted agent to database
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "mint-save", 10);
  if (limited) return limited;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
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
    } = body as unknown as {
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

    // Validate signature format (base58 string, 88 chars)
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

    // Generate system prompt from traits
    const systemPrompt = generateSystemPrompt(traits);

    // Use a transaction to prevent race conditions
    const agent = await prisma.$transaction(async (tx) => {
      // Check if agentId already exists (within transaction)
      if (agentId) {
        const existingById = await tx.agent.findUnique({
          where: { id: agentId },
        });
        if (existingById) {
          throw new Error("CONFLICT:Agent with this ID already exists");
        }
      }

      // Check if token mint already exists (within transaction)
      const existingAgent = await tx.agent.findUnique({
        where: { tokenMint },
      });

      if (existingAgent) {
        throw new Error("CONFLICT:Agent with this token mint already exists");
      }

      // Create the agent (use provided agentId if available for consistent website URL)
      return tx.agent.create({
        data: {
          ...(agentId && { id: agentId }), // Use pre-generated ID if provided
          name,
          description: description || null,
          systemPrompt,
          imageUrl: imageUrl || null,
          isPublic: true, // Minted agents are public by default
          isMinted: true,

          // Personality
          personality: traits.personality,
          personalityScores: traits.personalityScores
            ? (traits.personalityScores as unknown as Record<string, number>)
            : undefined,
          rarity: traits.rarity,

          // Token launch fields
          tokenMint,
          // Remove leading $ from symbol if present (stored without $ prefix in DB)
          tokenSymbol: tokenSymbol.replace(/^\$+/, ""),
          tokenMetadata,
          launchWallet,
          launchSignature,
          launchedAt: new Date(),

          // Creator
          createdById: auth.userId,
        },
      });
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error("Error saving minted agent:", error);

    // Handle conflict errors from transaction
    if (error instanceof Error && error.message.startsWith("CONFLICT:")) {
      return NextResponse.json(
        { error: error.message.replace("CONFLICT:", "") },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to save minted agent" },
      { status: 500 },
    );
  }
}
