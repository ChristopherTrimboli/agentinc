import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { PublicKey } from "@solana/web3.js";

import prisma from "@/lib/prisma";
import {
  requireAuth,
  isAuthResult,
  getPrivyClient,
} from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { generateRandomAgent, generateSystemPrompt } from "@/lib/agentTraits";
import { fetchTokenMetadataFromChain } from "@/lib/solana/metadata";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ImportAgentBody {
  tokenMint: string;
  privateKey: string; // base58-encoded Solana private key
  walletAddress: string; // Solana wallet that minted the token
}

// ── Constants ──────────────────────────────────────────────────────────────────

// Note: rateLimitByUser uses a 1-minute sliding window
const MAX_IMPORTS_PER_MINUTE = 3;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 30000;

// ── POST /api/agents/import ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Authenticate the requesting user
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  // 2. Rate limit (3 imports per minute)
  const limited = await rateLimitByUser(
    auth.userId,
    "agent-import",
    MAX_IMPORTS_PER_MINUTE,
  );
  if (limited) return limited;

  // 3. Parse body
  let body: ImportAgentBody;
  try {
    body = (await req.json()) as ImportAgentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tokenMint, privateKey, walletAddress } = body;

  // 4. Validate required fields
  if (!tokenMint || !privateKey || !walletAddress) {
    return NextResponse.json(
      {
        error: "Missing required fields: tokenMint, privateKey, walletAddress",
      },
      { status: 400 },
    );
  }

  // Validate Solana public keys
  try {
    new PublicKey(tokenMint);
    new PublicKey(walletAddress);
  } catch {
    return NextResponse.json(
      { error: "Invalid Solana public key format" },
      { status: 400 },
    );
  }

  try {
    // ── Step 1: Check for existing agent ──────────────────────────────────────
    const existingAgent = await prisma.agent.findUnique({
      where: { tokenMint },
    });
    if (existingAgent) {
      return NextResponse.json(
        { error: "Agent with this token mint already exists" },
        { status: 409 },
      );
    }

    // ── Step 2: Get owner user (authenticated user) ──────────────────────────
    const ownerUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        walletId: true,
        walletAddress: true,
      },
    });

    if (!ownerUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 400 },
      );
    }

    // ── Step 3: Fetch on-chain token metadata ────────────────────────────────
    let metadata;
    try {
      metadata = await fetchTokenMetadataFromChain(tokenMint);
    } catch (error) {
      console.error(
        "[Import] Failed to fetch token metadata:",
        error instanceof Error ? error.message : "Unknown error",
      );
      return NextResponse.json(
        {
          error:
            "Could not fetch token metadata from chain. Verify the token mint is correct.",
        },
        { status: 400 },
      );
    }

    if (!metadata.name || !metadata.symbol) {
      return NextResponse.json(
        {
          error:
            "Token metadata is incomplete (missing name or symbol). This token may not be a valid Bags agent.",
        },
        { status: 400 },
      );
    }

    // Sanitize metadata to prevent XSS
    const sanitizedName = metadata.name.trim().slice(0, 32); // Match DB limit
    const sanitizedSymbol = metadata.symbol.trim().slice(0, 10); // Match DB limit
    const sanitizedDescription = metadata.description
      ? metadata.description.trim().slice(0, 1000) // Reasonable limit
      : null;

    // ── Step 4: Download and re-upload image to Vercel Blob ──────────────────
    let imageUrl: string | null = null;

    if (metadata.image) {
      try {
        // Basic URL validation to prevent SSRF
        const imageUrlObj = new URL(metadata.image);
        const allowedProtocols = ["https:", "http:", "ipfs:"];
        if (!allowedProtocols.includes(imageUrlObj.protocol)) {
          throw new Error(
            `Invalid image URL protocol: ${imageUrlObj.protocol}`,
          );
        }

        const imageResponse = await fetch(metadata.image, {
          signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS),
        });

        if (imageResponse.ok) {
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          const contentType =
            imageResponse.headers.get("content-type") || "image/png";
          const extension = contentType.split("/")[1]?.split(";")[0] || "png";
          const sanitizedFilename = sanitizedName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-");
          const filename = `agents/${sanitizedFilename}-${Date.now()}.${extension}`;

          const blob = await put(filename, imageBuffer, {
            access: "public",
            contentType,
          });

          imageUrl = blob.url;
        }
      } catch (error) {
        console.warn(
          "[Import] Image download/upload failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }

    // ── Step 5: Import private key into Privy ────────────────────────────────
    const privy = getPrivyClient();

    let importedWalletId: string;
    try {
      const wallet = await privy.wallets().import({
        wallet: {
          entropy_type: "private-key",
          chain_type: "solana",
          address: walletAddress,
          private_key: privateKey,
        },
        owner: { user_id: ownerUser.id },
      });

      importedWalletId = wallet.id;
    } catch (error) {
      console.error(
        "[Import] Privy wallet import failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      return NextResponse.json(
        { error: "Failed to import wallet. Please verify your private key." },
        { status: 500 },
      );
    }

    // ── Step 6: Update user with imported wallet (only if not set) ───────────
    // Only set the user's primary wallet if they don't have one yet.
    // This prevents overwriting their primary wallet when importing multiple agents.
    if (!ownerUser.walletId) {
      await prisma.user.update({
        where: { id: ownerUser.id },
        data: {
          walletId: importedWalletId,
          walletAddress: walletAddress,
        },
      });
    }

    // ── Step 7: Generate personality traits ───────────────────────────────────
    const traits = generateRandomAgent();
    const systemPrompt = generateSystemPrompt(traits);

    // ── Step 8: Create agent record ──────────────────────────────────────────
    const agent = await prisma.agent.create({
      data: {
        name: sanitizedName,
        description: sanitizedDescription,
        systemPrompt,
        imageUrl,
        isPublic: true,
        isMinted: true,

        // Personality
        personality: traits.personality,
        personalityScores: traits.personalityScores as unknown as Record<
          string,
          number
        >,
        rarity: traits.rarity,

        // Token launch fields
        tokenMint,
        tokenSymbol: sanitizedSymbol,
        tokenMetadata: metadata.uri || null,
        launchWallet: walletAddress,
        launchSignature: null, // Not available for imported agents
        launchedAt: new Date(),

        // Creator
        createdById: ownerUser.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        agent: {
          id: agent.id,
          name: agent.name,
          tokenMint: agent.tokenMint,
          tokenSymbol: agent.tokenSymbol,
          rarity: agent.rarity,
          personality: agent.personality,
          imageUrl: agent.imageUrl,
        },
        wallet: {
          privyWalletId: importedWalletId,
          address: walletAddress,
          linkedToUser: ownerUser.id,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[Import] Error importing agent:",
      error instanceof Error ? error.message : "Unknown error",
    );

    // Don't leak internal error details to client
    return NextResponse.json(
      {
        error:
          "An unexpected error occurred during import. Please try again or contact support.",
      },
      { status: 500 },
    );
  }
}
