import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";

const MAX_LIMIT = 500;

// GET /api/swarm/events/history - Get historical events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || "100")),
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));
    const type = searchParams.get("type");
    const sourceAgentId = searchParams.get("sourceAgentId");
    const targetAgentId = searchParams.get("targetAgentId");

    // Sanitize string inputs - only allow alphanumeric, hyphens, underscores
    const sanitizeId = (id: string | null): string | undefined => {
      if (!id) return undefined;
      return /^[\w-]+$/.test(id) ? id : undefined;
    };

    const sanitizedType = sanitizeId(type);
    const sanitizedSourceAgentId = sanitizeId(sourceAgentId);
    const sanitizedTargetAgentId = sanitizeId(targetAgentId);

    const where = {
      ...(sanitizedType && { type: sanitizedType }),
      ...(sanitizedSourceAgentId && { sourceAgentId: sanitizedSourceAgentId }),
      ...(sanitizedTargetAgentId && { targetAgentId: sanitizedTargetAgentId }),
    };

    const [events, total] = await Promise.all([
      prisma.swarmEvent.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
        include: {
          sourceAgent: true,
          targetAgent: true,
        },
      }),
      prisma.swarmEvent.count({ where }),
    ]);

    return NextResponse.json({
      events,
      total,
      limit,
      offset,
      hasMore: offset + events.length < total,
    });
  } catch (error) {
    console.error("Error fetching swarm events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}

// DELETE /api/swarm/events/history - Clear event history (requires auth, admin only)
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  // Check if user is admin
  const adminWallets = process.env.ADMIN_WALLET_ADDRESSES?.split(",") || [];
  if (!auth.walletAddress || !adminWallets.includes(auth.walletAddress)) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  try {
    const result = await prisma.swarmEvent.deleteMany({});
    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error) {
    console.error("Error clearing swarm events:", error);
    return NextResponse.json(
      { error: "Failed to clear events" },
      { status: 500 },
    );
  }
}
