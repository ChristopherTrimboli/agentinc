import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/swarm/corporations - List all corporations with their agents
export async function GET() {
  try {
    const corporations = await prisma.corporation.findMany({
      include: {
        agents: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ corporations });
  } catch (error) {
    console.error("Error fetching corporations:", error);
    return NextResponse.json(
      { error: "Failed to fetch corporations" },
      { status: 500 },
    );
  }
}

// POST /api/swarm/corporations - Create a new corporation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, logo, color, size } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const corporation = await prisma.corporation.create({
      data: {
        name,
        description,
        logo,
        color,
        size: size || 60,
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
