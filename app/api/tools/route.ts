import { NextResponse } from "next/server";
import { TOOL_GROUPS } from "@/lib/tools";

/**
 * GET /api/tools
 * Returns all available utility tools grouped by category
 */
export async function GET() {
  // Return tool groups for organized UI display
  const groups = TOOL_GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    icon: group.icon,
    logoUrl: group.logoUrl,
    source: group.source,
    requiresAuth: group.requiresAuth,
    functions: group.functions,
  }));

  // Also provide flat list of all function IDs for convenience
  const allFunctionIds = TOOL_GROUPS.flatMap((g) =>
    g.functions.map((f) => f.id),
  );

  return NextResponse.json({
    groups,
    functionIds: allFunctionIds,
    groupCount: groups.length,
    functionCount: allFunctionIds.length,
  });
}
