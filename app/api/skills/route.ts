import { NextResponse } from "next/server";
import { skillRegistry } from "@/lib/skills";
import { AVAILABLE_TOOLS } from "@/lib/tools";

/**
 * GET /api/skills
 * List all available skills and tools
 */
export async function GET() {
  // Get skills (complex integrations, Claude only)
  const skills = skillRegistry.getAll().map((skill) => ({
    id: skill.metadata.id,
    name: skill.metadata.name,
    description: skill.metadata.description,
    version: skill.metadata.version,
    category: skill.metadata.category,
    icon: skill.metadata.icon,
    homepage: skill.metadata.homepage,
    tags: skill.metadata.tags,
    requiredEnvVars: skill.metadata.requiredEnvVars,
    configured: skill.metadata.requiredEnvVars?.every(
      (envVar) => !!process.env[envVar]
    ) ?? true,
    type: "skill" as const,
  }));

  // Get tools (simple utilities, any model)
  const tools = AVAILABLE_TOOLS.map((toolName) => ({
    id: toolName,
    name: toolName,
    description: `Built-in ${toolName} tool`,
    type: "tool" as const,
  }));

  return NextResponse.json({
    skills,
    tools,
    skillCount: skills.length,
    toolCount: tools.length,
  });
}
