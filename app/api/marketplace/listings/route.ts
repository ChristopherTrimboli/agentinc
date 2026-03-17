import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByIP, rateLimitByUser } from "@/lib/rateLimit";
import {
  MARKETPLACE_CATEGORIES,
  LISTING_TYPES,
  PRICE_TYPES,
  type CreateListingInput,
  type MarketplaceCategory,
  type ListingType,
} from "@/lib/marketplace/types";
import type { Prisma } from "@/app/generated/prisma/client";

// GET /api/marketplace/listings — Browse/search listings (public, auth for ownerId)
export async function GET(req: NextRequest) {
  const limited = await rateLimitByIP(req, "marketplace-listings", 60);
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20),
    );
    const type = searchParams.get("type") as ListingType | null;
    const category = searchParams.get("category") as MarketplaceCategory | null;
    const search = searchParams.get("search");
    const minPriceRaw = searchParams.get("minPrice")
      ? parseFloat(searchParams.get("minPrice")!)
      : undefined;
    const maxPriceRaw = searchParams.get("maxPrice")
      ? parseFloat(searchParams.get("maxPrice")!)
      : undefined;
    const minPrice =
      minPriceRaw !== undefined && !isNaN(minPriceRaw)
        ? minPriceRaw
        : undefined;
    const maxPrice =
      maxPriceRaw !== undefined && !isNaN(maxPriceRaw)
        ? maxPriceRaw
        : undefined;
    const isRemote = searchParams.get("isRemote");
    const sort = searchParams.get("sort") || "newest";
    const ownerId = searchParams.get("ownerId");

    const where: Prisma.MarketplaceListingWhereInput = {};
    const andConditions: Prisma.MarketplaceListingWhereInput[] = [];

    // Viewing hidden listings requires auth — only the owner can see their own unlisted items
    if (ownerId) {
      const auth = await requireAuth(req);
      if (!isAuthResult(auth)) return auth;
      if (auth.userId !== ownerId) {
        return NextResponse.json(
          { error: "Can only view your own listings" },
          { status: 403 },
        );
      }
      andConditions.push({
        OR: [
          { userId: ownerId },
          { agent: { createdById: ownerId } },
          { corporation: { agents: { some: { createdById: ownerId } } } },
        ],
      });
    } else {
      where.isAvailable = true;
    }

    if (type && LISTING_TYPES.includes(type)) {
      where.type = type;
    }
    if (category && MARKETPLACE_CATEGORIES.includes(category)) {
      where.category = category;
    }
    if (isRemote === "true") {
      where.isRemote = true;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.priceSol = {};
      if (minPrice !== undefined) where.priceSol.gte = minPrice;
      if (maxPrice !== undefined) where.priceSol.lte = maxPrice;
    }
    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { skills: { hasSome: [search.toLowerCase()] } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    let orderBy: Prisma.MarketplaceListingOrderByWithRelationInput;
    switch (sort) {
      case "rating":
        orderBy = { averageRating: "desc" };
        break;
      case "price_asc":
        orderBy = { priceSol: "asc" };
        break;
      case "price_desc":
        orderBy = { priceSol: "desc" };
        break;
      case "most_completed":
        orderBy = { completedTasks: "desc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              rarity: true,
              tokenMint: true,
              tokenSymbol: true,
            },
          },
          corporation: {
            select: {
              id: true,
              name: true,
              logo: true,
              tokenMint: true,
              tokenSymbol: true,
            },
          },
          user: {
            select: {
              id: true,
              email: !!ownerId,
            },
          },
        },
        cacheStrategy: ownerId ? undefined : { ttl: 10, swr: 30 },
      }),
      prisma.marketplaceListing.count({
        where,
        cacheStrategy: ownerId ? undefined : { ttl: 10, swr: 30 },
      }),
    ]);

    return NextResponse.json({
      listings,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[Marketplace] Error fetching listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 },
    );
  }
}

// POST /api/marketplace/listings — Create a listing (auth required)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(
    auth.userId,
    "marketplace-listing-create",
    10,
  );
  if (limited) return limited;

  try {
    const body = (await req.json()) as CreateListingInput;

    if (
      !body.title ||
      !body.description ||
      !body.category ||
      !body.type ||
      !body.priceType
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title, description, category, type, priceType",
        },
        { status: 400 },
      );
    }
    if (!LISTING_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${LISTING_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    if (!MARKETPLACE_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${MARKETPLACE_CATEGORIES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (!PRICE_TYPES.includes(body.priceType)) {
      return NextResponse.json(
        {
          error: `Invalid priceType. Must be one of: ${PRICE_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (body.title.length > 200) {
      return NextResponse.json(
        { error: "Title must be 200 characters or less" },
        { status: 400 },
      );
    }
    if (body.description.length > 10000) {
      return NextResponse.json(
        { error: "Description must be 10000 characters or less" },
        { status: 400 },
      );
    }
    if (
      body.priceSol !== undefined &&
      body.priceSol !== null &&
      (typeof body.priceSol !== "number" ||
        body.priceSol < 0 ||
        isNaN(body.priceSol))
    ) {
      return NextResponse.json(
        { error: "priceSol must be a non-negative number" },
        { status: 400 },
      );
    }

    // Verify ownership for agent/corporation listings
    if (body.type === "agent") {
      if (!body.agentId) {
        return NextResponse.json(
          { error: "agentId is required for agent listings" },
          { status: 400 },
        );
      }
      const agent = await prisma.agent.findUnique({
        where: { id: body.agentId },
        select: { createdById: true },
      });
      if (!agent || agent.createdById !== auth.userId) {
        return NextResponse.json(
          { error: "Agent not found or not owned by you" },
          { status: 403 },
        );
      }
    }

    if (body.type === "corporation") {
      if (!body.corporationId) {
        return NextResponse.json(
          { error: "corporationId is required for corporation listings" },
          { status: 400 },
        );
      }
      const corp = await prisma.corporation.findUnique({
        where: { id: body.corporationId },
        select: {
          agents: { select: { createdById: true } },
        },
      });
      if (!corp) {
        return NextResponse.json(
          { error: "Corporation not found" },
          { status: 404 },
        );
      }
      const isCorpOwner = corp.agents.some(
        (a) => a.createdById === auth.userId,
      );
      if (!isCorpOwner) {
        return NextResponse.json(
          { error: "Corporation not owned by you" },
          { status: 403 },
        );
      }
    }

    // Validate skills items are strings
    if (body.skills) {
      if (
        !Array.isArray(body.skills) ||
        !body.skills.every((s: unknown) => typeof s === "string")
      ) {
        return NextResponse.json(
          { error: "skills must be an array of strings" },
          { status: 400 },
        );
      }
      if (body.skills.length > 20) {
        return NextResponse.json(
          { error: "Maximum 20 skills allowed" },
          { status: 400 },
        );
      }
    }

    // Validate string field lengths
    if (
      body.location &&
      (typeof body.location !== "string" || body.location.length > 200)
    ) {
      return NextResponse.json(
        { error: "location must be 200 characters or less" },
        { status: 400 },
      );
    }
    if (
      body.priceToken &&
      (typeof body.priceToken !== "string" || body.priceToken.length > 100)
    ) {
      return NextResponse.json(
        { error: "priceToken must be 100 characters or less" },
        { status: 400 },
      );
    }
    if (
      body.featuredImage &&
      (typeof body.featuredImage !== "string" ||
        body.featuredImage.length > 500)
    ) {
      return NextResponse.json(
        { error: "featuredImage URL must be 500 characters or less" },
        { status: 400 },
      );
    }

    try {
      const listing = await prisma.marketplaceListing.create({
        data: {
          type: body.type,
          title: body.title,
          description: body.description,
          category: body.category,
          skills: body.skills || [],
          priceType: body.priceType,
          priceSol: body.priceSol,
          priceToken: body.priceToken,
          location: body.location,
          isRemote: body.isRemote ?? true,
          availableHours: body.availableHours,
          featuredImage: body.featuredImage,
          userId: body.type === "human" ? auth.userId : undefined,
          agentId: body.type === "agent" ? body.agentId : undefined,
          corporationId:
            body.type === "corporation" ? body.corporationId : undefined,
        },
      });

      return NextResponse.json(listing, { status: 201 });
    } catch (createError: unknown) {
      if (
        typeof createError === "object" &&
        createError !== null &&
        "code" in createError &&
        (createError as { code: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { error: "This agent or corporation already has a listing" },
          { status: 409 },
        );
      }
      throw createError;
    }
  } catch (error) {
    console.error("[Marketplace] Error creating listing:", error);
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 },
    );
  }
}
