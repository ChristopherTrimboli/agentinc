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
  Star,
  Rocket,
  User,
  XIcon,
  FileTextIcon,
  ListTodo,
} from "lucide-react";
import { TabBar, TaskTabContent, TasksModal } from "@/components/chat";
import type { Tab, TaskStatus } from "@/components/chat/TabBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
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
import { getToolCost } from "@/lib/x402/tool-costs";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";
import {
  useSpeechSynthesis,
  getVoiceSettings,
  saveVoiceSettings,
  type Voice,
  type VoiceSettings,
} from "@/lib/hooks/useSpeechSynthesis";

import type {
  AgentInfo,
  PriceData,
  ToolGroupInfo,
  SkillInfo,
  GeneratedImageResult,
} from "./types";
import {
  QUICK_SUGGESTIONS,
  getStoredApiKeys,
  saveApiKey,
  formatMarketCap,
} from "./types";

import { RARITY_SELECTOR_STYLES } from "@/lib/utils/rarity";

const rarityColors = RARITY_SELECTOR_STYLES as Record<
  string,
  {
    ring: string;
    glow: string;
    bg: string;
    hoverRing: string;
    hoverGlow: string;
    hoverText: string;
    accent: string;
    hoverOverlay: string;
  }
>;

// Agent Card Component - Memoized to prevent re-renders when parent updates
const AgentCard = React.memo(function AgentCard({
  agent,
  index,
  priceData,
}: {
  agent: AgentInfo;
  index: number;
  priceData?: PriceData;
}) {
  const rarity = rarityColors[agent.rarity || "common"] || rarityColors.common;
  const router = useRouter();

  const priceChange = priceData?.priceChange24h;
  const isPositive = priceChange !== undefined && priceChange >= 0;

  return (
    <button
      onClick={() =>
        router.push(`/dashboard/chat?agent=${agent.tokenMint || agent.id}`)
      }
      className={`group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-[#0a0520] ring-2 ${rarity.ring} transition-all duration-300 ease-out ${rarity.glow} text-left cursor-pointer ${rarity.hoverRing} ${rarity.hoverGlow} hover:-translate-y-1`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Agent Image */}
      {agent.imageUrl ? (
        <Image
          src={agent.imageUrl}
          alt={agent.name}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 22vw, 18vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#120557] to-[#0a0520] flex items-center justify-center">
          <Bot className="w-8 h-8 sm:w-12 sm:h-12 text-[#6FEC06]/40" />
        </div>
      )}

      {/* Base gradient overlay - always visible */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

      {/* Hover gradient overlay - slides up from bottom */}
      <div
        className={`absolute inset-0 bg-gradient-to-t ${rarity.hoverOverlay} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />

      {/* Content overlay */}
      <div className="absolute inset-0 p-2.5 sm:p-4 flex flex-col justify-between">
        {/* Top row: Token symbol & Price */}
        <div className="flex items-start justify-between gap-1">
          {/* Token badge */}
          {agent.tokenSymbol && (
            <div className="px-1.5 sm:px-2 py-0.5 rounded-full bg-black/60 text-[#6FEC06] text-[8px] sm:text-[10px] font-bold backdrop-blur-sm border border-[#6FEC06]/30 transition-all duration-300 group-hover:bg-[#6FEC06]/20 group-hover:border-[#6FEC06]/50">
              ${agent.tokenSymbol}
            </div>
          )}

          {/* 24h change badge */}
          {priceChange !== undefined && (
            <div
              className={`px-1.5 sm:px-2 py-0.5 rounded-full backdrop-blur-sm border text-[8px] sm:text-[10px] font-bold transition-all duration-300 ${
                isPositive
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/15 border-red-500/30 text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {priceChange.toFixed(1)}%
            </div>
          )}
        </div>

        {/* Bottom content area with name, personality, and chat CTA */}
        <div className="relative z-10">
          {/* Name and personality */}
          <h3
            className={`font-bold text-white text-sm sm:text-lg leading-tight truncate font-display transition-colors duration-300 ${rarity.hoverText}`}
          >
            {agent.name}
          </h3>

          {/* Personality / Chat CTA row */}
          <div className="flex items-center justify-between mt-0.5 sm:mt-1">
            {agent.personality ? (
              <p className="text-white/60 text-[10px] sm:text-xs capitalize truncate transition-all duration-300 group-hover:text-white/80">
                {agent.personality}
              </p>
            ) : priceData?.marketCap ? (
              <p className="text-white/50 text-[10px] sm:text-xs transition-all duration-300 group-hover:text-white/70">
                MC: {formatMarketCap(priceData.marketCap)}
              </p>
            ) : (
              <span />
            )}

            {/* Chat indicator - appears on hover with slide effect */}
            <div
              className={`flex items-center gap-1 ${rarity.accent} opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out`}
            >
              <span className="text-[10px] sm:text-xs font-semibold hidden sm:inline">
                Chat
              </span>
              <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Subtle inner border */}
      <div className="absolute inset-0 rounded-xl sm:rounded-2xl ring-1 ring-inset ring-white/10 transition-all duration-300" />
    </button>
  );
});

// Agent Selector Grid
function AgentSelector() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch("/api/explore");
        if (response.ok) {
          const data = await response.json();
          const agentList = data.agents || [];
          setAgents(agentList);

          // Fetch prices for all agents with token mints
          const tokenMints = agentList
            .filter((a: AgentInfo) => a.tokenMint)
            .map((a: AgentInfo) => a.tokenMint)
            .filter(Boolean);

          if (tokenMints.length > 0) {
            const priceResponse = await fetch(
              `/api/explore/prices?mints=${tokenMints.join(",")}`,
            );
            if (priceResponse.ok) {
              const priceData = await priceResponse.json();
              setPrices(priceData.prices || {});
            }
          }
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
      <div className="sticky top-0 z-10 bg-[#000020]/98 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full border border-[#6FEC06]/30 bg-[#6FEC06]/10 mb-3 sm:mb-4">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#6FEC06]" />
                  <span className="text-[10px] sm:text-xs font-medium text-[#6FEC06]">
                    Select an Agent
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display tracking-tight">
                  Chat with <span className="gradient-text">AI Agents</span>
                </h1>
                <p className="text-white/50 text-sm sm:text-base mt-1.5 sm:mt-2 max-w-md">
                  Choose an agent to start a conversation
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-80">
                <div
                  className={`relative transition-all duration-300 ${
                    searchFocused
                      ? "shadow-[0_0_20px_rgba(111,236,6,0.15)]"
                      : ""
                  }`}
                >
                  <Search
                    className={`absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
                      searchFocused ? "text-[#6FEC06]" : "text-white/40"
                    }`}
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    placeholder="Search by name, personality, or token..."
                    className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/35 focus:border-[#6FEC06]/40 focus:bg-white/[0.06] focus:outline-none transition-all duration-200"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/40 hover:text-white/70 hover:bg-white/10 transition-all duration-200"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  )}
                </div>
                {search && (
                  <p className="absolute -bottom-5 left-0 text-[11px] text-white/40">
                    {filteredAgents.length} agent
                    {filteredAgents.length !== 1 ? "s" : ""} found
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6 skeleton-fade-in">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl sm:rounded-2xl skeleton-glow skeleton-item"
                  style={{ animationDelay: `${i * 0.04}s` }}
                />
              ))}
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-16 sm:py-24">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <Bot className="w-8 h-8 sm:w-10 sm:h-10 text-white/20" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold mb-2 font-display">
                {search ? "No agents found" : "No agents available"}
              </h2>
              <p className="text-white/50 text-sm max-w-sm mx-auto">
                {search
                  ? "Try adjusting your search terms or browse all agents"
                  : "Check back later for new agents"}
              </p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-[#6FEC06] bg-[#6FEC06]/10 border border-[#6FEC06]/20 hover:bg-[#6FEC06]/15 hover:border-[#6FEC06]/30 transition-all duration-200"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6 content-fade-in">
              {filteredAgents.map((agent, index) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  index={index}
                  priceData={
                    agent.tokenMint ? prices[agent.tokenMint] : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Attachment Preview Component
function AttachmentsPreview() {
  const { files, remove } = usePromptInputAttachments();

  if (files.length === 0) return null;

  /** Check if a file is an image based on its mediaType */
  const isImage = (mediaType?: string) =>
    mediaType?.startsWith("image/") ?? false;

  /** Get a short display name for the file */
  const getShortName = (filename?: string) => {
    const name = filename || "File";
    return name.length > 15 ? `${name.slice(0, 12)}...${name.slice(-4)}` : name;
  };

  /** Get file extension for badge */
  const getExt = (filename?: string) =>
    filename?.split(".").pop()?.toUpperCase() || "FILE";

  /** Get accent color for file type */
  const getExtColor = (filename?: string) => {
    const ext = filename?.split(".").pop()?.toLowerCase();
    const colors: Record<string, string> = {
      pdf: "text-red-400 bg-red-400/15 border-red-400/30",
      md: "text-purple-400 bg-purple-400/15 border-purple-400/30",
      txt: "text-slate-300 bg-slate-400/15 border-slate-400/30",
      csv: "text-green-400 bg-green-400/15 border-green-400/30",
      json: "text-amber-400 bg-amber-400/15 border-amber-400/30",
      ts: "text-blue-400 bg-blue-400/15 border-blue-400/30",
      tsx: "text-cyan-400 bg-cyan-400/15 border-cyan-400/30",
      js: "text-yellow-400 bg-yellow-400/15 border-yellow-400/30",
      jsx: "text-cyan-400 bg-cyan-400/15 border-cyan-400/30",
      py: "text-green-400 bg-green-400/15 border-green-400/30",
      html: "text-red-400 bg-red-400/15 border-red-400/30",
      css: "text-blue-400 bg-blue-400/15 border-blue-400/30",
      sql: "text-orange-400 bg-orange-400/15 border-orange-400/30",
      xml: "text-orange-400 bg-orange-400/15 border-orange-400/30",
    };
    return (
      colors[ext || ""] || "text-[#6FEC06] bg-[#6FEC06]/15 border-[#6FEC06]/30"
    );
  };

  return (
    <PromptInputHeader className="px-4 pt-3 pb-2">
      <div className="flex flex-wrap gap-2.5 w-full justify-start">
        {files.map((file, index) => {
          const fileName = file.filename || "File";
          const shortName = getShortName(fileName);

          if (isImage(file.mediaType)) {
            // Image thumbnail preview
            return (
              <Attachments key={file.id} variant="grid">
                <Attachment
                  data={file}
                  onRemove={() => remove(file.id)}
                  className="size-20 rounded-xl border border-[#6FEC06]/30 bg-gradient-to-br from-[#0a0520] to-[#0a0520]/60 overflow-hidden ring-1 ring-inset ring-white/5 hover:ring-[#6FEC06]/40 hover:border-[#6FEC06]/50 hover:shadow-[0_0_20px_rgba(111,236,6,0.15)] transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    animation: `slideInUp 0.3s ease-out ${index * 0.05}s both`,
                  }}
                  title={fileName}
                >
                  <AttachmentPreview className="size-full" />
                  <AttachmentRemove className="transition-all duration-200" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent px-1.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-[9px] text-white/90 font-medium truncate leading-tight">
                      {shortName}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </Attachment>
              </Attachments>
            );
          }

          // Document file pill
          const ext = getExt(fileName);
          const extColor = getExtColor(fileName);

          return (
            <div
              key={file.id}
              className="group relative flex items-center gap-2.5 h-12 pl-3 pr-2 rounded-xl border border-white/[0.1] bg-gradient-to-r from-white/[0.04] to-white/[0.02] hover:border-[#6FEC06]/30 hover:bg-white/[0.06] hover:shadow-[0_0_16px_rgba(111,236,6,0.08)] transition-all duration-300"
              style={{
                animation: `slideInUp 0.3s ease-out ${index * 0.05}s both`,
              }}
              title={fileName}
            >
              {/* File type badge */}
              <span
                className={`shrink-0 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${extColor}`}
              >
                {ext}
              </span>

              {/* Filename */}
              <span className="text-xs text-white/80 font-medium truncate max-w-[120px]">
                {shortName}
              </span>

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(file.id);
                }}
                className="shrink-0 ml-0.5 p-1 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                aria-label={`Remove ${fileName}`}
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
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
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const ChatInputArea = React.memo(function ChatInputArea({
  displayName,
  status,
  onSubmit,
  onStop,
  speechSynthesis,
  identityToken,
  selectedModel,
  onModelChange,
}: ChatInputAreaProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);

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

  // Track drag events for visual feedback
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        dragCounterRef.current++;
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = () => {
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDraggingOver(false);
      }
    };

    const handleDrop = () => {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  return (
    <div className="shrink-0 z-20 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 pt-2 sm:pt-3 bg-[#000020] relative">
      {/* Drag overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#6FEC06]/10 backdrop-blur-sm border-2 border-dashed border-[#6FEC06] rounded-2xl mx-3 sm:mx-4 md:mx-6 my-2 sm:my-3 pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-[#6FEC06]">
            <Paperclip className="w-12 h-12 animate-bounce" />
            <p className="text-lg font-semibold">Drop files here</p>
            <p className="text-sm text-[#6FEC06]/60">
              Images, PDFs, documents, code files
            </p>
          </div>
        </div>
      )}

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
            accept="image/*,application/pdf,text/*,application/json,application/xml,.md,.csv,.json,.txt,.pdf,.ts,.tsx,.js,.jsx,.py,.sql,.yml,.yaml,.toml,.sh,.html,.css,.xml"
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
                className="bg-transparent border-0 !rounded-xl focus:ring-0 focus-visible:ring-0 text-white placeholder:text-white/45 min-h-[48px] sm:min-h-[52px] max-h-[150px] sm:max-h-[180px] text-sm sm:text-[15px] leading-relaxed shadow-none"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                {/* Model Picker - Enhanced with neon green accents */}
                <Select value={selectedModel} onValueChange={onModelChange}>
                  <SelectTrigger className="h-9 w-9 p-0 rounded-lg bg-white/[0.03] border border-white/[0.12] hover:bg-[#7fff00]/[0.08] hover:border-[#7fff00]/40 hover:shadow-[0_0_16px_rgba(127,255,0,0.2)] active:scale-95 transition-all duration-200 flex items-center justify-center [&_svg[class*='opacity']]:hidden">
                    <SelectValue>
                      {selectedModel === "anthropic/claude-haiku-4-5" ? (
                        <Zap className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.4)]" />
                      ) : selectedModel === "anthropic/claude-sonnet-4-5" ? (
                        <Brain className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.4)]" />
                      ) : (
                        <Star className="w-4 h-4 text-purple-400 drop-shadow-[0_0_6px_rgba(192,132,252,0.4)]" />
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0520]/95 backdrop-blur-xl border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    <SelectItem
                      value="anthropic/claude-haiku-4-5"
                      className="text-white/90 hover:bg-[#7fff00]/10 hover:text-[#7fff00] cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="font-medium">Fast (Haiku 4.5)</span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="anthropic/claude-sonnet-4-5"
                      className="text-white/90 hover:bg-[#7fff00]/10 hover:text-[#7fff00] cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Brain className="w-4 h-4 text-blue-400" />
                        <span className="font-medium">
                          Balanced (Sonnet 4.5)
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="anthropic/claude-opus-4-5"
                      className="text-white/90 hover:bg-[#7fff00]/10 hover:text-[#7fff00] cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Star className="w-4 h-4 text-purple-400" />
                        <span className="font-medium">Smart (Opus 4.5)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Attach Button - Enhanced with neon green hover */}
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger className="h-9 w-9 p-0 rounded-lg bg-white/[0.03] border border-white/[0.12] text-white/70 hover:text-[#7fff00] hover:bg-[#7fff00]/[0.08] hover:border-[#7fff00]/40 hover:shadow-[0_0_16px_rgba(127,255,0,0.2)] active:scale-95 transition-all duration-200 flex items-center justify-center">
                    <Paperclip className="w-4 h-4" />
                  </PromptInputActionMenuTrigger>
                  <PromptInputActionMenuContent className="bg-[#0a0520]/95 backdrop-blur-xl border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    <PromptInputActionAddAttachments
                      label="Add images or documents"
                      className="hover:bg-[#7fff00]/10 hover:text-[#7fff00]"
                    />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>

                {/* Voice Input Button - Enhanced with neon green hover */}
                <button
                  type="button"
                  onClick={voiceInput.toggleRecording}
                  disabled={voiceInput.isTranscribing}
                  className={`relative h-9 w-9 rounded-lg border transition-all duration-200 flex items-center justify-center ${
                    voiceInput.isRecording
                      ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30 hover:border-red-500/50 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
                      : voiceInput.isTranscribing
                        ? "bg-white/[0.03] border-white/[0.08] text-white/50 cursor-not-allowed"
                        : "bg-white/[0.03] border-white/[0.12] text-white/70 hover:text-[#7fff00] hover:bg-[#7fff00]/[0.08] hover:border-[#7fff00]/40 hover:shadow-[0_0_16px_rgba(127,255,0,0.2)] active:scale-95"
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
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
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

              {/* Send Button - Pure Neon Green with rocket icon */}
              <PromptInputSubmit
                status={status}
                onStop={onStop}
                disabled={!input.trim() && status === "ready"}
                className="group !rounded-lg !h-9 !w-9 !p-0 bg-gradient-to-br from-[#7fff00] to-[#00ff41] text-black font-bold hover:from-[#8fff10] hover:to-[#10ff51] disabled:opacity-30 disabled:hover:from-[#7fff00] disabled:hover:to-[#00ff41] disabled:cursor-not-allowed shadow-[0_2px_12px_rgba(127,255,0,0.4)] hover:shadow-[0_4px_24px_rgba(127,255,0,0.6)] hover:scale-105 active:scale-95 transition-all duration-200 border border-[#9fff30]/40 disabled:hover:scale-100 overflow-hidden relative"
              >
                {/* Background sparkle effect on hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />

                {/* Rocket icon with smooth lift-off on hover */}
                <Rocket className="w-4 h-4 relative z-10 transition-transform duration-200 group-hover:-translate-y-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
              </PromptInputSubmit>
            </PromptInputFooter>
          </PromptInput>
        </div>

        {/* Keyboard hint - hidden on mobile */}
        <p className="hidden sm:block text-center text-[11px] text-white/50 mt-2.5">
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

// Streaming cursor with smooth animation - optimized for inline display
function StreamingCursor() {
  return (
    <span className="streaming-cursor" aria-label="typing">
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
            className="p-2 rounded-lg hover:bg-white/[0.08] text-white/60 hover:text-white transition-all duration-200"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg hover:bg-white/[0.08] text-white/60 hover:text-white transition-all duration-200"
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
          className={`w-4 h-4 text-white/60 ml-auto transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
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
  onTaskCreated,
}: {
  agentId: string;
  chatId?: string;
  onTaskCreated?: (taskId: string, taskName: string) => void;
}) {
  const router = useRouter();
  const { identityToken } = useAuth();

  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Resolved agent ID (actual DB ID) for API calls — may differ from URL param if tokenMint was used
  const resolvedAgentId = agentInfo?.id || agentId;
  // Preferred URL slug: use tokenMint when available, fallback to DB ID
  const agentSlug = agentInfo?.tokenMint || agentInfo?.id || agentId;
  const [toolPanelCollapsed, setToolPanelCollapsed] = useState(false);
  const [mobileToolPanelOpen, setMobileToolPanelOpen] = useState(false);
  const [toolGroups, setToolGroups] = useState<ToolGroup[]>([]);
  const [skills, setSkills] = useState<SkillConfig[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [twitterConnected, setTwitterConnected] = useState(false);

  // Model selection state
  const [selectedModel, setSelectedModel] = useState<string>(
    "anthropic/claude-haiku-4-5",
  );

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
              category: g.category,
              logoUrl: g.logoUrl,
              source: g.source,
              requiresAuth: g.requiresAuth,
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
        }
      } catch (err) {
        console.error("Failed to fetch tools:", err);
      } finally {
        setToolsLoading(false);
      }
    }
    fetchToolsAndSkills();
  }, []);

  // Check Twitter connection status
  useEffect(() => {
    async function checkTwitterStatus() {
      if (!identityToken) {
        setTwitterConnected(false);
        return;
      }
      try {
        const response = await fetch("/api/twitter/oauth/status", {
          headers: { "privy-id-token": identityToken },
        });
        if (response.ok) {
          const data = await response.json();
          setTwitterConnected(data.connected);
        }
      } catch {
        setTwitterConnected(false);
      }
    }
    checkTwitterStatus();
  }, [identityToken]);

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
  // Always send user keys — the server merges them with env-based keys
  // (server keys take precedence via: serverConfig.apiKey || userApiKey)
  const skillApiKeys = useMemo(() => {
    const keys: Record<string, string> = {};
    skills
      .filter((s) => s.enabled && s.apiKey)
      .forEach((s) => {
        if (s.apiKey) keys[s.id] = s.apiKey;
      });
    return keys;
  }, [skills]);

  // Store body values in a ref so transport always has current values
  // Use resolvedAgentId (actual DB ID) for API calls, not the URL param
  const bodyRef = useRef({
    agentId: resolvedAgentId,
    model: selectedModel,
    enabledSkills: enabledSkillIds,
    enabledToolGroups,
    skillApiKeys,
  });

  // Keep ref updated with latest values
  useEffect(() => {
    bodyRef.current = {
      agentId: resolvedAgentId,
      model: selectedModel,
      enabledSkills: enabledSkillIds,
      enabledToolGroups,
      skillApiKeys,
    };
  }, [
    resolvedAgentId,
    selectedModel,
    enabledSkillIds,
    enabledToolGroups,
    skillApiKeys,
  ]);

  // Transport with stable identity - body function reads from ref
  // Custom fetch extracts structured error details from non-200 responses
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: "/api/chat",
      headers: identityToken ? { "privy-id-token": identityToken } : undefined,
      body: () => bodyRef.current,
      fetch: async (input, init) => {
        const response = await globalThis.fetch(input, init);
        if (!response.ok) {
          let errorMessage = response.statusText || "Request failed";
          let errorCode = "";
          try {
            const body = await response.json();
            errorMessage = body.error || errorMessage;
            errorCode = body.code || "";
          } catch {
            // Response body not JSON — use status text
          }
          const error = new Error(errorMessage) as Error & {
            status?: number;
            code?: string;
          };
          error.status = response.status;
          error.code = errorCode;
          throw error;
        }
        return response;
      },
    });
  }, [identityToken]);

  const { messages, sendMessage, status, regenerate, stop, setMessages } =
    useChat({
      transport,
      onError: (error) => {
        const status = (error as Error & { status?: number }).status;
        const code = (error as Error & { code?: string }).code;

        if (code === "WALLET_NOT_SETUP") {
          toast.error("Wallet not configured", {
            description:
              "Your wallet is not configured for automatic payments. Please log out and log back in.",
            duration: 8000,
          });
        } else if (code === "NO_WALLET") {
          toast.error("No wallet found", {
            description:
              "No wallet is associated with your account. Please log out and log back in.",
            duration: 8000,
          });
        } else if (
          status === 402 ||
          code === "INSUFFICIENT_BALANCE" ||
          code === "PAYMENT_FAILED"
        ) {
          toast.error("Insufficient balance", {
            description: "You need to deposit SOL to your wallet for AI usage.",
            duration: 8000,
          });
        } else if (status === 401) {
          toast.error("Session expired", {
            description: "Please log in again to continue.",
            duration: 5000,
          });
        } else if (status === 429) {
          toast.error("Rate limited", {
            description: "Too many requests. Please wait a moment.",
            duration: 5000,
          });
        } else if (status === 503) {
          toast.error("Service unavailable", {
            description:
              "The payment system is currently unavailable. Please try again later.",
            duration: 5000,
          });
        } else {
          toast.error("Something went wrong", {
            description:
              error.message || "An error occurred. Please try again.",
            duration: 5000,
          });
        }
      },
    });

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
    router.push(`/dashboard/chat?agent=${agentSlug}`);
  }, [agentSlug, router, setMessages]);

  // Handle selecting a chat from history
  const handleSelectChat = useCallback(
    (selectedChatId: string, selectedAgentSlug?: string | null) => {
      const url = `/dashboard/chat?agent=${selectedAgentSlug || agentSlug}&chatId=${selectedChatId}`;
      router.push(url);
    },
    [agentSlug, router],
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

  // Keep a stable ref to speechSynthesis.speak to avoid infinite re-execution.
  // useSpeechSynthesis returns a new object on every render (due to ...state spread),
  // so using it directly as a useEffect dependency would re-run the effect every render.
  const speakRef = useRef(speechSynthesis.speak);
  useEffect(() => {
    speakRef.current = speechSynthesis.speak;
  }, [speechSynthesis.speak]);

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
        speakRef.current(textPart.text);
      }
    }
  }, [messages, status, voiceSettings.autoSpeak]);

  // Detect task creation from tool results and notify parent immediately
  const detectedTasksRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!onTaskCreated) return;

    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        // Skip non-tool parts early
        if (!part.type || !part.type.startsWith("tool-")) continue;

        // AI SDK tool parts have type like "tool-call" or specific tool type
        const toolPart = part as {
          type: string;
          toolName?: string;
          title?: string; // Legacy
          toolCallId?: string;
          state?: string;
          result?: Record<string, unknown>;
          output?: Record<string, unknown>; // Legacy property name
          args?: Record<string, unknown>;
        };

        // Get the tool name from various possible sources
        const toolName =
          toolPart.toolName ||
          toolPart.title ||
          toolPart.type.replace(/^tool-/, "");

        const isTaskTool = toolName === "createRecurringTask";

        // Check if tool has completed with a result (support both result and output)
        if (isTaskTool) {
          const result = (toolPart.result || toolPart.output) as
            | Record<string, unknown>
            | undefined;

          if (result) {
            const taskId = result.taskId as string | undefined;
            const taskName = result.name as string | undefined;

            if (
              taskId &&
              taskName &&
              !result.error &&
              !detectedTasksRef.current.has(taskId)
            ) {
              detectedTasksRef.current.add(taskId);
              onTaskCreated(taskId, taskName);
            }
          }
        }
      }
    }
  }, [messages, onTaskCreated]);

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

          // Normalize URL to use tokenMint when available (e.g. if user navigated with DB ID)
          const preferredSlug = data.agent.tokenMint || data.agent.id;
          if (preferredSlug && preferredSlug !== agentId) {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set("agent", preferredSlug);
            const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
            window.history.replaceState({}, "", newUrl);
          }
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
        return;
      }

      // Only save messages we haven't saved yet
      const newMessages = messagesToSave.slice(lastSavedMessagesRef.current);
      if (newMessages.length === 0) {
        return;
      }

      try {
        let currentChatId = chatIdRef.current;

        // Create a new chat if we don't have one
        if (!currentChatId) {
          const createResponse = await fetch("/api/chats", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "privy-id-token": identityToken,
            },
            body: JSON.stringify({ agentId: resolvedAgentId }),
          });

          if (createResponse.ok) {
            const data = await createResponse.json();
            currentChatId = data.chat.id;
            setChatId(currentChatId);
            chatIdRef.current = currentChatId; // Update ref immediately
            // Update URL without reload — use tokenMint slug for URLs
            const newUrl = `/dashboard/chat?agent=${agentSlug}&chatId=${currentChatId}`;
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
    [resolvedAgentId, agentSlug, identityToken],
  ); // Removed chatId from deps - using ref instead

  // Save messages after response completes
  useEffect(() => {
    if (
      status === "ready" &&
      messages.length > 0 &&
      messages.length > lastSavedMessagesRef.current
    ) {
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
              className="p-2 -ml-2 lg:ml-0 rounded-xl hover:bg-white/[0.08] text-white/60 hover:text-white transition-all duration-200 group shrink-0"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* Agent profile link - clickable avatar and name */}
            <button
              onClick={() =>
                router.push(`/agent/${agentInfo?.tokenMint || agentId}`)
              }
              className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 group"
              title="View agent profile"
            >
              {/* Agent avatar with rarity ring */}
              <div className="relative shrink-0">
                <div
                  className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-gradient-to-br ${rarity.bg} flex items-center justify-center ring-2 ${rarity.ring} ${rarity.glow} group-hover:ring-[#6FEC06] transition-all duration-200`}
                >
                  {agentInfo?.imageUrl ? (
                    <Image
                      src={agentInfo.imageUrl}
                      alt={displayName}
                      fill
                      sizes="44px"
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-[#6FEC06]" />
                  )}
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-[#10b981] border-2 border-[#000020]" />
              </div>

              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-semibold text-white text-sm sm:text-base truncate group-hover:text-[#6FEC06] transition-colors duration-200">
                    {displayName}
                  </h1>
                  <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/40 group-hover:text-[#6FEC06] transition-colors duration-200" />
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-white/60">
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
            </button>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleNewChat}
              className="p-2.5 rounded-lg hover:bg-[#7fff00]/10 text-white/60 hover:text-[#7fff00] transition-all duration-200 hover:shadow-[0_0_16px_rgba(127,255,0,0.15)] active:scale-95"
              title="New chat"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Mobile Tool Panel Toggle */}
            <button
              onClick={handleOpenMobileToolPanel}
              className="lg:hidden relative p-2.5 rounded-lg hover:bg-white/[0.08] text-white/60 hover:text-white transition-all duration-200"
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

                  // Memoize message key to prevent re-renders
                  const messageKey = `${message.id}-${messageIndex}`;

                  return (
                    <div
                      key={messageKey}
                      className={`flex ${isUser ? "justify-end" : "justify-start"} message-animate-in`}
                    >
                      <Message
                        from={message.role}
                        className={`max-w-[95%] sm:max-w-[85%] ${
                          isUser
                            ? "[&_.is-user]:bg-gradient-to-br [&_.is-user]:from-white/[0.08] [&_.is-user]:via-white/[0.05] [&_.is-user]:to-white/[0.03] [&_.is-user]:border [&_.is-user]:border-white/[0.12] [&_.is-user]:shadow-[0_2px_12px_rgba(0,0,0,0.3)] [&_.is-user]:backdrop-blur-sm"
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
                          {/* Render file attachments at the top of the message */}
                          {message.parts.some((p) => p.type === "file") &&
                            (() => {
                              const fileParts = message.parts
                                .filter((p) => p.type === "file")
                                .map((part) => {
                                  const fp = part as {
                                    type: string;
                                    url?: string;
                                    data?: string;
                                    mediaType?: string;
                                    filename?: string;
                                    [key: string]: unknown;
                                  };
                                  return fp;
                                });

                              const imageParts = fileParts.filter(
                                (fp) =>
                                  fp.mediaType?.startsWith("image/") &&
                                  (fp.url || fp.data),
                              );
                              const docParts = fileParts.filter(
                                (fp) => !fp.mediaType?.startsWith("image/"),
                              );

                              return (
                                <div className="mb-3 -mx-1">
                                  {/* Image attachments - grid thumbnails */}
                                  {imageParts.length > 0 && (
                                    <Attachments
                                      variant="grid"
                                      className="gap-2.5 mb-2"
                                    >
                                      {imageParts.map((filePart, idx) => {
                                        const fileUrl =
                                          filePart.url || filePart.data;
                                        if (!fileUrl) return null;

                                        const clickUrl =
                                          (typeof filePart.url === "string" &&
                                          filePart.url.startsWith("http")
                                            ? filePart.url
                                            : null) ||
                                          (typeof filePart.data === "string" &&
                                          filePart.data.startsWith("http")
                                            ? filePart.data
                                            : null) ||
                                          fileUrl;

                                        return (
                                          <div
                                            key={`${message.id}-img-${idx}`}
                                            className="group/image relative"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (clickUrl) {
                                                window.open(
                                                  clickUrl,
                                                  "_blank",
                                                  "noopener,noreferrer",
                                                );
                                              }
                                            }}
                                          >
                                            <Attachment
                                              data={{
                                                id: `${message.id}-img-${idx}`,
                                                type: "file",
                                                url: fileUrl,
                                                mediaType:
                                                  filePart.mediaType ||
                                                  "image/png",
                                                filename:
                                                  filePart.filename || "image",
                                              }}
                                              className={`
                                                rounded-2xl overflow-hidden cursor-pointer
                                                ${
                                                  isUser
                                                    ? "border border-white/[0.15] shadow-[0_4px_16px_rgba(0,0,0,0.4)] bg-white/[0.04]"
                                                    : "border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.25)] bg-white/[0.02]"
                                                }
                                                hover:border-white/[0.2] hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)] 
                                                hover:scale-[1.02] hover:z-10
                                                transition-all duration-300
                                                backdrop-blur-sm
                                                !size-32 sm:!size-40
                                              `}
                                            >
                                              <div className="relative w-full h-full overflow-hidden">
                                                <AttachmentPreview className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-110" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 pointer-events-none">
                                                  <div className="bg-black/70 backdrop-blur-sm rounded-full p-2.5 shadow-xl animate-pulse">
                                                    <ImageIcon className="w-5 h-5 text-white" />
                                                  </div>
                                                </div>
                                              </div>
                                            </Attachment>

                                            {/* Full-size preview on hover */}
                                            <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4 sm:p-8">
                                              <div className="relative max-w-[90vw] max-h-[90vh] rounded-xl overflow-visible shadow-[0_20px_80px_rgba(0,0,0,0.8),0_0_120px_rgba(111,236,6,0.15)] border border-white/20 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-sm transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-0 group-hover/image:scale-100 opacity-0 group-hover/image:opacity-100 p-1">
                                                <div className="rounded-xl overflow-hidden">
                                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                                  <img
                                                    src={fileUrl}
                                                    alt={
                                                      filePart.filename ||
                                                      "Full size preview"
                                                    }
                                                    className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
                                                  />
                                                </div>
                                              </div>
                                              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl px-5 py-2.5 rounded-full text-white/90 text-sm font-medium shadow-2xl border border-white/20 transition-all duration-500 ease-out delay-100 opacity-0 group-hover/image:opacity-100 transform translate-y-2 group-hover/image:translate-y-0">
                                                Click to open in new tab
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </Attachments>
                                  )}

                                  {/* Document attachments - compact pills */}
                                  {docParts.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {docParts.map((filePart, idx) => {
                                        const fileName =
                                          filePart.filename || "document";
                                        const ext =
                                          fileName
                                            .split(".")
                                            .pop()
                                            ?.toUpperCase() || "FILE";
                                        const shortName =
                                          fileName.length > 24
                                            ? `${fileName.slice(0, 20)}...${fileName.slice(-4)}`
                                            : fileName;

                                        // Color map for file type badges
                                        const extColorMap: Record<
                                          string,
                                          string
                                        > = {
                                          PDF: "text-red-400 bg-red-400/15 border-red-400/25",
                                          MD: "text-purple-400 bg-purple-400/15 border-purple-400/25",
                                          TXT: "text-slate-300 bg-slate-400/15 border-slate-400/25",
                                          CSV: "text-green-400 bg-green-400/15 border-green-400/25",
                                          JSON: "text-amber-400 bg-amber-400/15 border-amber-400/25",
                                          TS: "text-blue-400 bg-blue-400/15 border-blue-400/25",
                                          TSX: "text-cyan-400 bg-cyan-400/15 border-cyan-400/25",
                                          JS: "text-yellow-400 bg-yellow-400/15 border-yellow-400/25",
                                          PY: "text-green-400 bg-green-400/15 border-green-400/25",
                                          SQL: "text-orange-400 bg-orange-400/15 border-orange-400/25",
                                          HTML: "text-red-400 bg-red-400/15 border-red-400/25",
                                          CSS: "text-blue-400 bg-blue-400/15 border-blue-400/25",
                                        };
                                        const extColor =
                                          extColorMap[ext] ||
                                          "text-[#6FEC06]/80 bg-[#6FEC06]/10 border-[#6FEC06]/20";

                                        return (
                                          <div
                                            key={`${message.id}-doc-${idx}`}
                                            className={`
                                              flex items-center gap-2 px-3 py-2 rounded-xl
                                              ${isUser ? "bg-white/[0.06] border border-white/[0.12]" : "bg-white/[0.03] border border-white/[0.08]"}
                                              transition-all duration-200
                                            `}
                                            title={fileName}
                                          >
                                            <FileTextIcon className="w-4 h-4 text-white/40 shrink-0" />
                                            <span
                                              className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${extColor}`}
                                            >
                                              {ext}
                                            </span>
                                            <span className="text-xs text-white/70 truncate max-w-[160px]">
                                              {shortName}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                          {/* Render text and other parts */}
                          {message.parts.map((part, i) => {
                            const isLastPart = i === message.parts.length - 1;
                            const isActivelyStreaming =
                              isLastMessage && status === "streaming";
                            // Check if the next part is also a tool
                            const nextPart = message.parts[i + 1];
                            const isLastToolInSequence =
                              !nextPart || !nextPart.type.startsWith("tool-");

                            switch (part.type) {
                              case "file":
                                // Files are rendered above, skip here
                                return null;
                              case "text":
                                return (
                                  <div
                                    key={`${message.id}-${i}`}
                                    className="relative"
                                  >
                                    <div
                                      className={
                                        isActivelyStreaming
                                          ? "streaming-message"
                                          : ""
                                      }
                                    >
                                      <MessageResponse className="text-white/90 leading-relaxed">
                                        {part.text}
                                      </MessageResponse>
                                      {isLastPart && isActivelyStreaming && (
                                        <StreamingCursor />
                                      )}
                                    </div>
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
                                    <div
                                      key={`${message.id}-${i}`}
                                      className={
                                        isLastToolInSequence ? "mb-6" : ""
                                      }
                                    >
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
                                        cost={getToolCost(toolDisplayName)}
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

                        {/* Tool cost summary for assistant messages */}
                        {message.role === "assistant" &&
                          status === "ready" &&
                          (() => {
                            const toolCosts = message.parts
                              .filter((p) => p.type.startsWith("tool-"))
                              .map((p) => {
                                const tp = p as {
                                  toolName?: string;
                                  title?: string;
                                  type: string;
                                  state: string;
                                };
                                const name =
                                  tp.toolName ||
                                  tp.title ||
                                  tp.type.replace("tool-", "");
                                const cost = getToolCost(name);
                                return { name, cost, state: tp.state };
                              })
                              .filter(
                                (t) => t.cost > 0 && t.state === "result",
                              );

                            if (toolCosts.length === 0) return null;
                            const total = toolCosts.reduce(
                              (sum, t) => sum + t.cost,
                              0,
                            );
                            const cents = total * 100;
                            const costStr =
                              total < 0.01
                                ? `${cents.toFixed(2)}¢`
                                : total < 1
                                  ? `$${total.toFixed(4)}`
                                  : `$${total.toFixed(2)}`;

                            return (
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-white/35">
                                <Zap className="w-2.5 h-2.5" />
                                <span className="tabular-nums">{costStr}</span>
                                <span>
                                  tool cost
                                  {toolCosts.length > 1
                                    ? ` (${toolCosts.length} tools)`
                                    : ""}
                                </span>
                              </div>
                            );
                          })()}

                        {message.role === "assistant" &&
                          isLastMessage &&
                          status === "ready" && (
                            <MessageActions className="mt-4 pt-3 border-t border-white/[0.06] gap-1.5">
                              <MessageAction
                                onClick={() => regenerate()}
                                label="Regenerate"
                                tooltip="Regenerate response"
                                className="text-white/55 hover:text-[#7fff00] hover:bg-[#7fff00]/15 hover:border-[#7fff00]/30 active:scale-95 rounded-lg transition-all duration-200 border border-transparent hover:shadow-[0_0_16px_rgba(127,255,0,0.15)]"
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
                                className="text-white/55 hover:text-[#7fff00] hover:bg-[#7fff00]/15 hover:border-[#7fff00]/30 active:scale-95 rounded-lg transition-all duration-200 border border-transparent hover:shadow-[0_0_16px_rgba(127,255,0,0.15)]"
                              >
                                {copied ? (
                                  <Check className="size-3.5 text-[#7fff00] drop-shadow-[0_0_6px_rgba(127,255,0,0.6)]" />
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
                                className={`rounded-lg transition-all duration-200 border active:scale-95 ${
                                  speakingMessageId === message.id
                                    ? "text-[#7fff00] bg-[#7fff00]/15 border-[#7fff00]/35 shadow-[0_0_16px_rgba(127,255,0,0.25)]"
                                    : "text-white/55 hover:text-[#7fff00] hover:bg-[#7fff00]/15 hover:border-[#7fff00]/30 border-transparent hover:shadow-[0_0_16px_rgba(127,255,0,0.15)]"
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
            <ConversationScrollButton className="bg-[#0a0520]/90 backdrop-blur-sm border-white/[0.12] text-[#7fff00] hover:text-[#7fff00] hover:bg-[#7fff00]/15 hover:border-[#7fff00]/40 hover:shadow-[0_0_20px_rgba(127,255,0,0.3)] hover:scale-105 active:scale-95 transition-all duration-200 shadow-xl [&_svg]:text-[#7fff00] [&_svg]:hover:text-[#7fff00]" />
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
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
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
        // Tool connection status
        twitterConnected={twitterConnected}
      />
    </div>
  );
}

// Main Page Component
// ── Tab persistence ──────────────────────────────────────────────────────────

const TABS_STORAGE_KEY = "agent-inc-tabs";

function loadTabs(): Tab[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(TABS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveTabs(tabs: Tab[]) {
  try {
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // localStorage unavailable
  }
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const agentId = searchParams.get("agent");
  const chatId = searchParams.get("chatId");
  const { identityToken } = useAuth();

  // Tab state - initialize from localStorage synchronously to avoid flash
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const stored = loadTabs();
    const chatTab: Tab = {
      id: "chat",
      type: "chat",
      title: "Chat",
      agentId: agentId || undefined,
      chatId: chatId || undefined,
    };
    const taskTabs = stored.filter((t) => t.type === "task");
    return [chatTab, ...taskTabs];
  });
  const [activeTabId, setActiveTabId] = useState<string>("chat");
  const [tasksModalOpen, setTasksModalOpen] = useState(false);
  const tabsInitializedRef = useRef(false);

  // Clean up OAuth callback params from URL (twitter_connected, twitter_error)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthParam =
      urlParams.has("twitter_connected") || urlParams.has("twitter_error");

    if (hasOAuthParam) {
      urlParams.delete("twitter_connected");
      urlParams.delete("twitter_error");
      const newSearch = urlParams.toString();
      const newUrl = newSearch
        ? `${window.location.pathname}?${newSearch}`
        : window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Fetch active tasks from server to sync task tabs on mount
  useEffect(() => {
    if (!identityToken || tabsInitializedRef.current) return;
    tabsInitializedRef.current = true;

    fetch("/api/tasks?status=running,paused", {
      headers: { "privy-id-token": identityToken },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.tasks && data.tasks.length > 0) {
          setTabs((prev) => {
            const existingTaskIds = new Set(
              prev.filter((t) => t.type === "task").map((t) => t.taskId),
            );

            const newTaskTabs: Tab[] = data.tasks
              .filter((t: { id: string }) => !existingTaskIds.has(t.id))
              .map((t: { id: string; name: string; status: TaskStatus }) => ({
                id: `task-${t.id}`,
                type: "task" as const,
                title: t.name,
                taskId: t.id,
                status: t.status,
              }));

            // Also update existing task tabs with latest status
            const updated = prev.map((tab) => {
              if (tab.type !== "task") return tab;
              const serverTask = data.tasks.find(
                (t: { id: string }) => t.id === tab.taskId,
              );
              if (serverTask) {
                return { ...tab, status: serverTask.status };
              }
              return tab;
            });

            const all = [...updated, ...newTaskTabs];
            saveTabs(all.filter((t) => t.type === "task"));
            return all;
          });
        }
      })
      .catch(() => {
        // Silently fail — tasks will still work from localStorage
      });
  }, [identityToken]);

  // Persist task tabs when they change
  useEffect(() => {
    saveTabs(tabs.filter((t) => t.type === "task"));
  }, [tabs]);

  // Listen for task creation events (tool results in the chat)
  // This is called by the ChatInterface when a createRecurringTask tool succeeds
  const handleTaskCreated = useCallback((taskId: string, taskName: string) => {
    const newTab: Tab = {
      id: `task-${taskId}`,
      type: "task",
      title: taskName,
      taskId,
      status: "running",
    };
    setTabs((prev) => {
      if (prev.some((t) => t.taskId === taskId)) return prev;
      return [...prev, newTab];
    });
  }, []);

  const handleTabSelect = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
      // If selecting chat tab, ensure URL matches
      if (tabId === "chat" && agentId) {
        const url = chatId
          ? `/dashboard/chat?agent=${agentId}&chatId=${chatId}`
          : `/dashboard/chat?agent=${agentId}`;
        router.replace(url);
      }
    },
    [agentId, chatId, router],
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        // Don't allow closing the last tab
        if (prev.length <= 1) return prev;
        const filtered = prev.filter((t) => t.id !== tabId);
        // If closing active tab, switch to first available
        if (tabId === activeTabId && filtered.length > 0) {
          setActiveTabId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeTabId],
  );

  const handleNewChat = useCallback(() => {
    // If currently viewing a task tab, guide the user on task creation
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (activeTab?.type === "task") {
      toast.info("Ask your agent to create a task", {
        description:
          'Try: "Tweet a joke every hour" or "Check trending topics every 30 minutes"',
        duration: 6000,
      });
    }
    setActiveTabId("chat");
    if (agentId) {
      router.push(`/dashboard/chat?agent=${agentId}`);
    } else {
      router.push("/dashboard/chat");
    }
  }, [agentId, router, tabs, activeTabId]);

  const handleTaskStatusChange = useCallback(
    (taskId: string, status: TaskStatus) => {
      setTabs((prev) =>
        prev.map((t) => (t.taskId === taskId ? { ...t, status } : t)),
      );
    },
    [],
  );

  // If no agent selected, show agent selector (no tabs needed)
  if (!agentId) {
    return <AgentSelector />;
  }

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex h-full flex-col">
      {/* Tasks Modal */}
      <TasksModal
        isOpen={tasksModalOpen}
        onClose={() => setTasksModalOpen(false)}
        onTaskReopen={(taskId, taskName) => {
          handleTaskCreated(taskId, taskName);
          setTasksModalOpen(false);
        }}
        onNewTask={() => {
          setTasksModalOpen(false);
          setActiveTabId("chat");
          toast.info("Ask your agent to create a task", {
            description:
              'Try: "Tweet a joke every hour" or "Check trending topics every 30 minutes"',
            duration: 6000,
          });
        }}
        identityToken={identityToken}
      />

      {/* Tab bar (always visible) */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        onNewChat={handleNewChat}
        rightActions={
          <button
            onClick={() => setTasksModalOpen(true)}
            className="flex h-9 items-center gap-1.5 px-3 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
            title="Task Dashboard"
          >
            <ListTodo className="h-3.5 w-3.5" />
            <span className="text-xs">Tasks</span>
          </button>
        }
      />

      {/* Content area */}
      <div className="flex-1 min-h-0">
        {activeTab?.type === "task" && activeTab.taskId ? (
          <TaskTabContent
            taskId={activeTab.taskId}
            identityToken={identityToken}
            onStatusChange={handleTaskStatusChange}
          />
        ) : (
          <ChatInterface
            agentId={agentId}
            chatId={chatId || undefined}
            onTaskCreated={handleTaskCreated}
          />
        )}
      </div>
    </div>
  );
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
