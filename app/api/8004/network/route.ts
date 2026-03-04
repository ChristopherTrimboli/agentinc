import { NextRequest, NextResponse } from "next/server";
import { getErc8004Sdk, COLLECTION_POINTER } from "@/lib/erc8004";
import prisma from "@/lib/prisma";
import { rateLimitByIP } from "@/lib/rateLimit";
import { isRedisConfigured, getRedis } from "@/lib/redis";
import type { NetworkData, AgentVerification } from "@/lib/network/types";

export const dynamic = "force-dynamic";

// ── Cache Config ────────────────────────────────────────────────────────────

const CACHE_KEY = "api:8004:network";
const CACHE_TTL = 300; // 5 minutes

// ── Metadata Fetcher ────────────────────────────────────────────────────────

const METADATA_TIMEOUT = 4000;
const METADATA_CONCURRENCY = 15;

const PLACEHOLDER_RE = /example|placeholder|test|dummy/i;

function isPlaceholderUri(uri: string): boolean {
  return PLACEHOLDER_RE.test(uri) || uri.length < 10;
}

function resolveUri(uri: string): string {
  if (uri.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  if (uri.startsWith("ar://")) return `https://arweave.net/${uri.slice(5)}`;
  return uri;
}

interface AgentMetadata {
  name: string | null;
  image: string | null;
}

async function fetchMetadata(uri: string): Promise<AgentMetadata> {
  try {
    const url = resolveUri(uri);
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(METADATA_TIMEOUT),
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return { name: null, image: null };
    const json = await resp.json();

    const name =
      typeof json?.name === "string" && json.name.length > 0 ? json.name : null;

    const img = json?.image;
    const image =
      typeof img === "string" &&
      img.length > 0 &&
      !img.startsWith("data:") &&
      !isPlaceholderUri(img)
        ? img
        : null;

    return { name, image };
  } catch {
    return { name: null, image: null };
  }
}

/** Fetch name + image for a batch of agents, deduplicating by URI. */
async function batchFetchAgentMetadata(
  agents: { asset: string; uri: string | null }[],
): Promise<Map<string, AgentMetadata>> {
  const result = new Map<string, AgentMetadata>();
  const pending = agents.filter((a) => a.uri && a.uri.length > 5);
  if (pending.length === 0) return result;

  // Deduplicate by URI — fetch each unique URI once
  const uriToAssets = new Map<string, string[]>();
  for (const a of pending) {
    const uri = a.uri!;
    const list = uriToAssets.get(uri);
    if (list) list.push(a.asset);
    else uriToAssets.set(uri, [a.asset]);
  }

  const uniqueEntries = Array.from(uriToAssets.entries());

  for (let i = 0; i < uniqueEntries.length; i += METADATA_CONCURRENCY) {
    const batch = uniqueEntries.slice(i, i + METADATA_CONCURRENCY);
    await Promise.allSettled(
      batch.map(async ([uri, assets]) => {
        const meta = await fetchMetadata(uri);
        if (meta.name || meta.image) {
          for (const asset of assets) result.set(asset, meta);
        }
      }),
    );
  }

  return result;
}

// ── Route Handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const limited = await rateLimitByIP(req, "8004-network", 30);
  if (limited) return limited;

  // ── Redis cache check ──
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<NetworkData>(CACHE_KEY);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        });
      }
    } catch {
      // Fall through to fresh fetch
    }
  }

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

    // Parallelize: stats + pointers + DB enrichment data
    const [statsResult, pointersResult, dbResult] = await Promise.allSettled([
      sdk.getGlobalStats(),
      sdk.getCollectionPointers(),
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
        let agents: Awaited<ReturnType<typeof sdk.getCollectionAssets>> = [];
        try {
          agents = await sdk.getCollectionAssets(ptr.col, { limit: 500 });
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

    // Build asset set for dedup before parallel metadata + unassigned fetch
    const collectionAssetSet = new Set(
      collections.flatMap((c) => c.agents.map((a) => a.asset)),
    );

    // Collect agents needing metadata enrichment
    const agentsNeedingMetadata = collections.flatMap((c) =>
      c.agents
        .filter((a) => (!a.image || !a.name) && a.uri)
        .map((a) => ({ asset: a.asset, uri: a.uri })),
    );

    // Parallelize: metadata enrichment + unassigned agent search
    const [metaResult, searchResult] = await Promise.allSettled([
      agentsNeedingMetadata.length > 0
        ? batchFetchAgentMetadata(agentsNeedingMetadata)
        : Promise.resolve(new Map<string, AgentMetadata>()),
      sdk.searchAgents({ limit: 500 }),
    ]);

    // Apply metadata to collection agents
    if (metaResult.status === "fulfilled" && metaResult.value.size > 0) {
      const fetchedMeta = metaResult.value;
      for (const coll of collections) {
        for (const agent of coll.agents) {
          const meta = fetchedMeta.get(agent.asset);
          if (!meta) continue;
          if (!agent.name && meta.name) agent.name = meta.name;
          if (!agent.image && meta.image) agent.image = meta.image;
        }
      }
    }

    // Build "Unassigned" collection from agents not in any collection
    if (searchResult.status === "fulfilled") {
      const uncollected = searchResult.value.filter(
        (a) => !collectionAssetSet.has(a.asset),
      );

      if (uncollected.length > 0) {
        const unassignedAgents = uncollected.map((a) => ({
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
        }));

        const needingMeta = unassignedAgents
          .filter((a) => (!a.image || !a.name) && a.uri)
          .map((a) => ({ asset: a.asset, uri: a.uri }));

        if (needingMeta.length > 0) {
          const fetchedMeta = await batchFetchAgentMetadata(needingMeta);
          for (const agent of unassignedAgents) {
            const meta = fetchedMeta.get(agent.asset);
            if (!meta) continue;
            if (!agent.name && meta.name) agent.name = meta.name;
            if (!agent.image && meta.image) agent.image = meta.image;
          }
        }

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
          agentCount: unassignedAgents.length,
          isOwn: false,
          agents: unassignedAgents,
        });
      }
    } else {
      console.error(
        "[8004 Network] Failed to fetch unassigned agents:",
        searchResult.reason,
      );
    }

    const loadedAgentCount = collections.reduce(
      (s, c) => s + c.agents.length,
      0,
    );

    // ── Merge verification data from Redis ──
    let totalVerified = 0;
    if (isRedisConfigured()) {
      try {
        const redis = getRedis();
        const allAssets = collections.flatMap((c) =>
          c.agents.map((a) => a.asset),
        );

        if (allAssets.length > 0) {
          const keys = allAssets.map((a) => `verify:8004:${a}`);
          const values = await redis.mget<(string | null)[]>(...keys);

          for (let i = 0; i < allAssets.length; i++) {
            const raw = values[i];
            if (!raw) continue;
            const verification: AgentVerification =
              typeof raw === "string" ? JSON.parse(raw) : raw;
            if (verification.status === "verified") totalVerified++;

            for (const coll of collections) {
              const agent = coll.agents.find((a) => a.asset === allAssets[i]);
              if (agent) {
                (agent as { verification?: AgentVerification }).verification =
                  verification;
                break;
              }
            }
          }
        }
      } catch {
        // Non-critical — verification data is optional
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

    // ── Write to Redis cache ──
    if (isRedisConfigured()) {
      try {
        const redis = getRedis();
        await redis.set(CACHE_KEY, data, { ex: CACHE_TTL });
      } catch {
        // Non-critical
      }
    }

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
