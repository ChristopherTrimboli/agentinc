import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/agents/image/[id]
 *
 * Serves or redirects to the agent's image.
 * Accepts tokenMint (CA) or database ID.
 * Used in 8004 metadata so the image URL is on our domain.
 *
 * - Regular URLs (Vercel Blob, etc.): 302 redirect
 * - Data URIs (base64): decoded and served directly
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const select = { imageUrl: true };
  const cacheStrategy = { ttl: 3600, swr: 7200 };

  const [byId, byMint] = await Promise.all([
    prisma.agent.findUnique({ where: { id }, select, cacheStrategy }),
    prisma.agent.findUnique({
      where: { tokenMint: id },
      select,
      cacheStrategy,
    }),
  ]);

  const agent = byId || byMint;

  if (!agent?.imageUrl) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Data URIs can't be used as redirect targets — decode and serve inline
  if (agent.imageUrl.startsWith("data:")) {
    const match = agent.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid image data" },
        { status: 500 },
      );
    }
    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  }

  return NextResponse.redirect(agent.imageUrl, {
    status: 302,
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=7200" },
  });
}
