import { NextResponse } from "next/server";
import {
  skillRegistry,
  AVAILABLE_SKILLS,
  getSkillConfigsFromEnv,
} from "@/lib/skills";

/**
 * GET /api/skills
 * List all available skills
 */
export async function GET() {
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

  return NextResponse.json({
    skills,
    count: skills.length,
  });
}
