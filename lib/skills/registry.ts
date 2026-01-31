import type { Skill, SkillConfig, SkillCategory } from "./types";
import type { Tool } from "ai";

/**
 * Skill Registry - manages available skills and creates tool sets
 * Skills are complex integrations (external APIs) - only Claude supports these
 */
class SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  /**
   * Register a skill with the registry
   */
  register(skill: Skill): void {
    if (this.skills.has(skill.metadata.id)) {
      console.warn(`Skill "${skill.metadata.id}" is already registered. Overwriting.`);
    }
    this.skills.set(skill.metadata.id, skill);
  }

  /**
   * Get a skill by ID
   */
  get(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Get all registered skills
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skills by category
   */
  getByCategory(category: SkillCategory): Skill[] {
    return this.getAll().filter((s) => s.metadata.category === category);
  }

  /**
   * Check if a skill is registered
   */
  has(skillId: string): boolean {
    return this.skills.has(skillId);
  }

  /**
   * Get metadata for all skills
   */
  listSkills(): Array<{
    id: string;
    name: string;
    description: string;
    category: SkillCategory;
    icon?: string;
  }> {
    return this.getAll().map((s) => ({
      id: s.metadata.id,
      name: s.metadata.name,
      description: s.metadata.description,
      category: s.metadata.category,
      icon: s.metadata.icon,
    }));
  }

  /**
   * Create tools for specified skills
   */
  createTools(
    skillIds: string[],
    configs: Record<string, SkillConfig> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Record<string, Tool<any, any>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, Tool<any, any>> = {};

    for (const skillId of skillIds) {
      const skill = this.skills.get(skillId);
      if (!skill) {
        console.warn(`Skill "${skillId}" not found in registry`);
        continue;
      }

      const config = configs[skillId] || {};
      const validation = skill.validate(config);
      
      if (validation !== true) {
        console.warn(`Skill "${skillId}" validation failed: ${validation}`);
        continue;
      }

      const skillTools = skill.createTools(config);
      
      // Prefix tool names with skill ID to avoid collisions
      for (const [toolName, tool] of Object.entries(skillTools)) {
        const prefixedName = `${skillId}_${toolName}`;
        tools[prefixedName] = tool;
      }
    }

    return tools;
  }

  /**
   * Get system prompts for specified skills
   */
  getSystemPrompts(skillIds: string[]): string {
    return skillIds
      .map((id) => this.skills.get(id)?.systemPrompt)
      .filter(Boolean)
      .join("\n\n");
  }
}

// Singleton instance
export const skillRegistry = new SkillRegistry();

/**
 * Helper to register a skill
 */
export function registerSkill(skill: Skill): void {
  skillRegistry.register(skill);
}

/**
 * Helper to get tools for specific skills
 */
export function getSkillTools(
  skillIds: string[],
  configs?: Record<string, SkillConfig>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, Tool<any, any>> {
  return skillRegistry.createTools(skillIds, configs);
}
