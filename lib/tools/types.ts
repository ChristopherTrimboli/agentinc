import type { Tool } from "ai";

/**
 * Tool registry entry - the canonical type for tool definitions.
 * For complex integrations requiring API keys, use skills instead.
 */
export interface ToolEntry {
  /** Tool name */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** The AI SDK tool instance */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: Tool<any, any>;
}
