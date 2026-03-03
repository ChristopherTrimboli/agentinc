import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/agents/image/[id]
 *
 * Redirects to the agent's image stored on Vercel Blob.
 * Accepts tokenMint (CA) or database ID.
 * Used in 8004 metadata so the image URL is on our domain.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const select = { imageUrl: true };
  const cacheStrategy = { ttl: 3600, swr: 7200 };

  const [byId, byMint] = await Promise.all([
    prisma.agent.findUnique({ where: { id }, select, cacheStrategy }),
    prisma.agent.findUnique({ where: { tokenMint: id }, select, cacheStrategy }),
  ]);

  const agent = byId || byMint;

  if (!agent?.imageUrl) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.redirect(agent.imageUrl, {
    status: 302,
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=7200" },
  });
}
