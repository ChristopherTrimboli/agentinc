"use client";

import { useState, useEffect } from "react";
import {
  X,
  Zap,
  Clock,
  Hash,
  Pause,
  Play,
  Square,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  StopCircle,
  RefreshCw,
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

// ── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onReopen,
  onControl,
  onDelete,
  controlling,
  identityToken,
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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-900/80 transition-colors">
      <div className="flex items-start gap-3">
        {/* Agent Avatar */}
        {task.agent.imageUrl ? (
          <Image
            src={task.agent.imageUrl}
            alt={task.agent.name}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800">
            <Zap className="h-5 w-5 text-zinc-400" />
          </div>
        )}

        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-zinc-100 truncate">
              {task.name}
            </h3>
            <StatusBadge status={task.status} />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mb-2">
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
            <span>
              Created{" "}
              {formatDistanceToNow(new Date(task.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          {/* Tool Groups */}
          {task.enabledToolGroups.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.enabledToolGroups.map((group) => (
                <span
                  key={group}
                  className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                >
                  {group}
                </span>
              ))}
            </div>
          )}

          {/* Next Execution */}
          {task.status === "running" && task.nextExecutionAt && (
            <div className="text-xs text-zinc-600">
              Next:{" "}
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
                  className="rounded-md border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
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
                  className="rounded-md border border-emerald-700 bg-emerald-800/20 p-2 text-emerald-400 transition-colors hover:bg-emerald-800/40 disabled:opacity-50"
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
                className="rounded-md border border-red-700/50 bg-red-900/20 p-2 text-red-400 transition-colors hover:bg-red-900/40 disabled:opacity-50"
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
            className="rounded-md border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-300 transition-colors hover:bg-zinc-700"
            title="Open in tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>

          {/* Delete Button (only for stopped/completed/failed) */}
          {!isActive && (
            <button
              onClick={() => onDelete(task.id)}
              className="rounded-md border border-red-700/50 bg-red-900/20 p-2 text-red-400 transition-colors hover:bg-red-900/40"
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
      // Refresh after a delay
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
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              Task Dashboard
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {tasks.length} total task{tasks.length !== 1 ? "s" : ""}
              {activeTasks.length > 0 && (
                <span className="ml-2 text-emerald-400">
                  · {activeTasks.length} active
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTasks}
              className="rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="rounded-md border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-zinc-800">
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
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === tab.id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Loading tasks...</span>
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <Zap className="h-8 w-8" />
                <span className="text-sm">
                  {filter === "all"
                    ? "No tasks yet"
                    : filter === "active"
                      ? "No active tasks"
                      : "No inactive tasks"}
                </span>
                <span className="text-xs text-zinc-600">
                  Create a task by chatting with your agent
                </span>
              </div>
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
