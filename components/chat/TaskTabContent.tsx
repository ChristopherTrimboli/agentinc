"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap,
  Pause,
  Play,
  Square,
  Clock,
  AlertCircle,
  CheckCircle,
  StopCircle,
  Loader2,
  ChevronDown,
  Wrench,
  Terminal,
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
  taskPrompt: string;
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
      className: "bg-coral/10 text-coral border-coral/20",
      icon: (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
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
      className: "bg-white/5 text-white/40 border-white/10",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    failed: {
      label: "Failed",
      className: "bg-red-500/10 text-red-400 border-red-500/20",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    stopped: {
      label: "Stopped",
      className: "bg-white/5 text-white/40 border-white/10",
      icon: <StopCircle className="h-3 w-3" />,
    },
  };

  const { label, className, icon } = config[status] ?? config.stopped;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium tracking-tight ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

// ── Log Entry ────────────────────────────────────────────────────────────────

function LogEntry({ log, index }: { log: TaskLog; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasToolCalls = log.parts?.toolCalls && log.parts.toolCalls.length > 0;
  const isError = log.status === "error";
  const totalTokens = log.parts?.tokenUsage
    ? log.parts.tokenUsage.inputTokens + log.parts.tokenUsage.outputTokens
    : null;

  return (
    <div
      className="task-log-entry opacity-0"
      style={{ animationDelay: `${Math.min(index * 0.05, 0.25)}s` }}
    >
      {/* Iteration header */}
      <div className="terminal-divider mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-mono font-bold ${
              isError ? "bg-red-500/15 text-red-400" : "bg-coral/10 text-coral"
            }`}
          >
            {log.iteration}
          </span>
          <span className="font-mono text-xs font-medium text-zinc-300">
            Iteration {log.iteration}
          </span>
          <span className="text-zinc-700">·</span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-500">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
          </span>
          {isError && (
            <span className="rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-red-400">
              ERR
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className={`rounded-lg border px-4 py-3 ${
          isError
            ? "border-red-800/20 bg-red-950/10"
            : "border-zinc-800/60 bg-zinc-900/30"
        }`}
      >
        <div className="font-mono text-[13px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {log.content}
        </div>

        {/* Footer row: tool calls + token count */}
        <div className="mt-3 flex items-center justify-between border-t border-zinc-800/40 pt-2.5">
          {/* Tool calls toggle */}
          {hasToolCalls ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
            >
              <Wrench className="h-3 w-3" />
              <span>
                {log.parts!.toolCalls!.length} tool call
                {log.parts!.toolCalls!.length !== 1 ? "s" : ""}
              </span>
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <div />
          )}

          {/* Token count */}
          {totalTokens != null && (
            <span className="font-mono text-[11px] tabular-nums text-zinc-600">
              {totalTokens.toLocaleString()} tokens
            </span>
          )}
        </div>

        {/* Tool calls (expanded) */}
        {expanded && hasToolCalls && (
          <div className="mt-2 space-y-1.5">
            {log.parts!.toolCalls!.map((tc, i) => (
              <div key={i} className="tool-call-panel rounded-md px-3 py-2.5">
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-coral/60">$</span>
                  <span className="font-semibold text-coral/80">{tc.name}</span>
                </div>
                {tc.args != null && (
                  <pre className="mt-1.5 overflow-x-auto font-mono text-[11px] leading-relaxed text-zinc-500">
                    {JSON.stringify(tc.args, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
    const pollInterval = 5000;

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

          const newLogs = (updatedTask.logs || []).sort(
            (a: TaskLog, b: TaskLog) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          setLogs((prev) => {
            if (newLogs.length !== prev.length) {
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

          if (["completed", "stopped", "failed"].includes(updatedTask.status)) {
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
            return;
          }
        }
      } catch {
        // Continue polling on error
      }

      if (active) {
        setTimeout(poll, pollInterval);
      }
    };

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

      setTimeout(() => {
        fetchTask();
      }, 1000);
    } catch (error) {
      console.error("[TaskTab] Control error:", error);
      await fetchTask();
    } finally {
      setControlling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-coral/60" />
          <span className="font-mono text-xs text-zinc-500">
            Loading task...
          </span>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-5 w-5 text-zinc-600" />
          <span className="font-mono text-xs text-zinc-500">
            Task not found
          </span>
        </div>
      </div>
    );
  }

  const intervalMinutes = task.intervalMs / 60000;
  const isActive = task.status === "running" || task.status === "paused";

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/50 px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Agent avatar */}
            {task.agent.imageUrl ? (
              <div className="relative">
                <Image
                  src={task.agent.imageUrl}
                  alt={task.agent.name}
                  width={36}
                  height={36}
                  className="rounded-full ring-1 ring-coral/20"
                />
                {task.status === "running" && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-coral" />
                )}
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 ring-1 ring-coral/20">
                <Terminal className="h-4 w-4 text-coral/60" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-display text-sm font-medium text-white">
                  {task.name}
                </h3>
                <StatusBadge status={task.status} />
              </div>
              <div className="mt-1 flex items-center gap-3 font-mono text-[11px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  every{" "}
                  {intervalMinutes >= 60
                    ? `${Math.round(intervalMinutes / 60)}h`
                    : `${intervalMinutes}m`}
                </span>
                <span className="text-zinc-700">|</span>
                <span className="flex items-center gap-1">
                  <span className="text-coral/50">#</span>
                  {task.currentIteration}
                  {task.maxIterations ? ` / ${task.maxIterations}` : ""}{" "}
                  iteration
                  {task.currentIteration !== 1 ? "s" : ""}
                </span>
                <span className="text-zinc-700">|</span>
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
                  className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 font-mono text-[11px] text-zinc-300 transition-all hover:bg-zinc-700 disabled:opacity-40"
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
                  className="flex items-center gap-1.5 rounded-md border border-coral/25 bg-coral/10 px-3 py-1.5 font-mono text-[11px] text-coral transition-all hover:bg-coral/20 disabled:opacity-40"
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
                className="flex items-center gap-1.5 rounded-md border border-red-700/50 bg-red-900/20 px-3 py-1.5 font-mono text-[11px] text-red-400 transition-all hover:bg-red-900/40 disabled:opacity-40"
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
          <div className="mt-2.5 rounded-md border border-red-800/30 bg-red-900/20 px-3 py-2 font-mono text-[11px] text-red-400">
            <span className="mr-1.5 text-red-500/50">ERR</span>
            {task.errorMessage}
          </div>
        )}

        {/* Task prompt */}
        {task.taskPrompt && (
          <div className="mt-2.5 rounded-md border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
            <div className="flex items-start gap-2">
              <span className="shrink-0 font-mono text-[11px] font-bold text-coral/50 select-none">
                &gt;
              </span>
              <p className="font-mono text-[12px] leading-relaxed text-zinc-400">
                {task.taskPrompt}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Log Stream ── */}
      <div
        ref={scrollRef}
        className="task-terminal-bg relative flex-1 overflow-y-auto px-4 py-4 space-y-5"
      >
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              {task.status === "running" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="terminal-cursor" />
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-xs text-zinc-500">
                      Waiting for first iteration...
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-zinc-600">
                      Next run{" "}
                      {task.nextExecutionAt
                        ? formatDistanceToNow(new Date(task.nextExecutionAt), {
                            addSuffix: true,
                          })
                        : `in ${intervalMinutes} minutes`}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 text-zinc-700" />
                  <span className="font-mono text-xs text-zinc-500">
                    No logs yet
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          logs.map((log, index) => (
            <LogEntry key={log.id} log={log} index={index} />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      {task.status === "running" && task.nextExecutionAt && (
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/50 px-4 py-2.5">
          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
            <span className="text-coral/40">›</span>
            <span>
              Next iteration{" "}
              {formatDistanceToNow(new Date(task.nextExecutionAt), {
                addSuffix: true,
              })}
            </span>
            <span className="terminal-cursor !h-3 !w-1.5" />
          </div>
        </div>
      )}
    </div>
  );
}
