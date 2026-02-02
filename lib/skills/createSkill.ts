import type { Skill, SkillConfig, SkillMetadata, SkillCategory } from "./types";
import type { Tool } from "ai";

/**
 * Helper to create a skill with a simpler API
 *
 * @example
 * ```typescript
 * const mySkill = createSkill({
 *   id: "my-skill",
 *   name: "My Skill",
 *   version: "1.0.0",
 *   description: "Does something cool",
 *   category: "custom",
 *   icon: "🎉",
 *
 *   validate: (config) => {
 *     if (!config.apiKey) return "API key required";
 *     return true;
 *   },
 *
 *   createTools: (config) => ({
 *     doSomething: tool({
 *       description: "Does something",
 *       parameters: z.object({ input: z.string() }),
 *       execute: async ({ input }) => {
 *         // Implementation
 *       }
 *     })
 *   })
 * });
 * ```
 */
export interface CreateSkillOptions {
  // Required metadata
  id: string;
  name: string;
  version: string;
  description: string;
  category: SkillCategory;

  // Optional metadata
  icon?: string;
  homepage?: string;
  requiredEnvVars?: string[];
  tags?: string[];

  // Required methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createTools: (config: SkillConfig) => Record<string, Tool<any, any>>;

  // Optional validation (defaults to always valid)
  validate?: (config: SkillConfig) => true | string;
}

/**
 * Create a skill from options
 */
export function createSkill(options: CreateSkillOptions): Skill {
  const metadata: SkillMetadata = {
    id: options.id,
    name: options.name,
    version: options.version,
    description: options.description,
    category: options.category,
    icon: options.icon,
    homepage: options.homepage,
    requiredEnvVars: options.requiredEnvVars,
    tags: options.tags,
  };

  return {
    metadata,

    validate(config: SkillConfig): true | string {
      if (options.validate) {
        return options.validate(config);
      }
      return true;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createTools(config: SkillConfig): Record<string, Tool<any, any>> {
      return options.createTools(config);
    },
  };
}

/**
 * Template for a new skill
 * Copy this and modify for your needs
 */
export const SKILL_TEMPLATE = `
import { createSkill } from "../createSkill";
import { tool } from "ai";
import { z } from "zod";

export const mySkill = createSkill({
  id: "my-skill",
  name: "My Skill",
  version: "1.0.0",
  description: "Description of what this skill does",
  category: "custom",
  icon: "🔧",
  requiredEnvVars: ["MY_API_KEY"],
  tags: ["example"],

  validate: (config) => {
    if (!config.apiKey && !process.env.MY_API_KEY) {
      return "MY_API_KEY environment variable is required";
    }
    return true;
  },

  createTools: (config) => {
    const apiKey = config.apiKey || process.env.MY_API_KEY;
    
    return {
      myAction: tool({
        description: "Does something useful",
        parameters: z.object({
          input: z.string().describe("The input to process"),
        }),
        execute: async ({ input }) => {
          // Your implementation here
          return { result: \`Processed: \${input}\` };
        },
      }),
    };
  },
});
`;
