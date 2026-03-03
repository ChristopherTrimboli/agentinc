import { NextResponse } from "next/server";
import { getErc8004Sdk, COLLECTION_POINTER } from "@/lib/erc8004";
import prisma from "@/lib/prisma";
import type { NetworkData } from "@/lib/network/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sdk = getErc8004Sdk();

    let indexerUp = false;
    try {
      indexerUp = await sdk.isIndexerAvailable();
    } catch {
      /* ignore */
    }

    if (!indexerUp) {
      return NextResponse.json(
        { error: "8004 indexer is currently unavailable" },
        { status: 503 },
      );
    }

    const [statsResult, pointersResult] = await Promise.allSettled([
      sdk.getGlobalStats(),
      sdk.getCollectionPointers(),
    ]);

    const stats =
      statsResult.status === "fulfilled" ? statsResult.value : null;
    const pointers =
      pointersResult.status === "fulfilled" ? pointersResult.value : [];

    // Pre-fetch our own agents from DB for name enrichment
    let ownAgentNames = new Map<string, string>();
    try {
      const dbAgents = await prisma.agent.findMany({
        where: { erc8004Asset: { not: null } },
        select: { erc8004Asset: true, name: true },
        cacheStrategy: { ttl: 300, swr: 600 },
      });
      ownAgentNames = new Map(
        dbAgents
          .filter((a) => a.erc8004Asset)
          .map((a) => [a.erc8004Asset!, a.name]),
      );
    } catch {
      /* DB lookup is best-effort */
    }

    // Deduplicate pointers by `col` (same pointer can appear multiple times)
    const uniquePointers = new Map<string, (typeof pointers)[number]>();
    for (const ptr of pointers) {
      if (!uniquePointers.has(ptr.col)) {
        uniquePointers.set(ptr.col, ptr);
      }
    }

    const collections = await Promise.all(
      Array.from(uniquePointers.values()).map(async (ptr) => {
        let agents: Awaited<ReturnType<typeof sdk.getCollectionAssets>> = [];
        try {
          agents = await sdk.getCollectionAssets(ptr.col, { limit: 500 });
        } catch {
          /* collection assets may fail for some pointers */
        }

        const isOwn = ptr.col === COLLECTION_POINTER;

        return {
          id: ptr.col,
          address: ptr.collection || ptr.col,
          creator: ptr.creator,
          name: ptr.name || "Unknown Collection",
          symbol: ptr.symbol || null,
          description: ptr.description || null,
          image: ptr.image || null,
          bannerImage: ptr.banner_image || null,
          website: ptr.social_website || null,
          twitter: ptr.social_x || null,
          agentCount: agents.length || parseInt(String(ptr.asset_count)) || 0,
          isOwn,
          agents: agents.map((a) => ({
            asset: a.asset,
            owner: a.owner,
            name:
              a.nft_name ||
              (isOwn ? ownAgentNames.get(a.asset) : null) ||
              null,
            uri: a.agent_uri,
            trustTier: a.trust_tier,
            qualityScore: a.quality_score,
            feedbackCount: a.feedback_count,
            confidence: a.confidence,
            riskScore: a.risk_score,
            diversityRatio: a.diversity_ratio,
            atomEnabled: a.atom_enabled ?? false,
            createdAt: a.created_at,
            collectionPointer: a.collection_pointer || null,
          })),
        };
      }),
    );

    const loadedAgentCount = collections.reduce((s, c) => s + c.agents.length, 0);

    const data: NetworkData = {
      stats: {
        totalAgents: stats ? stats.total_agents : loadedAgentCount,
        totalCollections: collections.length,
        totalFeedbacks: stats ? stats.total_feedbacks : 0,
        totalValidations: stats ? stats.total_validations : 0,
        platinumAgents: stats ? stats.platinum_agents : 0,
        goldAgents: stats ? stats.gold_agents : 0,
        avgQuality: stats ? stats.avg_quality : null,
      },
      collections,
    };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[8004 Network] Failed to fetch network data:", error);
    return NextResponse.json(
      { error: "Failed to fetch 8004 network data" },
      { status: 500 },
    );
  }
}
