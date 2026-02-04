"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  Bot,
  RefreshCcw,
  Copy,
  Brain,
  ChevronDown,
  ArrowLeft,
  Plus,
  Check,
  Sparkles,
  Search,
  MessageSquare,
  Send,
  Paperclip,
  Zap,
  Wrench,
  Download,
  ExternalLink,
  ImageIcon,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";
import React, {
  useState,
  useMemo,
  Suspense,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import Image from "next/image";

// AI Elements imports
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
} from "@/components/ai-elements/attachments";
import { Loader } from "@/components/ai-elements/loader";
import {
  ToolPanel,
  ToolGroup,
  SkillConfig,
  ToolExecution,
  ToolState,
} from "@/components/chat";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";
import {
  useSpeechSynthesis,
  getVoiceSettings,
  saveVoiceSettings,
  type Voice,
  type VoiceSettings,
} from "@/lib/hooks/useSpeechSynthesis";

interface AgentInfo {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  personality: string | null;
  rarity: string | null;
  tokenSymbol: string | null;
}

interface ApiKeyConfigInfo {
  label: string;
  helpText?: string;
  helpUrl?: string;
  placeholder?: string;
}

interface ToolGroupInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  logoUrl?: string;
  source?: string;
  functions: { id: string; name: string; description: string }[];
}

interface SkillInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  isConfigured?: boolean;
  requiresApiKey?: boolean;
  apiKeyConfig?: ApiKeyConfigInfo;
}

// Storage key for user API keys
const API_KEYS_STORAGE_KEY = "agentinc_skill_api_keys";

// Quick suggestions - defined outside component to prevent recreation
const QUICK_SUGGESTIONS = ["Tell me about yourself", "What can you do?", "Hi!"];

// Helper to get stored API keys
function getStoredApiKeys(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Helper to save API key
function saveApiKey(skillId: string, apiKey: string) {
  if (typeof window === "undefined") return;
  try {
    const keys = getStoredApiKeys();
    if (apiKey) {
      keys[skillId] = apiKey;
    } else {
      delete keys[skillId];
    }
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
  } catch (e) {
    console.error("Failed to save API key:", e);
  }
}

const rarityColors: Record<string, { ring: string; glow: string; bg: string }> =
  {
    legendary: {
      ring: "ring-[#FFD700]",
      glow: "shadow-[0_0_30px_rgba(255,215,0,0.4)]",
      bg: "from-[#FFD700]/20 to-[#FFD700]/5",
    },
    epic: {
      ring: "ring-[#A855F7]",
      glow: "shadow-[0_0_30px_rgba(168,85,247,0.4)]",
      bg: "from-[#A855F7]/20 to-[#A855F7]/5",
    },
    rare: {
      ring: "ring-[#3B82F6]",
      glow: "shadow-[0_0_30px_rgba(59,130,246,0.4)]",
      bg: "from-[#3B82F6]/20 to-[#3B82F6]/5",
    },
    uncommon: {
      ring: "ring-[#6FEC06]",
      glow: "shadow-[0_0_30px_rgba(111,236,6,0.3)]",
      bg: "from-[#6FEC06]/20 to-[#6FEC06]/5",
    },
    common: {
      ring: "ring-white/20",
      glow: "",
      bg: "from-white/10 to-white/5",
    },
  };

// Agent Card Component - Memoized to prevent re-renders when parent updates
const AgentCard = React.memo(function AgentCard({
  agent,
  index,
}: {
  agent: AgentInfo;
  index: number;
}) {
  const rarity = rarityColors[agent.rarity || "common"] || rarityColors.common;
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/dashboard/chat?agent=${agent.id}`)}
      className={`group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-[#0a0520] ring-2 ${rarity.ring} hover:ring-4 transition-all duration-300 ${rarity.glow} hover:scale-[1.02] text-left`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Agent Image */}
      {agent.imageUrl ? (
        <Image
          src={agent.imageUrl}
          alt={agent.name}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 22vw, 18vw"
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#120557] to-[#0a0520] flex items-center justify-center">
          <Bot className="w-8 h-8 sm:w-12 sm:h-12 text-[#6FEC06]/40" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

      {/* Content overlay */}
      <div className="absolute inset-0 p-2.5 sm:p-4 flex flex-col justify-end">
        {/* Token badge */}
        {agent.tokenSymbol && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-1.5 sm:px-2 py-0.5 rounded-full bg-[#6FEC06]/20 text-[#6FEC06] text-[8px] sm:text-[10px] font-bold backdrop-blur-sm border border-[#6FEC06]/30">
            ${agent.tokenSymbol}
          </div>
        )}

        {/* Rarity badge */}
        {agent.rarity && agent.rarity !== "common" && (
          <div
            className={`absolute top-2 right-2 sm:top-3 sm:right-3 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${
              agent.rarity === "legendary"
                ? "bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30"
                : agent.rarity === "epic"
                  ? "bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/30"
                  : agent.rarity === "rare"
                    ? "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30"
                    : "bg-[#6FEC06]/20 text-[#6FEC06] border border-[#6FEC06]/30"
            }`}
          >
            {agent.rarity}
          </div>
        )}

        {/* Name and personality */}
        <h3 className="font-bold text-white text-sm sm:text-lg leading-tight truncate font-display">
          {agent.name}
        </h3>
        {agent.personality && (
          <p className="text-white/50 text-[10px] sm:text-xs capitalize mt-0.5 truncate">
            {agent.personality}
          </p>
        )}

        {/* Chat indicator on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#6FEC06] text-black font-semibold text-xs sm:text-sm">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Chat
          </div>
        </div>
      </div>
    </button>
  );
});

// Agent Selector Grid
function AgentSelector() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch("/api/explore");
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || []);
        }
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAgents();
  }, []);

  // Memoize filtered agents to avoid recalculation on every render
  const filteredAgents = useMemo(
    () =>
      agents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(search.toLowerCase()) ||
          agent.personality?.toLowerCase().includes(search.toLowerCase()) ||
          agent.tokenSymbol?.toLowerCase().includes(search.toLowerCase()),
      ),
    [agents, search],
  );

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#000020]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full border border-[#6FEC06]/30 bg-[#6FEC06]/10 mb-2 sm:mb-3">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#6FEC06]" />
                <span className="text-[10px] sm:text-xs font-medium text-[#6FEC06]">
                  Select an Agent
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display">
                Chat with <span className="gradient-text">AI Agents</span>
              </h1>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents..."
                className="w-full pl-9 sm:pl-11 pr-4 py-2 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:border-[#6FEC06]/50 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 skeleton-fade-in">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl sm:rounded-2xl skeleton-glow skeleton-item"
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <Bot className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-white/20" />
            <h2 className="text-lg sm:text-xl font-bold mb-2">
              {search ? "No agents found" : "No agents available"}
            </h2>
            <p className="text-white/50 text-sm">
              {search ? "Try a different search" : "Check back later"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 content-fade-in">
            {filteredAgents.map((agent, index) => (
              <AgentCard key={agent.id} agent={agent} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Attachment Preview Component
function AttachmentsPreview() {
  const { files, remove } = usePromptInputAttachments();

  if (files.length === 0) return null;

  return (
    <PromptInputHeader className="px-4 pt-3">
      <Attachments variant="grid" className="gap-2">
        {files.map((file) => (
          <Attachment
            key={file.id}
            data={file}
            onRemove={() => remove(file.id)}
            className="size-16 rounded-xl border border-[#6FEC06]/20 bg-[#0a0520] overflow-hidden ring-1 ring-inset ring-white/5"
          >
            <AttachmentPreview className="size-full" />
            <AttachmentRemove className="bg-black/80 hover:bg-black border-0 text-white/70 hover:text-white" />
          </Attachment>
        ))}
      </Attachments>
    </PromptInputHeader>
  );
}

// Isolated Chat Input Component - prevents parent re-renders on every keystroke
interface ChatInputAreaProps {
  displayName: string;
  status: "ready" | "submitted" | "streaming" | "error";
  onSubmit: (message: PromptInputMessage) => void;
  onStop: () => void;
  speechSynthesis: ReturnType<typeof useSpeechSynthesis>;
  identityToken: string | null | undefined;
}

const ChatInputArea = React.memo(function ChatInputArea({
  displayName,
  status,
  onSubmit,
  onStop,
  speechSynthesis,
  identityToken,
}: ChatInputAreaProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Voice input hook - contained within this component so transcript updates don't affect parent
  const voiceInput = useVoiceInput({
    identityToken,
    onTranscript: (text) => {
      setInput((prev) => (prev ? `${prev} ${text}` : text));
      inputRef.current?.focus();
    },
    onError: (error) => {
      console.error("Voice input error:", error);
    },
  });

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!message.text?.trim() && !message.files?.length) return;
      onSubmit(message);
      setInput("");
    },
    [onSubmit],
  );

  return (
    <div className="shrink-0 z-20 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 pt-2 sm:pt-3 bg-[#000020]">
      <div className="max-w-3xl mx-auto">
        {/* Glowing border wrapper - hidden when busy */}
        <div
          className={`voice-glow-container ${
            status === "streaming" ||
            status === "submitted" ||
            speechSynthesis.isPlaying ||
            speechSynthesis.isLoading
              ? "voice-glow-hidden"
              : ""
          }`}
        >
          <PromptInput
            onSubmit={handleSubmit}
            accept="image/*"
            multiple
            globalDrop
            className="[&_[data-slot=input-group]]:bg-[#0a0a1f]/90 [&_[data-slot=input-group]]:backdrop-blur-xl [&_[data-slot=input-group]]:!rounded-xl [&_[data-slot=input-group]]:border [&_[data-slot=input-group]]:border-white/[0.08] [&_[data-slot=input-group]]:shadow-[0_4px_20px_rgba(0,0,0,0.3)] [&_[data-slot=input-group]]:transition-all [&_[data-slot=input-group]:focus-within]:border-[#6FEC06]/30 [&_[data-slot=input-group]:focus-within]:shadow-[0_4px_20px_rgba(111,236,6,0.1)] [&_[data-slot=input-group]:focus-within]:ring-0"
          >
            <AttachmentsPreview />
            <PromptInputBody>
              <PromptInputTextarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${displayName}...`}
                className="bg-transparent border-0 !rounded-xl focus:ring-0 focus-visible:ring-0 text-white placeholder:text-white/30 min-h-[48px] sm:min-h-[52px] max-h-[150px] sm:max-h-[180px] text-sm sm:text-[15px] leading-relaxed shadow-none"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger className="text-white/40 hover:text-white hover:bg-white/[0.08]">
                    <Paperclip className="w-4 h-4" />
                  </PromptInputActionMenuTrigger>
                  <PromptInputActionMenuContent className="bg-[#0a0520] border-white/10">
                    <PromptInputActionAddAttachments className="hover:bg-[#6FEC06]/10 hover:text-[#6FEC06]" />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>

                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={voiceInput.toggleRecording}
                  disabled={voiceInput.isTranscribing}
                  className={`relative p-2 rounded-lg transition-all duration-200 ${
                    voiceInput.isRecording
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : voiceInput.isTranscribing
                        ? "bg-white/5 text-white/30 cursor-not-allowed"
                        : "text-white/40 hover:text-white hover:bg-white/[0.08]"
                  }`}
                  title={
                    voiceInput.isRecording
                      ? "Stop recording"
                      : voiceInput.isTranscribing
                        ? "Transcribing..."
                        : "Voice input"
                  }
                >
                  {voiceInput.isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : voiceInput.isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      {/* Recording indicator pulse */}
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      {/* Audio level indicator */}
                      <span
                        className="absolute inset-0 rounded-lg bg-red-400/20 transition-transform duration-75"
                        style={{
                          transform: `scale(${1 + voiceInput.audioLevel * 0.3})`,
                          opacity: voiceInput.audioLevel,
                        }}
                      />
                    </>
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </PromptInputTools>
              <PromptInputSubmit
                status={status}
                onStop={onStop}
                disabled={!input.trim() && status === "ready"}
                className="!rounded-lg bg-[#6FEC06] text-black hover:bg-[#5ad005] disabled:opacity-30 disabled:hover:bg-[#6FEC06] shadow-[0_2px_8px_rgba(111,236,6,0.3)]"
              >
                <Send className="w-4 h-4" />
              </PromptInputSubmit>
            </PromptInputFooter>
          </PromptInput>
        </div>

        {/* Keyboard hint - hidden on mobile */}
        <p className="hidden sm:block text-center text-[11px] text-white/25 mt-2.5">
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">
            Enter
          </kbd>{" "}
          to send,{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">
            Shift + Enter
          </kbd>{" "}
          for new line
        </p>
      </div>
    </div>
  );
});

// Streaming cursor with smooth animation
function StreamingCursor() {
  return (
    <span className="streaming-cursor">
      <span className="streaming-cursor-bar" />
    </span>
  );
}

// Helper to check if a tool result contains an image
function isImageToolResult(result: unknown): result is {
  success: boolean;
  image: { url: string; mediaType: string };
  prompt: string;
  enhancedPrompt?: string;
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

// Generated Image Display - shows prominently in chat
interface GeneratedImageResult {
  success: boolean;
  image: { url: string; mediaType: string };
  prompt: string;
  enhancedPrompt?: string;
}

const GeneratedImageDisplay = React.memo(function GeneratedImageDisplay({
  result,
}: {
  result: GeneratedImageResult;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const link = document.createElement("a");
      link.href = result.image.url;
      link.download = `generated-image-${Date.now()}.png`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [result.image.url],
  );

  const handleOpenInNewTab = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      window.open(result.image.url, "_blank");
    },
    [result.image.url],
  );

  const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), []);

  return (
    <div className="my-3 rounded-xl overflow-hidden bg-gradient-to-br from-[#6FEC06]/5 to-transparent border border-[#6FEC06]/20 shadow-[0_4px_20px_rgba(111,236,6,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#6FEC06]/5 border-b border-[#6FEC06]/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#6FEC06]/10">
            <ImageIcon className="w-4 h-4 text-[#6FEC06]" />
          </div>
          <span className="text-sm font-medium text-white/80">
            Generated Image
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenInNewTab}
            className="p-2 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white transition-all duration-200"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white transition-all duration-200"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className={`relative cursor-pointer transition-all duration-300 ${isExpanded ? "" : "max-h-[400px]"}`}
        onClick={toggleExpanded}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.image.url}
          alt={result.prompt}
          className={`w-full h-auto ${isExpanded ? "" : "max-h-[400px] object-contain"}`}
        />
        {!isExpanded && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
            <span className="text-xs text-white/80 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
              Click to expand
            </span>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="px-4 py-3 border-t border-white/[0.04]">
        <p className="text-sm text-white/50 leading-relaxed">
          <span className="text-white/70 font-medium">Prompt:</span>{" "}
          {result.prompt}
        </p>
      </div>
    </div>
  );
});

// Reasoning block with smooth streaming - memoized to prevent unnecessary re-renders
const ReasoningBlock = React.memo(function ReasoningBlock({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), []);

  return (
    <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 overflow-hidden message-animate-in">
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div
          className={`p-1.5 rounded-lg bg-purple-500/20 transition-all duration-300 ${isStreaming ? "shadow-[0_0_12px_rgba(168,85,247,0.4)]" : ""}`}
        >
          <Brain
            className={`w-3.5 h-3.5 text-purple-400 transition-transform duration-300 ${isStreaming ? "scale-110" : ""}`}
          />
        </div>
        <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
          {isStreaming ? "Thinking..." : "Reasoning"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-white/40 ml-auto transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div
            className={`px-4 pb-4 text-sm text-white/60 leading-relaxed border-t border-purple-500/10 pt-3 ${isStreaming ? "streaming-message" : ""}`}
          >
            {text}
            {isStreaming && <StreamingCursor />}
          </div>
        </div>
      </div>
    </div>
  );
});

// Chat Skeleton Loading Component
function ChatSkeleton() {
  return (
    <div className="h-full flex bg-[#000020] overflow-hidden skeleton-fade-in">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header Skeleton */}
        <header className="relative z-20 h-[52px] sm:h-[60px] shrink-0 flex items-center justify-between px-3 sm:px-4 md:px-6 border-b border-white/[0.06] bg-[#000020]/80 backdrop-blur-xl">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            {/* Back button skeleton */}
            <div className="w-9 h-9 rounded-xl bg-white/5 skeleton-pulse skeleton-item shrink-0" />

            {/* Avatar skeleton */}
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl skeleton-glow skeleton-item shrink-0" />

            {/* Name and info skeleton */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-4 sm:h-5 w-24 sm:w-32 bg-white/10 rounded-lg skeleton-pulse skeleton-item" />
              <div className="h-3 sm:h-3.5 w-16 sm:w-20 bg-white/5 rounded skeleton-pulse skeleton-item" />
            </div>
          </div>
        </header>

        {/* Messages container skeleton */}
        <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 md:px-6">
            {/* Large agent avatar skeleton */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl skeleton-glow skeleton-item mb-3 sm:mb-4" />

            {/* Title skeleton */}
            <div className="h-6 sm:h-7 w-40 sm:w-48 bg-white/10 rounded-lg skeleton-pulse skeleton-item mb-3" />

            {/* Description skeleton */}
            <div className="space-y-2 mb-4 sm:mb-5 w-full max-w-sm">
              <div className="h-3 sm:h-4 w-full bg-white/5 rounded skeleton-pulse skeleton-item" />
              <div className="h-3 sm:h-4 w-3/4 mx-auto bg-white/5 rounded skeleton-pulse skeleton-item" />
            </div>

            {/* Quick suggestions skeleton */}
            <div className="flex flex-wrap justify-center gap-2">
              <div className="h-9 w-32 rounded-xl bg-white/5 skeleton-pulse skeleton-item" />
              <div className="h-9 w-28 rounded-xl bg-white/5 skeleton-pulse skeleton-item" />
              <div className="h-9 w-16 rounded-xl bg-white/5 skeleton-pulse skeleton-item" />
            </div>
          </div>
        </div>

        {/* Input Area Skeleton */}
        <div className="shrink-0 z-20 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 pt-2 sm:pt-3 bg-[#000020]">
          <div className="max-w-3xl mx-auto">
            <div className="h-[52px] sm:h-[56px] rounded-xl bg-white/5 border border-white/[0.08] skeleton-pulse skeleton-item" />
            <div className="hidden sm:block h-4 w-56 mx-auto mt-2.5 bg-white/5 rounded skeleton-pulse skeleton-item" />
          </div>
        </div>
      </div>

      {/* Tool Panel Skeleton - Hidden on mobile */}
      <div className="hidden lg:flex w-[280px] shrink-0 border-l border-white/[0.06] bg-[#000020]/60 flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="h-5 w-24 bg-white/10 rounded skeleton-pulse skeleton-item" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-white/5 skeleton-pulse skeleton-item"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Chat Interface Component
function ChatInterface({
  agentId,
  chatId: initialChatId,
}: {
  agentId: string;
  chatId?: string;
}) {
  const router = useRouter();
  const { identityToken } = useAuth();

  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toolPanelCollapsed, setToolPanelCollapsed] = useState(false);
  const [mobileToolPanelOpen, setMobileToolPanelOpen] = useState(false);
  const [toolGroups, setToolGroups] = useState<ToolGroup[]>([]);
  const [skills, setSkills] = useState<SkillConfig[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);

  // Chat history state
  const [chatId, setChatId] = useState<string | undefined>(initialChatId);
  const [chatLoading, setChatLoading] = useState(!!initialChatId);
  const [initialMessages, setInitialMessages] = useState<
    Array<{
      id: string;
      role: "user" | "assistant";
      parts: Array<{ type: string; text?: string; [key: string]: unknown }>;
    }>
  >([]);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  // Track message save state
  const lastSavedMessagesRef = useRef<number>(0);

  // Voice settings state
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() =>
    getVoiceSettings(),
  );
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null,
  );

  // Voice synthesis hook (TTS)
  const speechSynthesis = useSpeechSynthesis({
    voice: voiceSettings.voice,
    speed: voiceSettings.speed,
    identityToken,
    onEnd: () => {
      setSpeakingMessageId(null);
    },
    onError: (error) => {
      console.error("Speech synthesis error:", error);
      setSpeakingMessageId(null);
    },
  });

  // Voice settings handlers
  const handleVoiceChange = useCallback((voice: Voice) => {
    setVoiceSettings((prev) => ({ ...prev, voice }));
    saveVoiceSettings({ voice });
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setVoiceSettings((prev) => ({ ...prev, speed }));
    saveVoiceSettings({ speed });
  }, []);

  const handleAutoSpeakChange = useCallback((autoSpeak: boolean) => {
    setVoiceSettings((prev) => ({ ...prev, autoSpeak }));
    saveVoiceSettings({ autoSpeak });
  }, []);

  // Speak message handler
  const speakMessage = useCallback(
    (messageId: string, text: string) => {
      if (speakingMessageId === messageId) {
        // Toggle off
        speechSynthesis.stop();
        setSpeakingMessageId(null);
      } else {
        // Start speaking
        setSpeakingMessageId(messageId);
        speechSynthesis.speak(text);
      }
    },
    [speakingMessageId, speechSynthesis],
  );

  // Track last message ID for auto-speak
  const lastAutoSpokenRef = useRef<string | null>(null);

  // Fetch available tools and skills from separate endpoints
  useEffect(() => {
    async function fetchToolsAndSkills() {
      try {
        // Fetch tools and skills in parallel
        const [toolsResponse, skillsResponse] = await Promise.all([
          fetch("/api/tools"),
          fetch("/api/skills"),
        ]);

        const storedKeys = getStoredApiKeys();

        // Map tool groups
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          const groups: ToolGroup[] = toolsData.groups.map(
            (g: ToolGroupInfo) => ({
              id: g.id,
              name: g.name,
              description: g.description,
              icon: g.icon,
              logoUrl: g.logoUrl,
              source: g.source,
              enabled: true, // Enable tool groups by default
              functions: g.functions,
            }),
          );
          setToolGroups(groups);
        }

        // Map skills - auto-enable if API key is configured (server or user)
        if (skillsResponse.ok) {
          const skillsData = await skillsResponse.json();
          const mappedSkills: SkillConfig[] = skillsData.skills.map(
            (s: SkillInfo) => {
              const userApiKey = storedKeys[s.id];
              const hasKey = s.isConfigured || !!userApiKey;
              return {
                id: s.id,
                name: s.name,
                description: s.description,
                icon: s.icon,
                enabled: hasKey, // Auto-enable if any API key is available
                requiresApiKey: s.requiresApiKey,
                apiKeyConfig: s.apiKeyConfig,
                isConfigured: s.isConfigured,
                apiKey: userApiKey, // Load saved user API key
              };
            },
          );
          setSkills(mappedSkills);

          // Log which skills are auto-enabled
          const enabledSkills = mappedSkills.filter((s) => s.enabled);
          if (enabledSkills.length > 0) {
            console.log(
              "[Chat] Auto-enabled configured skills:",
              enabledSkills.map((s) => s.name),
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch tools:", err);
      } finally {
        setToolsLoading(false);
      }
    }
    fetchToolsAndSkills();
  }, []);

  // Tool group handlers
  const handleGroupToggle = useCallback((groupId: string, enabled: boolean) => {
    setToolGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, enabled } : g)),
    );
  }, []);

  // Skill handlers
  const handleSkillToggle = useCallback((skillId: string, enabled: boolean) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, enabled } : s)),
    );
  }, []);

  const handleApiKeyChange = useCallback((skillId: string, apiKey: string) => {
    // Save to localStorage
    saveApiKey(skillId, apiKey);

    // Update state and auto-enable the skill
    setSkills((prev) =>
      prev.map((s) =>
        s.id === skillId ? { ...s, apiKey, enabled: !!apiKey } : s,
      ),
    );
  }, []);

  // Get enabled tool group IDs for the chat API
  const enabledToolGroups = useMemo(
    () => toolGroups.filter((g) => g.enabled).map((g) => g.id),
    [toolGroups],
  );

  // Get enabled skill IDs for the chat API
  const enabledSkillIds = useMemo(
    () => skills.filter((s) => s.enabled).map((s) => s.id),
    [skills],
  );

  // Get user-provided API keys for enabled skills
  const skillApiKeys = useMemo(() => {
    const keys: Record<string, string> = {};
    skills
      .filter((s) => s.enabled && s.apiKey && !s.isConfigured)
      .forEach((s) => {
        if (s.apiKey) keys[s.id] = s.apiKey;
      });
    return keys;
  }, [skills]);

  // Store body values in a ref so transport always has current values
  const bodyRef = useRef({
    agentId,
    enabledSkills: enabledSkillIds,
    enabledToolGroups,
    skillApiKeys,
  });

  // Keep ref updated with latest values
  useEffect(() => {
    bodyRef.current = {
      agentId,
      enabledSkills: enabledSkillIds,
      enabledToolGroups,
      skillApiKeys,
    };
  }, [agentId, enabledSkillIds, enabledToolGroups, skillApiKeys]);

  // Transport with stable identity - body function reads from ref
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: "/api/chat",
      headers: identityToken ? { "privy-id-token": identityToken } : undefined,
      body: () => bodyRef.current,
    });
  }, [identityToken]);

  const { messages, sendMessage, status, regenerate, stop, setMessages } =
    useChat({ transport });

  // Load initial messages when chat is loaded from history
  const loadedInitialMessagesRef = useRef(false);
  useEffect(() => {
    if (initialMessages.length > 0 && !loadedInitialMessagesRef.current) {
      loadedInitialMessagesRef.current = true;
      setMessages(initialMessages as Parameters<typeof setMessages>[0]);
    }
  }, [initialMessages, setMessages]);

  // Reset the loaded flag when starting a new chat
  useEffect(() => {
    if (!chatId) {
      loadedInitialMessagesRef.current = false;
    }
  }, [chatId]);

  // Handle new chat creation (needs setMessages from useChat)
  const handleNewChat = useCallback(() => {
    setChatId(undefined);
    setMessages([]);
    setInitialMessages([]);
    lastSavedMessagesRef.current = 0;
    loadedInitialMessagesRef.current = false;
    router.push(`/dashboard/chat?agent=${agentId}`);
  }, [agentId, router, setMessages]);

  // Handle selecting a chat from history
  const handleSelectChat = useCallback(
    (selectedChatId: string, selectedAgentId?: string | null) => {
      const url = `/dashboard/chat?agent=${selectedAgentId || agentId}&chatId=${selectedChatId}`;
      router.push(url);
    },
    [agentId, router],
  );

  // Memoized navigation handlers
  const handleBackToChat = useCallback(() => {
    router.push("/dashboard/chat");
  }, [router]);

  const handleOpenMobileToolPanel = useCallback(() => {
    setMobileToolPanelOpen(true);
  }, []);

  const handleCloseMobileToolPanel = useCallback(() => {
    setMobileToolPanelOpen(false);
  }, []);

  // Auto-speak new assistant messages when streaming completes
  useEffect(() => {
    if (
      !voiceSettings.autoSpeak ||
      status !== "ready" ||
      messages.length === 0
    ) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage.role === "assistant" &&
      lastMessage.id !== lastAutoSpokenRef.current
    ) {
      // Find the text content of the message
      const textPart = lastMessage.parts.find((p) => p.type === "text");
      if (textPart && textPart.type === "text" && textPart.text.trim()) {
        lastAutoSpokenRef.current = lastMessage.id;
        setSpeakingMessageId(lastMessage.id);
        speechSynthesis.speak(textPart.text);
      }
    }
  }, [messages, status, voiceSettings.autoSpeak, speechSynthesis]);

  // Fetch agent info
  useEffect(() => {
    async function fetchAgentInfo() {
      try {
        const response = await fetch(`/api/agents/${agentId}`, {
          headers: identityToken
            ? { "privy-id-token": identityToken }
            : undefined,
        });
        if (response.ok) {
          const data = await response.json();
          setAgentInfo(data.agent);
        }
      } catch {
        // Continue with default
      } finally {
        setAgentLoading(false);
      }
    }
    fetchAgentInfo();
  }, [agentId, identityToken]);

  // Load existing chat messages if chatId is provided
  useEffect(() => {
    async function loadChat() {
      if (!initialChatId || !identityToken) {
        setChatLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/chats/${initialChatId}`, {
          headers: { "privy-id-token": identityToken },
        });

        if (response.ok) {
          const data = await response.json();
          // Convert saved messages to the format useChat expects
          if (data.chat?.messages?.length > 0) {
            const loadedMessages = data.chat.messages.map(
              (msg: {
                id: string;
                role: string;
                content: string;
                parts?: unknown;
              }) => ({
                id: msg.id,
                role: msg.role as "user" | "assistant",
                parts: msg.parts || [{ type: "text", text: msg.content }],
              }),
            );
            setInitialMessages(loadedMessages);
            lastSavedMessagesRef.current = loadedMessages.length;
          }
          setChatId(initialChatId);
        } else {
          // Chat not found, clear the chatId
          console.warn("Chat not found:", initialChatId);
          setChatId(undefined);
        }
      } catch (err) {
        console.error("Failed to load chat:", err);
        setChatId(undefined);
      } finally {
        setChatLoading(false);
      }
    }

    loadChat();
  }, [initialChatId, identityToken]);

  // Track chat ID in a ref for stable access in callbacks
  const chatIdRef = useRef<string | undefined>(chatId);
  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  // Save new messages to the database
  const saveMessages = useCallback(
    async (messagesToSave: typeof messages) => {
      if (!identityToken || messagesToSave.length === 0) {
        console.log("[Chat] saveMessages skipped - no token or messages");
        return;
      }

      // Only save messages we haven't saved yet
      const newMessages = messagesToSave.slice(lastSavedMessagesRef.current);
      if (newMessages.length === 0) {
        console.log("[Chat] saveMessages skipped - no new messages");
        return;
      }

      console.log(
        "[Chat] Saving",
        newMessages.length,
        "new messages, chatId:",
        chatIdRef.current,
      );

      try {
        let currentChatId = chatIdRef.current;

        // Create a new chat if we don't have one
        if (!currentChatId) {
          console.log("[Chat] Creating new chat for agent:", agentId);
          const createResponse = await fetch("/api/chats", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "privy-id-token": identityToken,
            },
            body: JSON.stringify({ agentId }),
          });

          if (createResponse.ok) {
            const data = await createResponse.json();
            currentChatId = data.chat.id;
            console.log("[Chat] Created new chat:", currentChatId);
            setChatId(currentChatId);
            chatIdRef.current = currentChatId; // Update ref immediately
            // Update URL without reload
            const newUrl = `/dashboard/chat?agent=${agentId}&chatId=${currentChatId}`;
            window.history.replaceState({}, "", newUrl);
          } else {
            const errorText = await createResponse.text();
            console.error(
              "Failed to create chat:",
              createResponse.status,
              errorText,
            );
            return;
          }
        }

        // Save the new messages
        const formattedMessages = newMessages.map((msg) => {
          const textPart = msg.parts.find((p) => p.type === "text");
          return {
            role: msg.role,
            content: textPart?.type === "text" ? textPart.text : "",
            parts: msg.parts,
          };
        });

        const saveResponse = await fetch(
          `/api/chats/${currentChatId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "privy-id-token": identityToken,
            },
            body: JSON.stringify({ messages: formattedMessages }),
          },
        );

        if (saveResponse.ok) {
          console.log("[Chat] Messages saved successfully");
          lastSavedMessagesRef.current = messagesToSave.length;
          // Trigger sidebar refresh to show updated chat
          setHistoryRefreshTrigger((prev) => prev + 1);
        } else {
          const errorText = await saveResponse.text();
          console.error(
            "Failed to save messages:",
            saveResponse.status,
            errorText,
          );
        }
      } catch (err) {
        console.error("Error saving messages:", err);
      }
    },
    [agentId, identityToken],
  ); // Removed chatId from deps - using ref instead

  // Save messages after response completes
  useEffect(() => {
    console.log(
      "[Chat] Save effect - status:",
      status,
      "messages:",
      messages.length,
      "lastSaved:",
      lastSavedMessagesRef.current,
    );
    if (
      status === "ready" &&
      messages.length > 0 &&
      messages.length > lastSavedMessagesRef.current
    ) {
      console.log("[Chat] Triggering save...");
      saveMessages(messages);
    }
  }, [status, messages, saveMessages]);

  const displayName = agentInfo?.name || "Agent";
  const rarity =
    rarityColors[agentInfo?.rarity || "common"] || rarityColors.common;

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!message.text?.trim() && !message.files?.length) return;
      sendMessage({
        text: message.text || "Sent with attachments",
        files: message.files,
      });
    },
    [sendMessage],
  );

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  // Memoize enabled tools count to avoid recalculation
  const enabledToolsCount = useMemo(
    () =>
      toolGroups.filter((g) => g.enabled).length +
      skills.filter((s) => s.enabled).length,
    [toolGroups, skills],
  );

  // Show skeleton while loading agent info or chat
  if (agentLoading || chatLoading) {
    return <ChatSkeleton />;
  }

  return (
    <div className="h-full flex bg-[#000020] overflow-hidden content-fade-in">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
        {/* Header */}
        <header className="relative z-20 h-[52px] sm:h-[60px] shrink-0 flex items-center justify-between px-3 sm:px-4 md:px-6 border-b border-white/[0.06] bg-[#000020]/80 backdrop-blur-xl">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button
              onClick={handleBackToChat}
              className="p-2 -ml-2 lg:ml-0 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all duration-200 group shrink-0"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* Agent avatar with rarity ring */}
            <div className="relative shrink-0">
              <div
                className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-gradient-to-br ${rarity.bg} flex items-center justify-center ring-2 ${rarity.ring} ${rarity.glow}`}
              >
                {agentInfo?.imageUrl ? (
                  <Image
                    src={agentInfo.imageUrl}
                    alt={displayName}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : (
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-[#6FEC06]" />
                )}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-[#10b981] border-2 border-[#000020]" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="font-semibold text-white text-sm sm:text-base truncate">
                {displayName}
              </h1>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-white/40">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#6FEC06]" />
                  <span className="hidden xs:inline">
                    {enabledToolsCount} tools
                  </span>
                  <span className="xs:hidden">{enabledToolsCount}</span>
                </span>
                {agentInfo?.tokenSymbol && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[#6FEC06] font-medium">
                      ${agentInfo.tokenSymbol}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleNewChat}
              className="p-2.5 rounded-lg hover:bg-[#6FEC06]/10 text-white/40 hover:text-[#6FEC06] transition-all duration-200"
              title="New chat"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Mobile Tool Panel Toggle */}
            <button
              onClick={handleOpenMobileToolPanel}
              className="lg:hidden relative p-2.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all duration-200"
              title="Open tools"
            >
              <Wrench className="w-5 h-5" />
              {enabledToolsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#6FEC06] text-black text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(111,236,6,0.4)]">
                  {enabledToolsCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Messages container - StickToBottom handles auto-scroll */}
        <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
          <Conversation className="flex-1">
            <ConversationContent
              className={`px-3 sm:px-4 md:px-6 gap-4 sm:gap-6 max-w-3xl mx-auto ${messages.length === 0 ? "min-h-full flex flex-col justify-center py-4" : "py-4 sm:py-8"}`}
            >
              {messages.length === 0 ? (
                <ConversationEmptyState className="px-2">
                  {/* Large agent avatar */}
                  <div
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-br ${rarity.bg} flex items-center justify-center ring-2 ${rarity.ring} ${rarity.glow} mb-3 sm:mb-4`}
                  >
                    {agentInfo?.imageUrl ? (
                      <Image
                        src={agentInfo.imageUrl}
                        alt={displayName}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <Bot className="w-8 h-8 sm:w-10 sm:h-10 text-[#6FEC06]" />
                    )}
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold font-display text-white mb-1.5 text-center">
                    Chat with{" "}
                    <span className="gradient-text">{displayName}</span>
                  </h2>

                  <p className="text-white/50 text-xs sm:text-sm max-w-sm mx-auto mb-4 sm:mb-5 leading-relaxed text-center px-2">
                    {agentInfo?.description ||
                      "Start a conversation to see what I can help you with."}
                  </p>

                  {/* Quick suggestions */}
                  <div className="flex flex-wrap justify-center gap-2 px-2">
                    {QUICK_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          sendMessage({ text: suggestion });
                        }}
                        className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white/60 hover:text-white hover:bg-white/[0.06] hover:border-[#6FEC06]/30 transition-all duration-200 hover:shadow-[0_0_20px_rgba(111,236,6,0.1)]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </ConversationEmptyState>
              ) : (
                messages.map((message, messageIndex) => {
                  const isLastMessage = messageIndex === messages.length - 1;
                  const isUser = message.role === "user";

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"} message-animate-in`}
                    >
                      <Message
                        from={message.role}
                        className={`max-w-[95%] sm:max-w-[85%] ${
                          isUser
                            ? "[&_.is-user]:bg-gradient-to-br [&_.is-user]:from-[#6FEC06]/20 [&_.is-user]:to-[#6FEC06]/5 [&_.is-user]:border [&_.is-user]:border-[#6FEC06]/20 [&_.is-user]:shadow-[0_2px_20px_rgba(111,236,6,0.1)]"
                            : ""
                        }`}
                      >
                        {message.role === "assistant" && (
                          <div className="flex items-center gap-2.5 mb-3">
                            <div
                              className={`relative w-7 h-7 rounded-lg overflow-hidden bg-gradient-to-br ${rarity.bg} flex items-center justify-center shrink-0 ring-1 ${rarity.ring}`}
                            >
                              {agentInfo?.imageUrl ? (
                                <Image
                                  src={agentInfo.imageUrl}
                                  alt={displayName}
                                  fill
                                  sizes="28px"
                                  className="object-cover"
                                />
                              ) : (
                                <Bot className="w-3.5 h-3.5 text-[#6FEC06]" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-white/60">
                              {displayName}
                            </span>
                          </div>
                        )}

                        <MessageContent className={isUser ? "text-white" : ""}>
                          {message.parts.map((part, i) => {
                            const isLastPart = i === message.parts.length - 1;
                            const isActivelyStreaming =
                              isLastMessage && status === "streaming";

                            switch (part.type) {
                              case "text":
                                return (
                                  <div
                                    key={`${message.id}-${i}`}
                                    className="relative streaming-text-container"
                                  >
                                    <div
                                      className={`${isActivelyStreaming ? "streaming-message" : ""}`}
                                    >
                                      <MessageResponse className="text-white/90 leading-relaxed">
                                        {part.text}
                                      </MessageResponse>
                                    </div>
                                    {isLastPart && isActivelyStreaming && (
                                      <StreamingCursor />
                                    )}
                                  </div>
                                );
                              case "reasoning":
                                return (
                                  <ReasoningBlock
                                    key={`${message.id}-${i}`}
                                    text={part.text}
                                    isStreaming={
                                      isLastPart && isActivelyStreaming
                                    }
                                  />
                                );
                              default:
                                if (part.type.startsWith("tool-")) {
                                  // AI SDK tool parts can have different property names depending on version
                                  // Handle both old (title/input/output) and new (toolName/args/result) formats
                                  const toolPart = part as {
                                    type: string;
                                    toolCallId: string;
                                    toolName?: string;
                                    title?: string; // Legacy property name
                                    state: string;
                                    args?: unknown;
                                    input?: unknown; // Legacy property name
                                    result?: unknown;
                                    output?: unknown; // Legacy property name
                                  };

                                  // Get values with fallbacks for different property names
                                  const toolArgs =
                                    toolPart.args || toolPart.input;
                                  const toolResult =
                                    toolPart.result || toolPart.output;
                                  const toolDisplayName =
                                    toolPart.toolName ||
                                    toolPart.title ||
                                    toolPart.type.replace("tool-", "");

                                  // Map AI SDK tool states to our ToolState
                                  // AI SDK states: "partial-call" (streaming), "call" (params complete), "result" (executed)
                                  let toolState: ToolState = "running";
                                  if (
                                    toolPart.state === "result" ||
                                    toolResult !== undefined
                                  ) {
                                    toolState = "complete";
                                  } else if (
                                    toolPart.state === "partial-call"
                                  ) {
                                    toolState = "pending";
                                  } else if (toolPart.state === "call") {
                                    toolState = "running";
                                  }

                                  // Find the tool's icon from tool groups or skills
                                  const toolGroup = toolGroups.find((g) =>
                                    g.functions.some(
                                      (f) =>
                                        f.id === toolDisplayName ||
                                        f.name === toolDisplayName,
                                    ),
                                  );
                                  const skill = skills.find(
                                    (s) =>
                                      s.id === toolDisplayName ||
                                      s.name === toolDisplayName,
                                  );
                                  const toolIcon =
                                    toolGroup?.icon || skill?.icon;

                                  // Check if this is an image generation result - render image prominently
                                  const hasImageResult =
                                    toolState === "complete" &&
                                    isImageToolResult(toolResult);

                                  return (
                                    <div key={`${message.id}-${i}`}>
                                      <ToolExecution
                                        toolName={toolDisplayName}
                                        toolIcon={toolIcon}
                                        args={
                                          (toolArgs as Record<
                                            string,
                                            unknown
                                          >) || {}
                                        }
                                        result={
                                          hasImageResult
                                            ? {
                                                success: true,
                                                prompt: toolResult.prompt,
                                              }
                                            : toolResult
                                        }
                                        state={toolState}
                                      />
                                      {/* Display generated image prominently */}
                                      {hasImageResult && (
                                        <GeneratedImageDisplay
                                          result={toolResult}
                                        />
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                            }
                          })}
                        </MessageContent>

                        {message.role === "assistant" &&
                          isLastMessage &&
                          status === "ready" && (
                            <MessageActions className="mt-4 pt-3 border-t border-white/[0.06]">
                              <MessageAction
                                onClick={() => regenerate()}
                                label="Regenerate"
                                tooltip="Regenerate response"
                                className="text-white/30 hover:text-[#6FEC06] hover:bg-[#6FEC06]/10 rounded-lg transition-all duration-200"
                              >
                                <RefreshCcw className="size-3.5" />
                              </MessageAction>
                              <MessageAction
                                onClick={() => {
                                  const textPart = message.parts.find(
                                    (p) => p.type === "text",
                                  );
                                  if (textPart && textPart.type === "text")
                                    copyToClipboard(textPart.text);
                                }}
                                label="Copy"
                                tooltip="Copy to clipboard"
                                className="text-white/30 hover:text-[#6FEC06] hover:bg-[#6FEC06]/10 rounded-lg transition-all duration-200"
                              >
                                {copied ? (
                                  <Check className="size-3.5 text-[#6FEC06]" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </MessageAction>
                              {/* TTS Speak Button */}
                              <MessageAction
                                onClick={() => {
                                  const textPart = message.parts.find(
                                    (p) => p.type === "text",
                                  );
                                  if (textPart && textPart.type === "text") {
                                    speakMessage(message.id, textPart.text);
                                  }
                                }}
                                label={
                                  speakingMessageId === message.id
                                    ? speechSynthesis.isLoading
                                      ? "Loading..."
                                      : "Stop"
                                    : "Speak"
                                }
                                tooltip={
                                  speakingMessageId === message.id
                                    ? "Stop speaking"
                                    : "Read aloud"
                                }
                                className={`rounded-lg transition-all duration-200 ${
                                  speakingMessageId === message.id
                                    ? "text-[#6FEC06] bg-[#6FEC06]/10"
                                    : "text-white/30 hover:text-[#6FEC06] hover:bg-[#6FEC06]/10"
                                }`}
                              >
                                {speechSynthesis.isLoading &&
                                speakingMessageId === message.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : speakingMessageId === message.id ? (
                                  <VolumeX className="size-3.5" />
                                ) : (
                                  <Volume2 className="size-3.5" />
                                )}
                              </MessageAction>
                            </MessageActions>
                          )}
                      </Message>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {status === "submitted" && (
                <div className="flex justify-start message-animate-in">
                  <div className="flex items-start gap-3">
                    <div
                      className={`relative w-7 h-7 rounded-lg overflow-hidden bg-gradient-to-br ${rarity.bg} flex items-center justify-center shrink-0 ring-1 ${rarity.ring}`}
                    >
                      {agentInfo?.imageUrl ? (
                        <Image
                          src={agentInfo.imageUrl}
                          alt={displayName}
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-[#6FEC06]" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-sm font-medium text-white/60">
                        {displayName}
                      </span>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="typing-indicator">
                          <span className="typing-indicator-dot" />
                          <span className="typing-indicator-dot" />
                          <span className="typing-indicator-dot" />
                        </div>
                        <span className="text-sm text-white/50">
                          Thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton className="bg-[#0a0520]/90 backdrop-blur-sm border-white/10 text-[#6FEC06] hover:bg-[#6FEC06]/10 hover:border-[#6FEC06]/30 shadow-xl" />
          </Conversation>
        </div>

        {/* Input Area - Fixed at bottom (isolated component to prevent re-renders) */}
        <ChatInputArea
          displayName={displayName}
          status={status}
          onSubmit={handleSubmit}
          onStop={stop}
          speechSynthesis={speechSynthesis}
          identityToken={identityToken}
        />
      </div>

      {/* Tool Panel - Right Side (Desktop) & Mobile Overlay */}
      <ToolPanel
        toolGroups={toolGroups}
        skills={skills}
        onGroupToggle={handleGroupToggle}
        onSkillToggle={handleSkillToggle}
        onApiKeyChange={handleApiKeyChange}
        collapsed={toolPanelCollapsed}
        onCollapsedChange={setToolPanelCollapsed}
        loading={toolsLoading}
        mobileOpen={mobileToolPanelOpen}
        onMobileClose={handleCloseMobileToolPanel}
        voiceSettings={voiceSettings}
        onVoiceChange={handleVoiceChange}
        onSpeedChange={handleSpeedChange}
        onAutoSpeakChange={handleAutoSpeakChange}
        // Chat history props
        currentChatId={chatId}
        currentAgentId={agentId}
        identityToken={identityToken}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        historyRefreshTrigger={historyRefreshTrigger}
      />
    </div>
  );
}

// Main Page Component
function ChatPageContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agent");
  const chatId = searchParams.get("chatId");

  if (agentId) {
    return <ChatInterface agentId={agentId} chatId={chatId || undefined} />;
  }

  return <AgentSelector />;
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center bg-[#000020]">
          <Loader size={32} className="text-[#6FEC06]" />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
