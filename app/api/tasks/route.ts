import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { start } from "workflow/api";
import { recurringTaskWorkflow } from "@/workflows/tasks/workflow";
import type { TaskConfig, TaskTriggerMode } from "@/workflows/tasks/steps/execute";

// ── Constants ────────────────────────────────────────────────────────────────

const MIN_INTERVAL_MS = 60_000; // 1 minute
const MAX_INTERVAL_MS = 86_400_000; // 24 hours
const VALID_TRIGGER_MODES: TaskTriggerMode[] = [
  "interval",
  "event",
  "event-or-interval",
];
const MAX_CONCURRENT_TASKS = 10;

// ── GET: List user's tasks ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const rateLimited = await rateLimitByUser(auth.userId, "tasks-list", 30);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // e.g., "running,paused"
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const where: Record<string, unknown> = { userId: auth.userId };
    if (status) {
      where.status = { in: status.split(",") };
    }

    const [tasks, total] = await Promise.all([
      prisma.agentTask.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          currentIteration: true,
          intervalMs: true,
          maxIterations: true,
          lastExecutedAt: true,
          nextExecutionAt: true,
          enabledToolGroups: true,
          createdAt: true,
          updatedAt: true,
          agent: { select: { id: true, name: true, imageUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.agentTask.count({ where }),
    ]);

    return NextResponse.json({ tasks, total, limit, offset });
  } catch (error) {
    console.error("[Tasks API] List error:", error);
    return NextResponse.json(
      { error: "Failed to list tasks" },
      { status: 500 },
    );
  }
}

// ── POST: Create a new task ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const rateLimited = await rateLimitByUser(auth.userId, "tasks-create", 5);
  if (rateLimited) return rateLimited;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    name,
    taskPrompt,
    intervalMs,
    agentId,
    maxIterations,
    enabledToolGroups = [],
    enabledSkills = [],
    triggerMode = "interval",
  }: {
    name: string;
    taskPrompt: string;
    intervalMs: number;
    agentId: string;
    maxIterations?: number;
    enabledToolGroups?: string[];
    enabledSkills?: string[];
    triggerMode?: TaskTriggerMode;
  } = body;

  // Validate required fields
  if (!name || !taskPrompt || !agentId) {
    return NextResponse.json(
      {
        error: "Missing required fields: name, taskPrompt, agentId",
      },
      { status: 400 },
    );
  }

  // intervalMs is required for interval and event-or-interval modes
  if (triggerMode !== "event" && !intervalMs) {
    return NextResponse.json(
      { error: "intervalMs is required for interval and event-or-interval trigger modes" },
      { status: 400 },
    );
  }

  if (!VALID_TRIGGER_MODES.includes(triggerMode)) {
    return NextResponse.json(
      { error: `triggerMode must be one of: ${VALID_TRIGGER_MODES.join(", ")}` },
      { status: 400 },
    );
  }

  // Validate interval when provided
  if (intervalMs && (intervalMs < MIN_INTERVAL_MS || intervalMs > MAX_INTERVAL_MS)) {
    return NextResponse.json(
      {
        error: `intervalMs must be between ${MIN_INTERVAL_MS} (1 min) and ${MAX_INTERVAL_MS} (24 hrs)`,
      },
      { status: 400 },
    );
  }

  try {
    // Check concurrent task limit
    const activeCount = await prisma.agentTask.count({
      where: {
        userId: auth.userId,
        status: { in: ["running", "paused"] },
      },
    });

    if (activeCount >= MAX_CONCURRENT_TASKS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_CONCURRENT_TASKS} concurrent tasks reached` },
        { status: 429 },
      );
    }

    // Verify agent exists and user has access
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        systemPrompt: true,
        isPublic: true,
        createdById: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.isPublic && agent.createdById !== auth.userId) {
      return NextResponse.json(
        { error: "Access denied to this agent" },
        { status: 403 },
      );
    }

    // Generate a webhook secret for event-triggered tasks
    const webhookSecret =
      triggerMode !== "interval"
        ? randomBytes(32).toString("hex")
        : null;

    // Create task record
    const task = await prisma.agentTask.create({
      data: {
        name,
        description: taskPrompt,
        status: "running",
        taskPrompt,
        intervalMs: intervalMs ?? 0,
        maxIterations,
        enabledToolGroups,
        enabledSkills,
        triggerMode,
        webhookSecret,
        userId: auth.userId,
        agentId,
      },
    });

    // Build workflow config
    const taskConfig: TaskConfig = {
      taskId: task.id,
      agentId,
      userId: auth.userId,
      taskPrompt,
      systemPrompt: agent.systemPrompt,
      model: "anthropic/claude-haiku-4.5",
      intervalMs: intervalMs ?? 0,
      maxIterations: maxIterations ?? undefined,
      enabledToolGroups,
      enabledSkills,
      triggerMode,
    };

    // Start the durable workflow
    const run = await start(recurringTaskWorkflow, [taskConfig]);

    // Save workflow run ID
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { workflowRunId: run.runId },
    });

    return NextResponse.json(
      {
        task: {
          id: task.id,
          name: task.name,
          status: task.status,
          workflowRunId: run.runId,
          intervalMs: task.intervalMs,
          maxIterations: task.maxIterations,
          enabledToolGroups: task.enabledToolGroups,
          triggerMode: task.triggerMode,
          // Returned once at creation time — store securely, it won't be exposed again
          webhookSecret: task.webhookSecret ?? undefined,
          triggerUrl: task.webhookSecret
            ? `/api/tasks/${task.id}/trigger`
            : undefined,
          createdAt: task.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Tasks API] Create error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}
