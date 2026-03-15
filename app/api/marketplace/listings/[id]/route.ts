import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByIP } from "@/lib/rateLimit";
import { MARKETPLACE_CATEGORIES, PRICE_TYPES } from "@/lib/marketplace/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/marketplace/listings/[id] — Get a single listing (public)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const limited = await rateLimitByIP(req, "marketplace-listing-detail", 60);
  if (limited) return limited;

  const { id } = await params;

  try {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            rarity: true,
            tokenMint: true,
            tokenSymbol: true,
            description: true,
            personality: true,
          },
        },
        corporation: {
          select: {
            id: true,
            name: true,
            logo: true,
            tokenMint: true,
            tokenSymbol: true,
            description: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        tasks: {
          where: { status: "completed" },
          select: {
            id: true,
            title: true,
            completedAt: true,
            reviews: {
              select: { rating: true, comment: true, createdAt: true },
            },
          },
          orderBy: { completedAt: "desc" },
          take: 10,
        },
      },
      cacheStrategy: { ttl: 5, swr: 15 },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error("[Marketplace] Error fetching listing:", error);
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 },
    );
  }
}

// PATCH /api/marketplace/listings/[id] — Update a listing (owner only)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const { id } = await params;

  try {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      select: {
        userId: true,
        agentId: true,
        corporationId: true,
        agent: { select: { createdById: true } },
        corporation: {
          select: { agents: { select: { createdById: true }, take: 1 } },
        },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const isOwner =
      listing.userId === auth.userId ||
      listing.agent?.createdById === auth.userId ||
      listing.corporation?.agents[0]?.createdById === auth.userId;

    if (!isOwner) {
      return NextResponse.json(
        { error: "Not authorized to edit this listing" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const allowedFields = [
      "title",
      "description",
      "category",
      "skills",
      "priceType",
      "priceSol",
      "priceToken",
      "location",
      "isRemote",
      "isAvailable",
      "availableHours",
      "featuredImage",
      "portfolio",
    ];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (
          field === "category" &&
          !MARKETPLACE_CATEGORIES.includes(body[field])
        ) {
          return NextResponse.json(
            { error: "Invalid category" },
            { status: 400 },
          );
        }
        if (field === "priceType" && !PRICE_TYPES.includes(body[field])) {
          return NextResponse.json(
            { error: "Invalid priceType" },
            { status: 400 },
          );
        }
        data[field] = body[field];
      }
    }

    const updated = await prisma.marketplaceListing.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[Marketplace] Error updating listing:", error);
    return NextResponse.json(
      { error: "Failed to update listing" },
      { status: 500 },
    );
  }
}

// DELETE /api/marketplace/listings/[id] — Delete a listing (owner only)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const { id } = await params;

  try {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      select: {
        userId: true,
        agent: { select: { createdById: true } },
        corporation: {
          select: { agents: { select: { createdById: true }, take: 1 } },
        },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const isOwner =
      listing.userId === auth.userId ||
      listing.agent?.createdById === auth.userId ||
      listing.corporation?.agents[0]?.createdById === auth.userId;

    if (!isOwner) {
      return NextResponse.json(
        { error: "Not authorized to delete this listing" },
        { status: 403 },
      );
    }

    await prisma.marketplaceListing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Marketplace] Error deleting listing:", error);
    return NextResponse.json(
      { error: "Failed to delete listing" },
      { status: 500 },
    );
  }
}
