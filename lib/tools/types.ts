import type { Tool } from "ai";

/**
 * Tool definition - simple utility tools that work with any model
 * For complex integrations requiring API keys, use skills instead
 */
export interface AgentTool {
  /** Tool name */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** The AI SDK tool instance */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: Tool<any, any>;
}

/**
 * Tool registry entry
 */
export interface ToolEntry {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: Tool<any, any>;
}
