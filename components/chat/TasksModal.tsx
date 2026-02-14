"use client";

import { useState, useEffect } from "react";
import {
  X,
  Zap,
  Clock,
  Pause,
  Play,
  Plus,
  Square,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  StopCircle,
  RefreshCw,
  Terminal,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import type { TaskStatus } from "./TabBar";

interface Task {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  currentIteration: number;
  intervalMs: number;
  maxIterations?: number;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
  enabledToolGroups: string[];
  createdAt: string;
  updatedAt: string;
  agent: {
    id: string;
    name: string;
    imageUrl?: string | null;
  };
}

interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskReopen: (taskId: string, taskName: string) => void;
  onNewTask?: () => void;
  identityToken?: string | null;
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-tight ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

// ── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onReopen,
  onControl,
  onDelete,
  controlling,
}: {
  task: Task;
  onReopen: (taskId: string, taskName: string) => void;
  onControl: (taskId: string, action: "stop" | "pause" | "resume") => void;
  onDelete: (taskId: string) => void;
  controlling: string | null;
  identityToken?: string | null;
}) {
  const intervalMinutes = task.intervalMs / 60000;
  const isActive = task.status === "running" || task.status === "paused";
  const isControlling = controlling === task.id;

  return (
    <div className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:bg-zinc-900/80">
      <div className="flex items-start gap-3">
        {/* Agent Avatar */}
        {task.agent.imageUrl ? (
          <div className="relative shrink-0">
            <Image
              src={task.agent.imageUrl}
              alt={task.agent.name}
              width={40}
              height={40}
              className="rounded-full"
            />
            {task.status === "running" && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-coral" />
            )}
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800">
            <Terminal className="h-5 w-5 text-zinc-400" />
          </div>
        )}

        {/* Task Info */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2.5">
            <h3 className="truncate font-display text-sm font-medium text-white">
              {task.name}
            </h3>
            <StatusBadge status={task.status} />
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-3 font-mono text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              every{" "}
              {intervalMinutes >= 60
                ? `${Math.round(intervalMinutes / 60)}h`
                : `${intervalMinutes}m`}
            </span>
            <span className="text-zinc-700">|</span>
            <span className="flex items-center gap-1">
              <span className="text-coral/40">#</span>
              {task.currentIteration}
              {task.maxIterations ? ` / ${task.maxIterations}` : ""} iteration
              {task.currentIteration !== 1 ? "s" : ""}
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-600">{task.agent.name}</span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-600">
              Created{" "}
              {formatDistanceToNow(new Date(task.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          {/* Tool Groups */}
          {task.enabledToolGroups.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {task.enabledToolGroups.map((group) => (
                <span
                  key={group}
                  className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400"
                >
                  {group}
                </span>
              ))}
            </div>
          )}

          {/* Next Execution */}
          {task.status === "running" && task.nextExecutionAt && (
            <div className="font-mono text-[11px] text-zinc-600">
              <span className="text-coral/40">›</span> Next{" "}
              {formatDistanceToNow(new Date(task.nextExecutionAt), {
                addSuffix: true,
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Control Buttons */}
          {isActive && (
            <>
              {task.status === "running" ? (
                <button
                  onClick={() => onControl(task.id, "pause")}
                  disabled={isControlling}
                  className="rounded-md border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-300 transition-all hover:bg-zinc-700 disabled:opacity-50"
                  title="Pause"
                >
                  {isControlling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <button
                  onClick={() => onControl(task.id, "resume")}
                  disabled={isControlling}
                  className="rounded-md border border-coral/25 bg-coral/10 p-2 text-coral transition-all hover:bg-coral/20 disabled:opacity-50"
                  title="Resume"
                >
                  {isControlling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
              )}
              <button
                onClick={() => onControl(task.id, "stop")}
                disabled={isControlling}
                className="rounded-md border border-red-700/50 bg-red-900/20 p-2 text-red-400 transition-all hover:bg-red-900/40 disabled:opacity-50"
                title="Stop"
              >
                {isControlling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
            </>
          )}

          {/* Open Button */}
          <button
            onClick={() => onReopen(task.id, task.name)}
            className="rounded-md border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-300 transition-all hover:bg-zinc-700"
            title="Open in tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>

          {/* Delete Button (only for stopped/completed/failed) */}
          {!isActive && (
            <button
              onClick={() => onDelete(task.id)}
              className="rounded-md border border-red-700/50 bg-red-900/20 p-2 text-red-400 transition-all hover:bg-red-900/40"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function TasksModal({
  isOpen,
  onClose,
  onTaskReopen,
  onNewTask,
  identityToken,
}: TasksModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [controlling, setControlling] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const headers: Record<string, string> = identityToken
    ? { "privy-id-token": identityToken }
    : {};

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks", { headers });
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("[TasksModal] Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchTasks();
    }
  }, [isOpen]);

  const handleControl = async (
    taskId: string,
    action: "stop" | "pause" | "resume",
  ) => {
    setControlling(taskId);
    try {
      await fetch(`/api/tasks/${taskId}/control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({ action }),
      });
      setTimeout(fetchTasks, 1000);
    } catch (error) {
      console.error("[TasksModal] Control error:", error);
    } finally {
      setControlling(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers,
      });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("[TasksModal] Delete error:", error);
    }
  };

  if (!isOpen) return null;

  const filteredTasks = tasks.filter((task) => {
    if (filter === "active")
      return task.status === "running" || task.status === "paused";
    if (filter === "inactive")
      return ["completed", "stopped", "failed"].includes(task.status);
    return true;
  });

  const activeTasks = tasks.filter(
    (t) => t.status === "running" || t.status === "paused",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              Task Dashboard
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
              {tasks.length} total task{tasks.length !== 1 ? "s" : ""}
              {activeTasks.length > 0 && (
                <span className="ml-2 text-coral">
                  · {activeTasks.length} active
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNewTask && (
              <button
                onClick={onNewTask}
                className="flex items-center gap-1.5 rounded-md border border-coral/25 bg-coral/10 px-3 py-1.5 font-mono text-[11px] text-coral transition-all hover:bg-coral/20"
              >
                <Plus className="h-3.5 w-3.5" />
                New Task
              </button>
            )}
            <button
              onClick={fetchTasks}
              className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 font-mono text-[11px] text-zinc-300 transition-all hover:bg-zinc-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="rounded-md border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-300 transition-all hover:bg-zinc-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 border-b border-zinc-800 px-6 py-2.5">
          {(
            [
              { id: "all", label: "All Tasks" },
              { id: "active", label: "Active" },
              { id: "inactive", label: "Inactive" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 font-mono text-[11px] transition-all ${
                filter === tab.id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="task-terminal-bg relative flex-1 space-y-2.5 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                <span className="font-mono text-xs text-zinc-500">
                  Loading tasks...
                </span>
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              {filter !== "all" ? (
                <div className="flex flex-col items-center gap-3">
                  <Zap className="h-5 w-5 text-zinc-700" />
                  <p className="font-mono text-xs text-zinc-500">
                    {filter === "active"
                      ? "No active tasks"
                      : "No inactive tasks"}
                  </p>
                </div>
              ) : (
                <div className="flex max-w-sm flex-col items-center gap-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                    <Zap className="h-5 w-5 text-zinc-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-sm text-zinc-300">
                      No tasks yet
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-zinc-500">
                      Ask your agent to automate something. It will create a
                      recurring task that runs on a schedule.
                    </p>
                  </div>
                  <div className="w-full space-y-1.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                      Try asking
                    </p>
                    {[
                      "Post a tweet every 2 hours",
                      "Check my portfolio and summarize it daily",
                      "Search for trending topics every 30 minutes",
                    ].map((example) => (
                      <div
                        key={example}
                        className="rounded-md border border-zinc-800/60 bg-zinc-900/30 px-3 py-2 font-mono text-[11px] text-zinc-400"
                      >
                        <span className="mr-1.5 text-coral/50">&gt;</span>
                        {example}
                      </div>
                    ))}
                  </div>
                  {onNewTask && (
                    <button
                      onClick={onNewTask}
                      className="flex items-center gap-1.5 rounded-md border border-coral/25 bg-coral/10 px-4 py-2 font-mono text-[11px] text-coral transition-all hover:bg-coral/20"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Chat with your agent
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onReopen={onTaskReopen}
                onControl={handleControl}
                onDelete={handleDelete}
                controlling={controlling}
                identityToken={identityToken}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
