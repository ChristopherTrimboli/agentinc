import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import prisma from "@/lib/prisma";
import { skillRegistry, AVAILABLE_SKILLS, type AvailableSkill } from "@/lib/skills";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

/**
 * GET /api/agents/[id]/skills
 * Get the skills enabled for an agent
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const idToken = req.headers.get("privy-id-token");

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: string;
  try {
    const privyUser = await privy.users().get({ id_token: idToken });
    userId = privyUser.id;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { id: agentId } = await params;

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        enabledSkills: true,
        createdById: true,
        isPublic: true,
      },
    });

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
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/[id]/skills
 * Update the skills enabled for an agent
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const idToken = req.headers.get("privy-id-token");

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: string;
  try {
    const privyUser = await privy.users().get({ id_token: idToken });
    userId = privyUser.id;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { id: agentId } = await params;
  const { enabledSkills }: { enabledSkills: string[] } = await req.json();

  // Validate skill IDs
  const invalidSkills = enabledSkills.filter(
    (skillId) => !AVAILABLE_SKILLS.includes(skillId as AvailableSkill)
  );

  if (invalidSkills.length > 0) {
    return NextResponse.json(
      {
        error: `Invalid skill IDs: ${invalidSkills.join(", ")}`,
        availableSkills: AVAILABLE_SKILLS,
      },
      { status: 400 }
    );
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { createdById: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.createdById !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
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
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agents/[id]/skills
 * Enable or disable a single skill
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const idToken = req.headers.get("privy-id-token");

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: string;
  try {
    const privyUser = await privy.users().get({ id_token: idToken });
    userId = privyUser.id;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { id: agentId } = await params;
  const { skillId, enabled }: { skillId: string; enabled: boolean } = await req.json();

  if (!AVAILABLE_SKILLS.includes(skillId as AvailableSkill)) {
    return NextResponse.json(
      {
        error: `Invalid skill ID: ${skillId}`,
        availableSkills: AVAILABLE_SKILLS,
      },
      { status: 400 }
    );
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { createdById: true, enabledSkills: true },
    });

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
      where: { id: agentId },
      data: { enabledSkills: newSkills },
      select: {
        id: true,
        name: true,
        enabledSkills: true,
      },
    });

    return NextResponse.json({
      message: enabled ? `Skill "${skillId}" enabled` : `Skill "${skillId}" disabled`,
      agent: updatedAgent,
    });
  } catch (error) {
    console.error("Failed to toggle skill:", error);
    return NextResponse.json(
      { error: "Failed to toggle skill" },
      { status: 500 }
    );
  }
}
