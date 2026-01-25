import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import prisma from "@/lib/prisma";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

// Helper to verify auth and get user ID
async function verifyAuth(req: NextRequest): Promise<string | null> {
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) return null;

  try {
    const privyUser = await privy.users().get({ id_token: idToken });
    return privyUser.id;
  } catch {
    return null;
  }
}

// GET /api/agents - List user's agents
export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agents = await prisma.agent.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 },
    );
  }
}

// POST /api/agents - Create a new agent
export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, systemPrompt, description, isPublic } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Agent name is required" },
        { status: 400 },
      );
    }

    if (
      !systemPrompt ||
      typeof systemPrompt !== "string" ||
      systemPrompt.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "System prompt is required" },
        { status: 400 },
      );
    }

    const agent = await prisma.agent.create({
      data: {
        name: name.trim(),
        systemPrompt: systemPrompt.trim(),
        description: description?.trim() || null,
        isPublic: Boolean(isPublic),
        createdById: userId,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 },
    );
  }
}
