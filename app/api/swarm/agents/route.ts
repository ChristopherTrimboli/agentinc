import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// GET /api/swarm/agents - List all swarm agents with corporation (paginated)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE)),
      ),
    );
    const offset = (page - 1) * limit;

    // Cache public swarm data: 30s TTL with 60s SWR
    const cacheStrategy = { ttl: 30, swr: 60 };

    const [agents, total] = await Promise.all([
      prisma.swarmAgent.findMany({
        include: {
          corporation: true,
        },
        orderBy: { createdAt: "asc" },
        take: limit,
        skip: offset,
        cacheStrategy,
      }),
      prisma.swarmAgent.count({ cacheStrategy }),
    ]);

    return NextResponse.json({
      agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching swarm agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 },
    );
  }
}

// POST /api/swarm/agents - Create a new swarm agent (requires auth)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const { name, description, capabilities, color, size } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate capabilities is an array of strings
    if (
      capabilities &&
      (!Array.isArray(capabilities) ||
        !capabilities.every((c: unknown) => typeof c === "string"))
    ) {
      return NextResponse.json(
        { error: "Capabilities must be an array of strings" },
        { status: 400 },
      );
    }

    const agent = await prisma.swarmAgent.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        capabilities: capabilities || [],
        color: color || null,
        size: typeof size === "number" ? size : 35,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error("Error creating swarm agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 },
    );
  }
}

// DELETE /api/swarm/agents - Delete all swarm agents (requires auth, admin only)
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
    // Use transaction for atomic deletion
    await prisma.$transaction([
      prisma.swarmEvent.deleteMany({}),
      prisma.swarmAgent.deleteMany({}),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting swarm agents:", error);
    return NextResponse.json(
      { error: "Failed to delete agents" },
      { status: 500 },
    );
  }
}
