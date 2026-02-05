"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  AlertCircle,
  Loader2,
  Code,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  Download,
  ImageIcon,
  ExternalLink,
} from "lucide-react";

export type ToolState = "pending" | "running" | "complete" | "error";

export interface ToolExecutionProps {
  toolName: string;
  toolIcon?: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  state: ToolState;
  startTime?: number;
  endTime?: number;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/**
 * Check if the result contains an image
 */
function isImageResult(result: unknown): result is {
  success: boolean;
  image: { url: string; mediaType: string };
  prompt: string;
} {
  if (typeof result !== "object" || result === null) return false;
  const r = result as Record<string, unknown>;
  return (
    r.success === true &&
    typeof r.image === "object" &&
    r.image !== null &&
    typeof (r.image as Record<string, unknown>).url === "string"
  );
}

/**
 * Component to display a generated image
 */
function ImageView({
  result,
}: {
  result: {
    success: boolean;
    image: { url: string; mediaType: string };
    prompt: string;
    enhancedPrompt?: string;
  };
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = result.image.url;
    link.download = `generated-image-${Date.now()}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(result.image.url, "_blank");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5 text-[#6FEC06]" />
          <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">
            Generated Image
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 rounded-lg hover:bg-[#6FEC06]/15 text-white/70 hover:text-white hover:border-[#6FEC06]/25 transition-all duration-200 border border-transparent active:scale-95 hover:shadow-[0_0_8px_rgba(111,236,6,0.12)]"
            title="Open in new tab"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-[#6FEC06]/15 text-white/70 hover:text-white hover:border-[#6FEC06]/25 transition-all duration-200 border border-transparent active:scale-95 hover:shadow-[0_0_8px_rgba(111,236,6,0.12)]"
            title="Download image"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Image display */}
      <div
        className={`relative rounded-xl overflow-hidden bg-black/30 border border-white/[0.06] cursor-pointer transition-all duration-300 ${
          isExpanded ? "max-w-full" : "max-w-sm"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.image.url}
          alt={result.prompt}
          className="w-full h-auto"
        />
        {!isExpanded && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
            <span className="text-xs text-white/70">Click to expand</span>
          </div>
        )}
      </div>

      {/* Prompt info */}
      <div className="text-xs text-white/60 px-1">
        <span className="text-white/75">Prompt:</span> {result.prompt}
      </div>
    </div>
  );
}

function JsonView({ data, label }: { data: unknown; label: string }) {
  const [copied, setCopied] = useState(false);

  const jsonString =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Truncate very long outputs
  const displayString =
    jsonString.length > 2000
      ? jsonString.slice(0, 2000) + "\n... (truncated)"
      : jsonString;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-[#6FEC06]/15 text-white/70 hover:text-white hover:border-[#6FEC06]/25 transition-all duration-200 border border-transparent active:scale-95 hover:shadow-[0_0_8px_rgba(111,236,6,0.12)]"
        >
          {copied ? (
            <Check className="w-3 h-3 text-[#6FEC06] drop-shadow-[0_0_4px_rgba(111,236,6,0.5)]" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>
      <pre className="text-xs bg-black/30 rounded-lg p-3 overflow-x-auto font-mono text-white/75 leading-relaxed border border-white/[0.04]">
        {displayString}
      </pre>
    </div>
  );
}

const stateConfig = {
  pending: {
    icon: Clock,
    color: "text-white/60",
    bgColor: "bg-white/5",
    borderColor: "border-white/10",
    label: "Pending",
    animate: false,
  },
  running: {
    icon: Loader2,
    color: "text-[#6FEC06]",
    bgColor: "bg-[#6FEC06]/10",
    borderColor: "border-[#6FEC06]/20",
    label: "Running",
    animate: true,
  },
  complete: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    label: "Complete",
    animate: false,
  },
  error: {
    icon: AlertCircle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    label: "Error",
    animate: false,
  },
};

export function ToolExecution({
  toolName,
  toolIcon,
  args,
  result,
  error,
  state,
  startTime,
  endTime,
}: ToolExecutionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = stateConfig[state];
  const StateIcon = config.icon;

  const duration =
    startTime && endTime
      ? formatDuration(endTime - startTime)
      : startTime
        ? // eslint-disable-next-line react-hooks/purity -- Intentional: show elapsed time for running tool
          formatDuration(Date.now() - startTime)
        : null;

  return (
    <div
      className={`rounded-xl border ${config.borderColor} bg-white/[0.02] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:bg-white/[0.03]`}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 text-left transition-colors"
      >
        {/* Tool icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bgColor} transition-all duration-300`}
        >
          {state === "running" ? (
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#6FEC06]/20 animate-ping" />
              <Loader2
                className={`w-4 h-4 ${config.color} animate-spin relative z-10`}
              />
            </div>
          ) : (
            <span className="text-lg">{toolIcon || "🔧"}</span>
          )}
        </div>

        {/* Tool info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-white">{toolName}</span>
            {Object.keys(args).length > 0 && (
              <span className="text-[11px] text-white/50 px-1.5 py-0.5 rounded bg-white/[0.06]">
                {Object.keys(args).length} arg
                {Object.keys(args).length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {!isExpanded && Object.keys(args).length > 0 && (
            <p className="text-xs text-white/55 truncate mt-0.5 max-w-[250px]">
              {Object.entries(args)
                .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                .join(", ")}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {duration && (
            <span className="text-[11px] text-white/50 tabular-nums">
              {duration}
            </span>
          )}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${config.bgColor} border ${config.borderColor}`}
          >
            <StateIcon
              className={`w-3.5 h-3.5 ${config.color} ${config.animate ? "animate-spin" : ""}`}
            />
            <span className={`text-[11px] font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-white/70 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Expanded content */}
      <div
        className={`grid transition-all duration-200 ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-2 border-t border-white/[0.04] space-y-4">
            {/* Input args */}
            {Object.keys(args).length > 0 && (
              <JsonView data={args} label="Input" />
            )}

            {/* Arrow indicator for complete state */}
            {(state === "complete" || state === "error") && (
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                <div className={`p-1 rounded-full ${config.bgColor}`}>
                  <ArrowRight className={`w-3 h-3 ${config.color}`} />
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-white/[0.06] to-transparent" />
              </div>
            )}

            {/* Result - check if it's an image result */}
            {result !== undefined &&
              (isImageResult(result) ? (
                <ImageView result={result} />
              ) : (
                <JsonView data={result} label="Output" />
              ))}

            {/* Error */}
            {error && (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
                  Error
                </span>
                <div className="text-xs bg-red-500/10 text-red-300 rounded-lg p-3 border border-red-500/20">
                  {error}
                </div>
              </div>
            )}

            {/* Running indicator */}
            {state === "running" && (
              <div className="flex items-center gap-3 text-[#6FEC06] text-sm">
                <div className="flex gap-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-[#6FEC06] animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-[#6FEC06] animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-[#6FEC06] animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
                <span className="text-white/65 text-xs">Executing...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline tool indicator for tool calls in messages
 */
export function ToolBadge({
  toolName,
  state,
  onClick,
}: {
  toolName: string;
  state: ToolState;
  onClick?: () => void;
}) {
  const config = stateConfig[state];
  const StateIcon = config.icon;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${config.bgColor} ${config.color} border ${config.borderColor} hover:opacity-90 transition-all duration-200`}
    >
      <StateIcon
        className={`w-3 h-3 ${config.animate ? "animate-spin" : ""}`}
      />
      {toolName}
    </button>
  );
}

/**
 * Multi-tool execution view (shows when multiple tools run in parallel)
 */
export function ToolExecutionGroup({ tools }: { tools: ToolExecutionProps[] }) {
  const runningCount = tools.filter((t) => t.state === "running").length;
  const completeCount = tools.filter((t) => t.state === "complete").length;
  const errorCount = tools.filter((t) => t.state === "error").length;

  return (
    <div className="space-y-3">
      {/* Summary header */}
      {tools.length > 1 && (
        <div className="flex items-center gap-3 px-1 text-xs">
          <div className="p-1 rounded-md bg-white/[0.06]">
            <Sparkles className="w-3.5 h-3.5 text-[#6FEC06]" />
          </div>
          <span className="text-white/65">
            {tools.length} tools
            {runningCount > 0 && (
              <span className="text-[#6FEC06]"> • {runningCount} running</span>
            )}
            {completeCount > 0 && (
              <span className="text-emerald-400">
                {" "}
                • {completeCount} complete
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-red-400"> • {errorCount} failed</span>
            )}
          </span>
        </div>
      )}

      {/* Tool cards */}
      <div className="space-y-2">
        {tools.map((tool, i) => (
          <ToolExecution key={`${tool.toolName}-${i}`} {...tool} />
        ))}
      </div>
    </div>
  );
}
