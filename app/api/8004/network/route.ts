import { NextRequest, NextResponse } from "next/server";
import { COLLECTION_POINTER } from "@/lib/erc8004";
import type { SolanaSDK } from "@/lib/erc8004";
import {
  getCachedGlobalStats,
  getCachedCollectionPointers,
  getCachedIsIndexerAvailable,
  getCachedSearchAgents,
  getCachedCollectionAssets,
} from "@/lib/erc8004/cached";
import prisma from "@/lib/prisma";
import { rateLimitByIP } from "@/lib/rateLimit";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import type { NetworkData, AgentVerification } from "@/lib/network/types";

export const dynamic = "force-dynamic";

// ── Pagination (using cached SDK calls) ──────────────────────────────────────

const PAGE_SIZE = 200;

type IndexedAgent = Awaited<ReturnType<SolanaSDK["searchAgents"]>>[number];

async function fetchAllCollectionAssets(col: string): Promise<IndexedAgent[]> {
  const all: IndexedAgent[] = [];
  let offset = 0;
  for (;;) {
    const page = await getCachedCollectionAssets(col, PAGE_SIZE, offset);
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

async function fetchAllAgents(): Promise<IndexedAgent[]> {
  const all: IndexedAgent[] = [];
  let offset = 0;
  for (;;) {
    const page = await getCachedSearchAgents(PAGE_SIZE, offset);
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

// ── Metadata Fetcher ────────────────────────────────────────────────────────

const PLACEHOLDER_RE = /example|placeholder|test|dummy/i;

function isPlaceholderUri(uri: string): boolean {
  return PLACEHOLDER_RE.test(uri) || uri.length < 10;
}

interface AgentMetadata {
  name: string | null;
  image: string | null;
}

// ── DAS (Digital Asset Standard) Batch Metadata ─────────────────────────────

const DAS_BATCH_SIZE = 1000;
const DAS_TIMEOUT = 10000;

interface DasAssetResult {
  id: string;
  content?: {
    json_uri?: string;
    metadata?: { name?: string; symbol?: string };
    links?: { image?: string; [key: string]: unknown };
  };
}

/**
 * Batch-fetch NFT metadata (name + image) via Helius DAS API.
 * Much more reliable than fetching individual agent_uri JSONs since this
 * reads actual Metaplex Core asset metadata (on-chain URI → off-chain JSON).
 */
async function batchFetchDasMetadata(
  assetIds: string[],
): Promise<Map<string, AgentMetadata>> {
  const result = new Map<string, AgentMetadata>();
  if (assetIds.length === 0) return result;

  for (let i = 0; i < assetIds.length; i += DAS_BATCH_SIZE) {
    const batch = assetIds.slice(i, i + DAS_BATCH_SIZE);
    try {
      const resp = await fetch(SOLANA_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(DAS_TIMEOUT),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "das-batch",
          method: "getAssetBatch",
          params: { ids: batch },
        }),
      });

      if (!resp.ok) continue;
      const json = await resp.json();
      const assets: DasAssetResult[] = json.result ?? [];

      for (const asset of assets) {
        if (!asset.id || !asset.content) continue;

        const name = asset.content.metadata?.name ?? null;
        const rawImage = asset.content.links?.image;
        const image =
          typeof rawImage === "string" &&
          rawImage.length > 0 &&
          !rawImage.startsWith("data:") &&
          !isPlaceholderUri(rawImage)
            ? rawImage
            : null;

        if (name || image) {
          result.set(asset.id, { name, image });
        }
      }
    } catch (err) {
      console.warn("[8004 Network] DAS batch metadata failed:", err);
    }
  }

  return result;
}

// ── Route Handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const limited = await rateLimitByIP(req, "8004-network", 30);
  if (limited) return limited;

  try {
    let indexerUp = false;
    try {
      indexerUp = await getCachedIsIndexerAvailable();
    } catch {
      /* ignore */
    }

    if (!indexerUp) {
      return NextResponse.json(
        { error: "8004 indexer is currently unavailable" },
        { status: 503 },
      );
    }

    // Parallelize: stats + pointers + DB enrichment data (all cached 5min)
    const [statsResult, pointersResult, dbResult] = await Promise.allSettled([
      getCachedGlobalStats(),
      getCachedCollectionPointers(),
      prisma.agent.findMany({
        where: { erc8004Asset: { not: null } },
        select: { erc8004Asset: true, name: true, imageUrl: true },
        cacheStrategy: { ttl: 300, swr: 600 },
      }),
    ]);

    const stats = statsResult.status === "fulfilled" ? statsResult.value : null;
    const pointers =
      pointersResult.status === "fulfilled" ? pointersResult.value : [];

    let ownAgentNames = new Map<string, string>();
    let ownAgentImages = new Map<string, string>();
    if (dbResult.status === "fulfilled") {
      const dbAgents = dbResult.value;
      ownAgentNames = new Map(
        dbAgents
          .filter((a) => a.erc8004Asset)
          .map((a) => [a.erc8004Asset!, a.name]),
      );
      ownAgentImages = new Map(
        dbAgents
          .filter(
            (a) =>
              a.erc8004Asset && a.imageUrl && !a.imageUrl.startsWith("data:"),
          )
          .map((a) => [a.erc8004Asset!, a.imageUrl!]),
      );
    } else {
      console.warn("[8004 Network] DB enrichment failed:", dbResult.reason);
    }

    const uniquePointers = new Map<string, (typeof pointers)[number]>();
    for (const ptr of pointers) {
      if (!uniquePointers.has(ptr.col)) {
        uniquePointers.set(ptr.col, ptr);
      }
    }

    const collections = await Promise.all(
      Array.from(uniquePointers.values()).map(async (ptr) => {
        let agents: IndexedAgent[] = [];
        try {
          agents = await fetchAllCollectionAssets(ptr.col);
        } catch (err) {
          console.warn(
            `[8004 Network] Failed to fetch assets for ${ptr.col}:`,
            err,
          );
        }

        const isOwn = ptr.col === COLLECTION_POINTER;

        return {
          id: ptr.col,
          address: ptr.collection || ptr.col,
          creator: ptr.creator,
          name: ptr.name || "Unknown Collection",
          symbol: ptr.symbol || null,
          description: ptr.description || null,
          image: ptr.image && !isPlaceholderUri(ptr.image) ? ptr.image : null,
          bannerImage: ptr.banner_image || null,
          website: ptr.social_website || null,
          twitter: ptr.social_x || null,
          agentCount: agents.length || parseInt(String(ptr.asset_count)) || 0,
          isOwn,
          agents: agents.map((a) => ({
            asset: a.asset,
            agentId: a.agent_id ?? null,
            owner: a.owner,
            name:
              a.nft_name || (isOwn ? ownAgentNames.get(a.asset) : null) || null,
            uri: a.agent_uri,
            image: isOwn ? ownAgentImages.get(a.asset) || null : null,
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

    // Build asset set for dedup before fetching unassigned agents
    const collectionAssetSet = new Set(
      collections.flatMap((c) => c.agents.map((a) => a.asset)),
    );

    // Fetch all agents to find ones not in any collection
    let searchResult: IndexedAgent[] = [];
    try {
      searchResult = await fetchAllAgents();
    } catch (err) {
      console.error("[8004 Network] Failed to fetch unassigned agents:", err);
    }

    const uncollected = searchResult.filter(
      (a) => !collectionAssetSet.has(a.asset),
    );

    if (uncollected.length > 0) {
      collections.push({
        id: "__unassigned__",
        address: "__unassigned__",
        creator: "",
        name: "Unassigned",
        symbol: null,
        description: "Agents not yet assigned to a collection",
        image: "/solanaLogoMark.png",
        bannerImage: null,
        website: null,
        twitter: null,
        agentCount: uncollected.length,
        isOwn: false,
        agents: uncollected.map((a) => ({
          asset: a.asset,
          agentId: a.agent_id ?? null,
          owner: a.owner,
          name: ownAgentNames.get(a.asset) || a.nft_name || null,
          uri: a.agent_uri ?? null,
          image: ownAgentImages.get(a.asset) || null,
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
      });
    }

    // ── Enrich from inline JSON agent_uri (many agents store JSON directly) ──
    for (const coll of collections) {
      for (const agent of coll.agents) {
        if (agent.name && agent.image) continue;
        const uri = agent.uri;
        if (!uri || !uri.startsWith("{")) continue;
        try {
          const json = JSON.parse(uri);
          if (
            !agent.name &&
            typeof json.name === "string" &&
            json.name.length > 0
          ) {
            agent.name = json.name;
          }
          if (
            !agent.image &&
            typeof json.image === "string" &&
            json.image.length > 0 &&
            !json.image.startsWith("data:") &&
            !isPlaceholderUri(json.image)
          ) {
            agent.image = json.image;
          }
        } catch {
          /* not valid JSON */
        }
      }
    }

    // ── DAS batch enrichment for agents still missing name or image ──
    const agentsMissingData = collections.flatMap((c) =>
      c.agents.filter((a) => !a.image || !a.name),
    );

    if (agentsMissingData.length > 0) {
      const dasMetadata = await batchFetchDasMetadata(
        agentsMissingData.map((a) => a.asset),
      );

      for (const agent of agentsMissingData) {
        const meta = dasMetadata.get(agent.asset);
        if (!meta) continue;
        if (!agent.name && meta.name) agent.name = meta.name;
        if (!agent.image && meta.image) agent.image = meta.image;
      }
    }

    const loadedAgentCount = collections.reduce(
      (s, c) => s + c.agents.length,
      0,
    );

    // ── Merge verification data from DB (source of truth) ──
    let totalVerified = 0;
    const allAssets = collections.flatMap((c) => c.agents.map((a) => a.asset));

    if (allAssets.length > 0) {
      try {
        const dbRows = await prisma.networkVerification.findMany({
          where: { asset: { in: allAssets } },
          cacheStrategy: { ttl: 60, swr: 120 },
        });

        const assetToAgent = new Map<
          string,
          (typeof collections)[number]["agents"][number]
        >();
        for (const coll of collections) {
          for (const agent of coll.agents) {
            assetToAgent.set(agent.asset, agent);
          }
        }

        for (const row of dbRows) {
          const verification: AgentVerification = {
            status: row.status as AgentVerification["status"],
            checks: row.checks as unknown as AgentVerification["checks"],
            verifiedAt: row.verifiedAt.toISOString(),
            score: row.score,
            maxScore: row.maxScore,
          };
          if (verification.status === "verified") totalVerified++;
          const agent = assetToAgent.get(row.asset);
          if (agent) {
            (agent as { verification?: AgentVerification }).verification =
              verification;
          }
        }
      } catch (err) {
        console.warn("[8004 Network] DB verification merge failed:", err);
      }
    }

    const data: NetworkData = {
      stats: {
        totalAgents: stats ? stats.total_agents : loadedAgentCount,
        totalCollections: collections.length,
        totalFeedbacks: stats ? stats.total_feedbacks : 0,
        totalValidations: stats ? stats.total_validations : 0,
        platinumAgents: stats ? stats.platinum_agents : 0,
        goldAgents: stats ? stats.gold_agents : 0,
        avgQuality: stats ? stats.avg_quality : null,
        totalVerified,
      },
      collections,
    };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
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
