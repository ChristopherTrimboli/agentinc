import type { Tool } from "ai";

/**
 * A heterogeneous tool record where each tool may have different
 * parameter/result shapes. The AI SDK's Tool type is generic, but
 * a registry holding many different tools must erase the type params.
 *
 * Centralised here so the rest of the codebase uses this alias
 * instead of scattering eslint-disable comments everywhere.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTool = Tool<any, any>;

/** A record of named tools with heterogeneous parameter/result types. */
export type ToolMap = Record<string, AnyTool>;
