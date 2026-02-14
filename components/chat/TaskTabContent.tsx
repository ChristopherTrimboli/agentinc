"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap,
  Pause,
  Play,
  Square,
  Clock,
  Hash,
  AlertCircle,
  CheckCircle,
  StopCircle,
  Loader2,
  ChevronDown,
  Wrench,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import type { TaskStatus } from "./TabBar";

// ── Types ────────────────────────────────────────────────────────────────────

interface TaskLog {
  id: string;
  iteration: number;
  content: string;
  parts?: {
    toolCalls?: Array<{ name: string; args: unknown; result: unknown }>;
    tokenUsage?: { inputTokens: number; outputTokens: number };
    error?: string;
  };
  status: string;
  createdAt: string;
}

interface TaskData {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  currentIteration: number;
  intervalMs: number;
  maxIterations?: number;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
  errorMessage?: string;
  enabledToolGroups: string[];
  createdAt: string;
  agent: {
    id: string;
    name: string;
    imageUrl?: string | null;
  };
}

interface TaskTabContentProps {
  taskId: string;
  identityToken?: string | null;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TaskStatus }) {
  const config: Record<
    TaskStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    running: {
      label: "Running",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      icon: (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      ),
    },
    paused: {
      label: "Paused",
      className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      icon: <Pause className="h-3 w-3" />,
    },
    completed: {
      label: "Completed",
      className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    failed: {
      label: "Failed",
      className: "bg-red-500/10 text-red-400 border-red-500/20",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    stopped: {
      label: "Stopped",
      className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
      icon: <StopCircle className="h-3 w-3" />,
    },
  };

  const { label, className, icon } = config[status] ?? config.stopped;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

// ── Log Entry ────────────────────────────────────────────────────────────────

function LogEntry({ log }: { log: TaskLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasToolCalls = log.parts?.toolCalls && log.parts.toolCalls.length > 0;

  return (
    <div
      className={`border-l-2 pl-4 py-3 ${
        log.status === "error" ? "border-red-500/50" : "border-emerald-500/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Hash className="h-3 w-3" />
        <span className="font-mono">Iteration {log.iteration}</span>
        <span className="text-zinc-700">|</span>
        <Clock className="h-3 w-3" />
        <span>
          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
        </span>
        {log.status === "error" && (
          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-400">
            Error
          </span>
        )}
        {hasToolCalls && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto flex items-center gap-1 text-zinc-500 hover:text-zinc-300"
          >
            <Wrench className="h-3 w-3" />
            <span>
              {log.parts!.toolCalls!.length} tool call
              {log.parts!.toolCalls!.length !== 1 ? "s" : ""}
            </span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mt-1.5 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
        {log.content}
      </div>

      {/* Tool calls (expanded) */}
      {expanded && hasToolCalls && (
        <div className="mt-2 space-y-1.5">
          {log.parts!.toolCalls!.map((tc, i) => (
            <div
              key={i}
              className="rounded-md bg-zinc-800/50 px-3 py-2 text-xs font-mono"
            >
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Wrench className="h-3 w-3" />
                <span className="font-semibold text-zinc-300">{tc.name}</span>
              </div>
              {tc.args != null && (
                <pre className="mt-1 overflow-x-auto text-zinc-500">
                  {JSON.stringify(tc.args, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Token usage */}
      {log.parts?.tokenUsage && (
        <div className="mt-1 text-xs text-zinc-600">
          {log.parts.tokenUsage.inputTokens + log.parts.tokenUsage.outputTokens}{" "}
          tokens
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function TaskTabContent({
  taskId,
  identityToken,
  onStatusChange,
}: TaskTabContentProps) {
  const [task, setTask] = useState<TaskData | null>(null);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [controlling, setControlling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const headersRef = useRef<Record<string, string>>({});
  headersRef.current = identityToken ? { "privy-id-token": identityToken } : {};

  // Fetch task data
  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        headers: headersRef.current,
      });
      if (!res.ok) return;
      const data = await res.json();
      setTask(data.task);
      setLogs(
        (data.task.logs || []).sort(
          (a: TaskLog, b: TaskLog) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
    } catch (error) {
      console.error("[TaskTab] Failed to fetch task:", error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Store onStatusChange in a ref to avoid re-triggering the poll effect
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  // Poll for task updates (EventSource doesn't support custom auth headers)
  useEffect(() => {
    fetchTask();

    let active = true;
    const pollInterval = 5000; // 5 seconds

    const poll = async () => {
      if (!active) return;

      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          headers: headersRef.current,
        });
        if (!res.ok || !active) return;
        const data = await res.json();
        const updatedTask = data.task;

        if (updatedTask) {
          setTask(updatedTask);

          if (updatedTask.status && onStatusChangeRef.current) {
            onStatusChangeRef.current(taskId, updatedTask.status);
          }

          // Update logs
          const newLogs = (updatedTask.logs || []).sort(
            (a: TaskLog, b: TaskLog) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          setLogs((prev) => {
            // Only update if we have new entries
            if (newLogs.length !== prev.length) {
              // Auto-scroll to bottom on new entries
              requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({
                  top: scrollRef.current?.scrollHeight ?? 0,
                  behavior: "smooth",
                });
              });
              return newLogs;
            }
            return prev;
          });

          // Stop polling if task is done (but keep polling for a bit after transitions)
          if (["completed", "stopped", "failed"].includes(updatedTask.status)) {
            // Poll once more after 3 seconds to ensure we caught the final state
            setTimeout(() => {
              if (active) {
                fetch(`/api/tasks/${taskId}`, {
                  headers: headersRef.current,
                })
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.task) {
                      setTask(data.task);
                    }
                  })
                  .catch(() => {});
              }
            }, 3000);
            return; // Don't schedule next poll
          }
        }
      } catch {
        // Continue polling on error
      }

      if (active) {
        setTimeout(poll, pollInterval);
      }
    };

    // Start polling after initial fetch
    const timer = setTimeout(poll, pollInterval);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [taskId, fetchTask]);

  // Control actions
  const sendControl = async (action: "stop" | "pause" | "resume") => {
    setControlling(true);
    try {
      // Optimistically update the UI
      if (task) {
        const optimisticStatus: TaskStatus =
          action === "stop"
            ? "stopped"
            : action === "pause"
              ? "paused"
              : "running";
        setTask({ ...task, status: optimisticStatus });
        if (onStatusChange) {
          onStatusChange(taskId, optimisticStatus);
        }
      }

      await fetch(`/api/tasks/${taskId}/control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headersRef.current,
        },
        body: JSON.stringify({ action }),
      });

      // Refresh task state after a short delay to get actual status
      setTimeout(() => {
        fetchTask();
      }, 1000);
    } catch (error) {
      console.error("[TaskTab] Control error:", error);
      // Revert optimistic update on error
      await fetchTask();
    } finally {
      setControlling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading task...</span>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <AlertCircle className="h-6 w-6" />
          <span className="text-sm">Task not found</span>
        </div>
      </div>
    );
  }

  const intervalMinutes = task.intervalMs / 60000;
  const isActive = task.status === "running" || task.status === "paused";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/50 px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Agent avatar */}
            {task.agent.imageUrl ? (
              <Image
                src={task.agent.imageUrl}
                alt={task.agent.name}
                width={36}
                height={36}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800">
                <Zap className="h-4 w-4 text-zinc-400" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-zinc-100">
                  {task.name}
                </h3>
                <StatusBadge status={task.status} />
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  every{" "}
                  {intervalMinutes >= 60
                    ? `${Math.round(intervalMinutes / 60)}h`
                    : `${intervalMinutes}m`}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {task.currentIteration} iteration
                  {task.currentIteration !== 1 ? "s" : ""}
                  {task.maxIterations ? ` / ${task.maxIterations}` : ""}
                </span>
                <span className="text-zinc-600">{task.agent.name}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          {isActive && (
            <div className="flex items-center gap-1.5">
              {task.status === "running" ? (
                <button
                  onClick={() => sendControl("pause")}
                  disabled={controlling}
                  className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
                >
                  {controlling ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Pause className="h-3 w-3" />
                  )}
                  Pause
                </button>
              ) : (
                <button
                  onClick={() => sendControl("resume")}
                  disabled={controlling}
                  className="flex items-center gap-1.5 rounded-md border border-emerald-700 bg-emerald-800/20 px-3 py-1.5 text-xs text-emerald-400 transition-colors hover:bg-emerald-800/40 disabled:opacity-50"
                >
                  {controlling ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  Resume
                </button>
              )}
              <button
                onClick={() => sendControl("stop")}
                disabled={controlling}
                className="flex items-center gap-1.5 rounded-md border border-red-700/50 bg-red-900/20 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-900/40 disabled:opacity-50"
              >
                {controlling ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Square className="h-3 w-3" />
                )}
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Error message */}
        {task.errorMessage && (
          <div className="mt-2 rounded-md bg-red-900/20 border border-red-800/30 px-3 py-2 text-xs text-red-400">
            {task.errorMessage}
          </div>
        )}
      </div>

      {/* Log stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
      >
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              {task.status === "running" ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">
                    Waiting for first iteration...
                  </span>
                  <span className="text-xs text-zinc-600">
                    Next run in{" "}
                    {task.nextExecutionAt
                      ? formatDistanceToNow(new Date(task.nextExecutionAt))
                      : `${intervalMinutes} minutes`}
                  </span>
                </>
              ) : (
                <>
                  <Zap className="h-6 w-6" />
                  <span className="text-sm">No logs yet</span>
                </>
              )}
            </div>
          </div>
        ) : (
          logs.map((log) => <LogEntry key={log.id} log={log} />)
        )}
      </div>

      {/* Footer - next execution */}
      {task.status === "running" && task.nextExecutionAt && (
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/50 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="h-3 w-3" />
            <span>
              Next iteration{" "}
              {formatDistanceToNow(new Date(task.nextExecutionAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
