import { NextRequest, NextResponse } from "next/server";
import {
  skillRegistry,
  AVAILABLE_SKILLS,
  getSkillConfigsFromEnv,
} from "@/lib/skills";
import { rateLimitByIP } from "@/lib/rateLimit";
import { isRedisConfigured, getRedis } from "@/lib/redis";

const SKILLS_CACHE_KEY = "api:skills:list";
const SKILLS_CACHE_TTL = 300; // 5 minutes

/**
 * GET /api/skills
 * List all available skills
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitByIP(req, "skills", 30);
  if (limited) return limited;

  // Try Redis cache first
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<{ skills: unknown[]; count: number }>(
        SKILLS_CACHE_KEY,
      );
      if (cached) {
        const response = NextResponse.json(cached);
        response.headers.set(
          "Cache-Control",
          "public, s-maxage=300, stale-while-revalidate=600",
        );
        return response;
      }
    } catch {
      // Fall through
    }
  }

  // Get skill configs to check which have API keys configured (server-side)
  const skillConfigs = getSkillConfigsFromEnv();

  const skills = AVAILABLE_SKILLS.map((skillId) => {
    const skill = skillRegistry.get(skillId);
    if (!skill) return null;

    const config = skillConfigs[skillId] || {};
    const validation = skill.validate(config);
    const isConfigured = validation === true;

    // Include API key config so users can configure their own keys
    const apiKeyConfig = skill.metadata.apiKeyConfig
      ? {
          label: skill.metadata.apiKeyConfig.label,
          helpText: skill.metadata.apiKeyConfig.helpText,
          helpUrl: skill.metadata.apiKeyConfig.helpUrl,
          placeholder: skill.metadata.apiKeyConfig.placeholder,
        }
      : null;

    return {
      id: skill.metadata.id,
      name: skill.metadata.name,
      description: skill.metadata.description,
      version: skill.metadata.version,
      category: skill.metadata.category,
      icon: skill.metadata.icon || "⚡",
      homepage: skill.metadata.homepage,
      tags: skill.metadata.tags,
      isConfigured,
      requiresApiKey: !!skill.metadata.apiKeyConfig,
      apiKeyConfig,
      // Include functions for UI display
      functions: skill.metadata.functions || [],
    };
  }).filter(Boolean);

  const payload = { skills, count: skills.length };

  // Cache in Redis
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(SKILLS_CACHE_KEY, payload, { ex: SKILLS_CACHE_TTL });
    } catch {
      // Non-critical
    }
  }

  const response = NextResponse.json(payload);
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=600",
  );
  return response;
}
