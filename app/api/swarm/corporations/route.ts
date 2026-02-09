import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByIP, rateLimitByUser } from "@/lib/rateLimit";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// GET /api/swarm/corporations - List all corporations with their agents (paginated)
export async function GET(req: NextRequest) {
  const limited = await rateLimitByIP(req, "swarm-corps", 30);
  if (limited) return limited;

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

    // Cache public corporation data: 30s TTL with 60s SWR
    const cacheStrategy = { ttl: 30, swr: 60 };

    const [corporations, total] = await Promise.all([
      prisma.corporation.findMany({
        include: {
          agents: true,
          _count: { select: { agents: true } },
        },
        orderBy: { createdAt: "asc" },
        take: limit,
        skip: offset,
        cacheStrategy,
      }),
      prisma.corporation.count({ cacheStrategy }),
    ]);

    return NextResponse.json({
      corporations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching corporations:", error);
    return NextResponse.json(
      { error: "Failed to fetch corporations" },
      { status: 500 },
    );
  }
}

// POST /api/swarm/corporations - Create a new corporation (requires auth)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "swarm-corp-create", 10);
  if (limited) return limited;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const { name, description, logo, color, size } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const corporation = await prisma.corporation.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        logo: logo || null,
        color: color || null,
        size: typeof size === "number" ? size : 60,
      },
    });

    return NextResponse.json({ corporation }, { status: 201 });
  } catch (error) {
    console.error("Error creating corporation:", error);
    return NextResponse.json(
      { error: "Failed to create corporation" },
      { status: 500 },
    );
  }
}
