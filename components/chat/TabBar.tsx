"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Zap,
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  CheckCircle,
  AlertCircle,
  StopCircle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus =
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "stopped";

export interface Tab {
  id: string;
  type: "chat" | "task";
  title: string;
  // Chat-specific
  chatId?: string;
  agentId?: string;
  // Task-specific
  taskId?: string;
  status?: TaskStatus;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewChat: () => void;
  rightActions?: React.ReactNode;
}

// ── Status Indicator ─────────────────────────────────────────────────────────

function StatusDot({ status }: { status?: TaskStatus }) {
  if (!status) return null;

  const config: Record<TaskStatus, { color: string; icon: React.ReactNode }> = {
    running: {
      color: "bg-coral",
      icon: (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
        </span>
      ),
    },
    paused: {
      color: "bg-yellow-500",
      icon: <Pause className="h-3 w-3 text-yellow-500" />,
    },
    completed: {
      color: "bg-white/30",
      icon: <CheckCircle className="h-3 w-3 text-white/30" />,
    },
    failed: {
      color: "bg-red-500",
      icon: <AlertCircle className="h-3 w-3 text-red-500" />,
    },
    stopped: {
      color: "bg-white/25",
      icon: <StopCircle className="h-3 w-3 text-white/25" />,
    },
  };

  return config[status]?.icon ?? null;
}

// ── TabBar Component ─────────────────────────────────────────────────────────

export function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewChat,
  rightActions,
}: TabBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 0);
    setShowRightArrow(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkOverflow();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkOverflow);
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", checkOverflow);
      observer.disconnect();
    };
  }, [checkOverflow, tabs.length]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  return (
    <div className="flex items-center border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll("left")}
          className="flex h-9 shrink-0 items-center px-1 text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Tab list */}
      <div
        ref={scrollRef}
        className="flex flex-1 overflow-x-auto scrollbar-none"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              className={`group relative flex h-9 shrink-0 items-center gap-1.5 border-r border-zinc-800 px-3 font-mono text-[11px] transition-colors ${
                isActive
                  ? "bg-zinc-900 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300"
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute inset-x-0 top-0 h-px bg-coral" />
              )}

              {/* Tab icon */}
              {tab.type === "chat" ? (
                <MessageSquare className="h-3 w-3 shrink-0" />
              ) : (
                <Zap className="h-3 w-3 shrink-0" />
              )}

              {/* Task status dot */}
              {tab.type === "task" && <StatusDot status={tab.status} />}

              {/* Tab title */}
              <span className="max-w-[120px] truncate">{tab.title}</span>

              {/* Close button */}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className={`ml-1 flex shrink-0 items-center rounded p-0.5 transition-colors ${
                  isActive
                    ? "text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
                    : "text-transparent group-hover:text-zinc-500 group-hover:hover:bg-zinc-700 group-hover:hover:text-zinc-200"
                }`}
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Right scroll arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll("right")}
          className="flex h-9 shrink-0 items-center px-1 text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Right actions (if provided) */}
      {rightActions && (
        <div className="flex shrink-0 items-center border-l border-zinc-800">
          {rightActions}
        </div>
      )}
    </div>
  );
}
