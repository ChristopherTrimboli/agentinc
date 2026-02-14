import { NextRequest, NextResponse } from "next/server";
import { TOOL_GROUPS } from "@/lib/tools";
import { rateLimitByIP } from "@/lib/rateLimit";
import { isRedisConfigured, getRedis } from "@/lib/redis";

const TOOLS_CACHE_KEY = "api:tools:list:v2";
const TOOLS_CACHE_TTL = 3600; // 1 hour (tools rarely change)

/**
 * GET /api/tools
 * Returns all available utility tools grouped by category
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitByIP(req, "tools", 30);
  if (limited) return limited;

  // Try Redis cache first
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<object>(TOOLS_CACHE_KEY);
      if (cached) {
        const response = NextResponse.json(cached);
        response.headers.set(
          "Cache-Control",
          "public, s-maxage=3600, stale-while-revalidate=7200",
        );
        return response;
      }
    } catch {
      // Fall through
    }
  }

  // Return tool groups for organized UI display
  const groups = TOOL_GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    icon: group.icon,
    category: group.category,
    logoUrl: group.logoUrl,
    source: group.source,
    requiresAuth: group.requiresAuth,
    functions: group.functions,
  }));

  // Also provide flat list of all function IDs for convenience
  const allFunctionIds = TOOL_GROUPS.flatMap((g) =>
    g.functions.map((f) => f.id),
  );

  const payload = {
    groups,
    functionIds: allFunctionIds,
    groupCount: groups.length,
    functionCount: allFunctionIds.length,
  };

  // Cache in Redis
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(TOOLS_CACHE_KEY, payload, { ex: TOOLS_CACHE_TTL });
    } catch {
      // Non-critical
    }
  }

  const response = NextResponse.json(payload);
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=7200",
  );
  return response;
}
