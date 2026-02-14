import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  skillRegistry,
  AVAILABLE_SKILLS,
  type AvailableSkill,
} from "@/lib/skills";
import { verifyAuthUserId } from "@/lib/auth/verifyRequest";

/**
 * GET /api/agents/[id]/skills
 * Get the skills enabled for an agent
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await verifyAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: agentId } = await params;

  try {
    // Supports both database ID and tokenMint for dual-use URLs
    const agentSelect = {
      id: true,
      name: true,
      enabledSkills: true,
      createdById: true,
      isPublic: true,
    } as const;

    const [agentById, agentByMint] = await Promise.all([
      prisma.agent.findUnique({
        where: { id: agentId },
        select: agentSelect,
      }),
      prisma.agent.findUnique({
        where: { tokenMint: agentId },
        select: agentSelect,
      }),
    ]);

    const agent = agentById || agentByMint;

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.createdById !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get available skills with their metadata
    const availableSkills = skillRegistry.listSkills();

    // Mark which skills are enabled
    const skillsWithStatus = availableSkills.map((skill) => ({
      ...skill,
      enabled: agent.enabledSkills.includes(skill.id),
    }));

    return NextResponse.json({
      agentId: agent.id,
      agentName: agent.name,
      enabledSkills: agent.enabledSkills,
      availableSkills: skillsWithStatus,
    });
  } catch (error) {
    console.error("Failed to get agent skills:", error);
    return NextResponse.json(
      { error: "Failed to get agent skills" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/agents/[id]/skills
 * Update the skills enabled for an agent
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await verifyAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: agentId } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { enabledSkills } = body;

  // Validate enabledSkills is an array of strings
  if (!Array.isArray(enabledSkills)) {
    return NextResponse.json(
      { error: "enabledSkills must be an array" },
      { status: 400 },
    );
  }

  if (!enabledSkills.every((s: unknown) => typeof s === "string")) {
    return NextResponse.json(
      { error: "enabledSkills must contain only strings" },
      { status: 400 },
    );
  }

  // Validate skill IDs
  const invalidSkills = enabledSkills.filter(
    (skillId) => !AVAILABLE_SKILLS.includes(skillId as AvailableSkill),
  );

  if (invalidSkills.length > 0) {
    return NextResponse.json(
      {
        error: `Invalid skill IDs: ${invalidSkills.join(", ")}`,
        availableSkills: AVAILABLE_SKILLS,
      },
      { status: 400 },
    );
  }

  try {
    // Supports both database ID and tokenMint
    const [putAgentById, putAgentByMint] = await Promise.all([
      prisma.agent.findUnique({
        where: { id: agentId },
        select: { id: true, createdById: true },
      }),
      prisma.agent.findUnique({
        where: { tokenMint: agentId },
        select: { id: true, createdById: true },
      }),
    ]);

    const agent = putAgentById || putAgentByMint;

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.createdById !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: agent.id },
      data: { enabledSkills },
      select: {
        id: true,
        name: true,
        enabledSkills: true,
      },
    });

    return NextResponse.json({
      message: "Skills updated successfully",
      agent: updatedAgent,
    });
  } catch (error) {
    console.error("Failed to update agent skills:", error);
    return NextResponse.json(
      { error: "Failed to update agent skills" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/agents/[id]/skills
 * Enable or disable a single skill
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await verifyAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: agentId } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { skillId, enabled } = body;

  // Validate required fields
  if (typeof skillId !== "string" || skillId.trim() === "") {
    return NextResponse.json(
      { error: "skillId is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  if (typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "enabled is required and must be a boolean" },
      { status: 400 },
    );
  }

  if (!AVAILABLE_SKILLS.includes(skillId as AvailableSkill)) {
    return NextResponse.json(
      {
        error: `Invalid skill ID: ${skillId}`,
        availableSkills: AVAILABLE_SKILLS,
      },
      { status: 400 },
    );
  }

  try {
    // Supports both database ID and tokenMint
    const [patchAgentById, patchAgentByMint] = await Promise.all([
      prisma.agent.findUnique({
        where: { id: agentId },
        select: { id: true, createdById: true, enabledSkills: true },
      }),
      prisma.agent.findUnique({
        where: { tokenMint: agentId },
        select: { id: true, createdById: true, enabledSkills: true },
      }),
    ]);

    const agent = patchAgentById || patchAgentByMint;

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.createdById !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let newSkills: string[];
    if (enabled) {
      newSkills = agent.enabledSkills.includes(skillId)
        ? agent.enabledSkills
        : [...agent.enabledSkills, skillId];
    } else {
      newSkills = agent.enabledSkills.filter((s) => s !== skillId);
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: agent.id },
      data: { enabledSkills: newSkills },
      select: {
        id: true,
        name: true,
        enabledSkills: true,
      },
    });

    return NextResponse.json({
      message: enabled
        ? `Skill "${skillId}" enabled`
        : `Skill "${skillId}" disabled`,
      agent: updatedAgent,
    });
  } catch (error) {
    console.error("Failed to toggle skill:", error);
    return NextResponse.json(
      { error: "Failed to toggle skill" },
      { status: 500 },
    );
  }
}
