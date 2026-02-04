"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Zap,
  Power,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  History,
  Wrench,
  Settings,
  Volume2,
  Mic,
  GripVertical,
  Plus,
  MessageSquare,
  Bot,
  Clock,
  Trash2,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

export interface ApiKeyConfig {
  label: string;
  helpText?: string;
  helpUrl?: string;
  placeholder?: string;
}

/** Individual tool function within a group */
export interface ToolFunction {
  id: string;
  name: string;
  description: string;
}

/** Tool group - a collection of related functions */
export interface ToolGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  logoUrl?: string; // URL to actual logo image from the web
  source?: string;
  enabled: boolean;
  functions: ToolFunction[];
}

/** Skill config - for skills that require API keys */
export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  icon?: string;
  enabled: boolean;
  requiresApiKey?: boolean;
  apiKeyConfig?: ApiKeyConfig;
  apiKey?: string;
  isConfigured?: boolean;
  /** Functions provided by this skill (for UI display) */
  functions?: ToolFunction[];
}

// Legacy ToolConfig for backwards compatibility
export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  category: "utility" | "skill" | "custom";
  icon?: string;
  enabled: boolean;
  params?: Record<string, ToolParam>;
  requiresApiKey?: boolean;
  apiKeyConfig?: ApiKeyConfig;
  apiKey?: string;
  isConfigured?: boolean;
}

export interface ToolParam {
  name: string;
  type: "string" | "number" | "boolean" | "select";
  description?: string;
  default?: unknown;
  value?: unknown;
  options?: { label: string; value: string }[];
}

type TabId = "tools" | "history" | "settings";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

// Voice types
export type VoiceId = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface VoiceOption {
  id: VoiceId;
  name: string;
  description: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
  { id: "echo", name: "Echo", description: "Warm and conversational" },
  { id: "fable", name: "Fable", description: "British and narrative" },
  { id: "onyx", name: "Onyx", description: "Deep and authoritative" },
  { id: "nova", name: "Nova", description: "Friendly and upbeat" },
  { id: "shimmer", name: "Shimmer", description: "Clear and expressive" },
];

export interface VoiceSettings {
  voice: VoiceId;
  speed: number;
  autoSpeak: boolean;
}

const TABS: TabConfig[] = [
  { id: "tools", label: "Tools", icon: <Wrench className="w-5 h-5" /> },
  { id: "history", label: "History", icon: <History className="w-5 h-5" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
];

interface ToolPanelProps {
  toolGroups: ToolGroup[];
  skills: SkillConfig[];
  onGroupToggle: (groupId: string, enabled: boolean) => void;
  onSkillToggle: (skillId: string, enabled: boolean) => void;
  onApiKeyChange?: (skillId: string, apiKey: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  loading?: boolean;
  // Voice settings
  voiceSettings?: VoiceSettings;
  onVoiceChange?: (voice: VoiceId) => void;
  onSpeedChange?: (speed: number) => void;
  onAutoSpeakChange?: (autoSpeak: boolean) => void;
  // Chat history props
  currentChatId?: string;
  currentAgentId?: string;
  identityToken?: string | null;
  onNewChat?: () => void;
  onSelectChat?: (chatId: string, agentId?: string | null) => void;
  historyRefreshTrigger?: number;
}

const ToolGroupCard = React.memo(function ToolGroupCard({
  group,
  onToggle,
}: {
  group: ToolGroup;
  onToggle: (enabled: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleToggle = useCallback(
    () => onToggle(!group.enabled),
    [onToggle, group.enabled],
  );
  const handleExpand = useCallback(() => setExpanded((prev) => !prev), []);
  const handleImageError = useCallback(() => setImageError(true), []);

  return (
    <div
      className={`rounded-lg border transition-all duration-150 ${
        group.enabled
          ? "bg-[#6FEC06]/[0.06] border-[#6FEC06]/20"
          : "bg-transparent border-white/[0.04] hover:border-white/[0.08]"
      }`}
    >
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        {/* Icon/Logo */}
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 overflow-hidden ${
            group.enabled ? "bg-[#6FEC06]/20" : "bg-white/[0.04]"
          }`}
        >
          {group.logoUrl && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.logoUrl}
              alt={group.name}
              className="w-4 h-4 object-contain"
              onError={handleImageError}
            />
          ) : (
            group.icon
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span
            className={`font-medium text-[13px] leading-tight truncate block ${group.enabled ? "text-white" : "text-white/75"}`}
          >
            {group.name}
          </span>
        </div>

        {/* Count + Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-[10px] tabular-nums min-w-[12px] text-right ${group.enabled ? "text-white/60" : "text-white/45"}`}
          >
            {group.functions.length}
          </span>
          <button
            onClick={handleExpand}
            className="p-1 rounded hover:bg-white/[0.04] text-white/55 hover:text-white/70 transition-colors"
          >
            <ChevronRight
              className={`w-3 h-3 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
            />
          </button>
          <button
            onClick={handleToggle}
            className={`p-1 rounded transition-colors ${
              group.enabled
                ? "text-[#6FEC06]"
                : "text-white/20 hover:text-white/35"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className={`px-2.5 pb-2 border-t ${group.enabled ? "border-[#6FEC06]/10" : "border-white/[0.03]"}`}
        >
          <div className="pt-1.5 space-y-0.5">
            {group.functions.map((fn) => (
              <div
                key={fn.id}
                className="flex items-start gap-1.5 py-0.5 text-[10px]"
              >
                <span
                  className={`w-1 h-1 rounded-full mt-[5px] shrink-0 ${group.enabled ? "bg-[#6FEC06]/60" : "bg-white/15"}`}
                />
                <span
                  className={group.enabled ? "text-white/70" : "text-white/50"}
                >
                  {fn.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

const SkillCard = React.memo(function SkillCard({
  skill,
  onToggle,
  onApiKeyChange,
}: {
  skill: SkillConfig;
  onToggle: (enabled: boolean) => void;
  onApiKeyChange?: (apiKey: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(skill.apiKey || "");

  // Skills with apiKeyConfig can always be expanded to configure API key
  const hasApiKeyConfig = !!skill.apiKeyConfig;
  const hasUserApiKey = !!skill.apiKey;
  const hasFunctions = skill.functions && skill.functions.length > 0;
  const canExpand = hasApiKeyConfig || hasFunctions;

  const handleApiKeySave = () => {
    if (onApiKeyChange) {
      onApiKeyChange(localApiKey);
    }
  };

  const handleApiKeyClear = () => {
    setLocalApiKey("");
    if (onApiKeyChange) {
      onApiKeyChange("");
    }
  };

  // Update local state when skill.apiKey changes (e.g., loaded from storage)
  const prevApiKeyRef = useRef(skill.apiKey);
  useEffect(() => {
    if (skill.apiKey !== prevApiKeyRef.current) {
      setLocalApiKey(skill.apiKey || "");
      prevApiKeyRef.current = skill.apiKey;
    }
  }, [skill.apiKey]);

  const handleToggle = useCallback(
    () => onToggle(!skill.enabled),
    [onToggle, skill.enabled],
  );
  const handleExpand = useCallback(() => setExpanded((prev) => !prev), []);

  return (
    <div
      className={`rounded-lg border transition-all duration-150 ${
        skill.enabled
          ? "bg-[#6FEC06]/[0.06] border-[#6FEC06]/20"
          : "bg-transparent border-white/[0.04] hover:border-white/[0.08]"
      }`}
    >
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        {/* Icon */}
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 ${
            skill.enabled ? "bg-[#6FEC06]/20" : "bg-white/[0.04]"
          }`}
        >
          {skill.icon || "⚡"}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span
            className={`font-medium text-[13px] leading-tight truncate block ${skill.enabled ? "text-white" : "text-white/75"}`}
          >
            {skill.name}
          </span>
        </div>

        {/* Status + Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Function count */}
          {hasFunctions && (
            <span
              className={`text-[10px] tabular-nums min-w-[12px] text-right ${skill.enabled ? "text-white/60" : "text-white/45"}`}
            >
              {skill.functions!.length}
            </span>
          )}
          {/* Show key status indicator */}
          {hasApiKeyConfig && (
            <Key
              className={`w-3 h-3 ${hasUserApiKey ? "text-[#6FEC06]/60" : "text-amber-400/60"}`}
            />
          )}
          {/* Show expand button if can expand */}
          {canExpand && (
            <button
              onClick={handleExpand}
              className="p-1 rounded hover:bg-white/[0.04] text-white/55 hover:text-white/70 transition-colors"
            >
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
              />
            </button>
          )}
          {/* Always allow enabling - skills can work without API key for setup tools */}
          <button
            onClick={handleToggle}
            className={`p-1 rounded transition-colors ${
              skill.enabled
                ? "text-[#6FEC06]"
                : "text-white/20 hover:text-white/35"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && canExpand && (
        <div
          className={`px-2.5 pb-2 border-t ${skill.enabled ? "border-[#6FEC06]/10" : "border-white/[0.03]"}`}
        >
          {/* Functions list */}
          {hasFunctions && (
            <div className="pt-1.5 space-y-0.5">
              {skill.functions!.map((fn) => (
                <div
                  key={fn.id}
                  className="flex items-start gap-1.5 py-0.5 text-[10px]"
                >
                  <span
                    className={`w-1 h-1 rounded-full mt-[5px] shrink-0 ${skill.enabled ? "bg-[#6FEC06]/60" : "bg-white/15"}`}
                  />
                  <span
                    className={
                      skill.enabled ? "text-white/70" : "text-white/50"
                    }
                  >
                    {fn.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* API Key config area */}
          {hasApiKeyConfig && skill.apiKeyConfig && (
            <div
              className={`pt-2 space-y-1.5 ${hasFunctions ? "mt-2 border-t border-white/[0.04]" : ""}`}
            >
              {/* Info text for skills that can auto-setup */}
              {!hasUserApiKey && (
                <p className="text-[10px] text-white/65 leading-relaxed mb-2">
                  Enable this skill and use it to auto-register. Then paste your
                  API key here.
                </p>
              )}
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-white/75 font-medium">
                  {skill.apiKeyConfig.label}
                </label>
                {skill.apiKeyConfig.helpUrl && (
                  <a
                    href={skill.apiKeyConfig.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-[#6FEC06]/60 hover:text-[#6FEC06]"
                  >
                    Get key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    placeholder={
                      skill.apiKeyConfig.placeholder || "Enter API key..."
                    }
                    className="w-full py-1.5 pl-2.5 pr-7 rounded text-[11px] bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-white/50 focus:border-[#6FEC06]/25 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-2.5 h-2.5" />
                    ) : (
                      <Eye className="w-2.5 h-2.5" />
                    )}
                  </button>
                </div>
                <button
                  onClick={handleApiKeySave}
                  disabled={!localApiKey || localApiKey === skill.apiKey}
                  className={`px-2 rounded text-[10px] font-medium ${
                    localApiKey && localApiKey !== skill.apiKey
                      ? "bg-[#6FEC06] text-black"
                      : "bg-white/[0.03] text-white/20 cursor-not-allowed"
                  }`}
                >
                  {skill.apiKey ? <Check className="w-3 h-3" /> : "Save"}
                </button>
              </div>
              {hasUserApiKey && (
                <div className="flex items-center justify-between">
                  <p className="text-[9px] text-[#6FEC06]/70 flex items-center gap-1">
                    <Check className="w-2 h-2" /> API key saved
                  </p>
                  <button
                    onClick={handleApiKeyClear}
                    className="text-[9px] text-red-400/60 hover:text-red-400"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Category icons and labels
const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string }
> = {
  AI: {
    icon: <Sparkles className="w-2.5 h-2.5 text-purple-400/50" />,
    label: "AI",
  },
  CoinGecko: {
    icon: <Zap className="w-2.5 h-2.5 text-amber-400/50" />,
    label: "CoinGecko",
  },
  GeckoTerminal: {
    icon: <Zap className="w-2.5 h-2.5 text-emerald-400/50" />,
    label: "GeckoTerminal",
  },
  Utilities: {
    icon: <Wrench className="w-2.5 h-2.5 text-[#6FEC06]/50" />,
    label: "Utilities",
  },
};

function ToolsTab({
  toolGroups,
  skills,
  onGroupToggle,
  onSkillToggle,
  onApiKeyChange,
  loading,
}: {
  toolGroups: ToolGroup[];
  skills: SkillConfig[];
  onGroupToggle: (groupId: string, enabled: boolean) => void;
  onSkillToggle: (skillId: string, enabled: boolean) => void;
  onApiKeyChange?: (skillId: string, apiKey: string) => void;
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");

  // Memoize filtered and grouped data
  const filteredGroups = useMemo(
    () =>
      toolGroups.filter(
        (group) =>
          group.name.toLowerCase().includes(search.toLowerCase()) ||
          group.functions.some((f) =>
            f.name.toLowerCase().includes(search.toLowerCase()),
          ),
      ),
    [toolGroups, search],
  );

  const filteredSkills = useMemo(
    () =>
      skills.filter(
        (skill) =>
          skill.name.toLowerCase().includes(search.toLowerCase()) ||
          skill.description.toLowerCase().includes(search.toLowerCase()),
      ),
    [skills, search],
  );

  // Group tools by their source/category
  const { groupedTools, orderedCategories } = useMemo(() => {
    const grouped = filteredGroups.reduce<Record<string, ToolGroup[]>>(
      (acc, group) => {
        const category = group.source || "Utilities";
        if (!acc[category]) acc[category] = [];
        acc[category].push(group);
        return acc;
      },
      {},
    );

    // Order categories: AI, CoinGecko, GeckoTerminal, then Utilities
    const categoryOrder = ["AI", "CoinGecko", "GeckoTerminal", "Utilities"];
    const ordered = [
      ...categoryOrder.filter((c) => grouped[c]),
      ...Object.keys(grouped).filter((c) => !categoryOrder.includes(c)),
    ];

    return { groupedTools: grouped, orderedCategories: ordered };
  }, [filteredGroups]);

  const enabledCount = useMemo(
    () =>
      toolGroups.filter((g) => g.enabled).length +
      skills.filter((s) => s.enabled).length,
    [toolGroups, skills],
  );

  if (loading) {
    return (
      <div className="p-2.5 space-y-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-white/[0.04] bg-transparent px-2.5 py-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-white/[0.04] animate-pulse" />
              <div className="flex-1">
                <div className="h-3 w-16 bg-white/[0.04] rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2.5 py-2 border-b border-white/[0.04]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-2.5 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.04] text-[12px] text-white placeholder:text-white/50 focus:border-white/[0.08] focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-3">
        {/* Tool Groups by Category */}
        {orderedCategories.map((category) => {
          const categoryConfig = CATEGORY_CONFIG[category] || {
            icon: <Zap className="w-2.5 h-2.5 text-[#6FEC06]/50" />,
            label: category,
          };
          const groups = groupedTools[category];

          return (
            <div key={category}>
          <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
            {categoryConfig.icon}
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/60">
              {categoryConfig.label}
            </span>
          </div>
              <div className="space-y-1">
                {groups.map((group) => (
                  <ToolGroupCard
                    key={group.id}
                    group={group}
                    onToggle={(enabled) => onGroupToggle(group.id, enabled)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Skills */}
        {filteredSkills.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
              <Sparkles className="w-2.5 h-2.5 text-[#6FEC06]/50" />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-white/60">
                Skills
              </span>
            </div>
            <div className="space-y-1">
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onToggle={(enabled) => onSkillToggle(skill.id, enabled)}
                  onApiKeyChange={
                    onApiKeyChange
                      ? (apiKey) => onApiKeyChange(skill.id, apiKey)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}

        {orderedCategories.length === 0 && filteredSkills.length === 0 && (
          <div className="text-center py-6">
            <Wrench className="w-6 h-6 text-white/20 mx-auto mb-1.5" />
            <p className="text-[11px] text-white/60">No tools found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2.5 py-2 border-t border-white/[0.04]">
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              toolGroups.forEach((g) => onGroupToggle(g.id, true));
              skills
                .filter((s) => !s.requiresApiKey || s.isConfigured || s.apiKey)
                .forEach((s) => onSkillToggle(s.id, true));
            }}
            className="flex-1 py-1.5 rounded-md text-[11px] font-medium bg-[#6FEC06]/10 text-[#6FEC06] hover:bg-[#6FEC06]/15 border border-[#6FEC06]/15"
          >
            Enable All
          </button>
          <button
            onClick={() => {
              toolGroups.forEach((g) => onGroupToggle(g.id, false));
              skills.forEach((s) => onSkillToggle(s.id, false));
            }}
            className="flex-1 py-1.5 rounded-md text-[11px] font-medium bg-white/[0.02] text-white/60 hover:text-white/80 hover:bg-white/[0.05] border border-white/[0.04]"
          >
            Disable All
          </button>
        </div>
        <p className="text-center text-[9px] text-white/60 mt-1.5">
          {enabledCount} tools enabled
        </p>
      </div>
    </div>
  );
}

interface ChatHistoryItem {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  agentId: string | null;
  agent: {
    id: string;
    name: string;
    imageUrl: string | null;
    rarity: string | null;
    tokenSymbol: string | null;
  } | null;
  lastMessage: {
    content: string;
    role: string;
    createdAt: string;
  } | null;
  messageCount: number;
}

const rarityColors: Record<string, string> = {
  legendary: "ring-[#FFD700]",
  epic: "ring-[#A855F7]",
  rare: "ring-[#3B82F6]",
  uncommon: "ring-[#6FEC06]",
  common: "ring-white/20",
};

function HistoryTab({
  currentChatId,
  currentAgentId,
  identityToken,
  onNewChat,
  onSelectChat,
  refreshTrigger = 0,
}: {
  currentChatId?: string;
  currentAgentId?: string;
  identityToken?: string | null;
  onNewChat?: () => void;
  onSelectChat?: (chatId: string, agentId?: string | null) => void;
  refreshTrigger?: number;
}) {
  const [chats, setChats] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch chat history
  const fetchChats = useCallback(async () => {
    if (!identityToken) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set("limit", "50");

      const response = await fetch(`/api/chats?${params.toString()}`, {
        headers: { "privy-id-token": identityToken },
      });

      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    } finally {
      setLoading(false);
    }
  }, [identityToken]);

  // Fetch on mount and when refreshTrigger changes
  useEffect(() => {
    fetchChats();
  }, [fetchChats, refreshTrigger]);

  // Filter chats by search
  const filteredChats = chats.filter((chat) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      chat.title?.toLowerCase().includes(searchLower) ||
      chat.agent?.name.toLowerCase().includes(searchLower) ||
      chat.lastMessage?.content.toLowerCase().includes(searchLower)
    );
  });

  // Group chats by time periods
  const groupedChats = filteredChats.reduce(
    (acc, chat) => {
      const date = new Date(chat.updatedAt);
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
      );

      let group: string;
      if (diffDays === 0) {
        group = "Today";
      } else if (diffDays === 1) {
        group = "Yesterday";
      } else if (diffDays < 7) {
        group = "This Week";
      } else if (diffDays < 30) {
        group = "This Month";
      } else {
        group = "Older";
      }

      if (!acc[group]) acc[group] = [];
      acc[group].push(chat);
      return acc;
    },
    {} as Record<string, ChatHistoryItem[]>,
  );

  // Order time groups properly
  const timeGroupOrder = [
    "Today",
    "Yesterday",
    "This Week",
    "This Month",
    "Older",
  ];
  const orderedGroups = timeGroupOrder.filter(
    (g) => groupedChats[g]?.length > 0,
  );

  const handleDeleteChat = async (chatId: string) => {
    if (!identityToken) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
        headers: { "privy-id-token": identityToken },
      });

      if (response.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (currentChatId === chatId) {
          onNewChat?.();
        }
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  if (!identityToken) {
    return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
          <History className="w-6 h-6 text-white/30" />
        </div>
        <h3 className="text-sm font-medium text-white/85 mb-1">
          Sign in to view history
        </h3>
        <p className="text-xs text-white/65 max-w-[180px]">
          Your conversations will be saved automatically
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with New Chat button */}
      <div className="px-3 py-3 border-b border-white/[0.06]">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6FEC06]/15 to-[#6FEC06]/5 hover:from-[#6FEC06]/25 hover:to-[#6FEC06]/10 text-[#6FEC06] text-xs font-semibold transition-all duration-200 border border-[#6FEC06]/20 hover:border-[#6FEC06]/40 shadow-[0_2px_8px_rgba(111,236,6,0.08)] hover:shadow-[0_4px_12px_rgba(111,236,6,0.15)]"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>

        {/* Search - show when there are multiple chats */}
        {chats.length > 3 && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder:text-white/60 focus:border-[#6FEC06]/30 focus:bg-white/[0.04] focus:outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-white/55 hover:text-white/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-[#6FEC06]/50 animate-spin mb-2" />
            <p className="text-[10px] text-white/40">Loading history...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-white/30" />
            </div>
            <p className="text-sm font-medium text-white/75 mb-1">
              {search ? "No results found" : "No conversations yet"}
            </p>
            <p className="text-xs text-white/60 max-w-[160px]">
              {search
                ? "Try a different search term"
                : "Start chatting to see your history here"}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {orderedGroups.map((group) => (
              <div key={group} className="mb-1">
                {/* Time group label */}
                <div className="px-4 py-2 sticky top-0 bg-[#000015]/95 backdrop-blur-sm z-10">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/65">
                    {group}
                  </span>
                </div>

                {/* Chat items */}
                <div className="px-2">
                  {groupedChats[group].map((chat) => {
                    const isActive = currentChatId === chat.id;
                    const rarityRing =
                      rarityColors[chat.agent?.rarity || "common"];

                    return (
                      <div
                        key={chat.id}
                        className={`group relative rounded-xl mb-0.5 transition-all duration-150 ${
                          isActive
                            ? "bg-[#6FEC06]/[0.08] shadow-[inset_0_0_0_1px_rgba(111,236,6,0.2)]"
                            : "hover:bg-white/[0.03]"
                        }`}
                      >
          <button
            onClick={() => onSelectChat?.(chat.id, chat.agentId)}
            className="w-full text-left px-3 py-2.5 transition-colors"
          >
            <div className="flex items-center gap-3">
                            {/* Agent avatar - larger and more prominent */}
                            <div
                              className={`relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ring-1.5 ${rarityRing} bg-[#0a0520] shadow-sm`}
                            >
                              {chat.agent?.imageUrl ? (
                                <Image
                                  src={chat.agent.imageUrl}
                                  alt={chat.agent.name}
                                  fill
                                  sizes="36px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6FEC06]/10 to-transparent">
                                  <Bot className="w-4 h-4 text-[#6FEC06]/40" />
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pr-6">
                              {/* Title row with time */}
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                              <h4
                                className={`text-[13px] font-medium truncate ${
                                  isActive ? "text-white" : "text-white/90"
                                }`}
                              >
                                {chat.title || chat.agent?.name || "New Chat"}
                              </h4>
                              </div>

                              {/* Last message preview */}
                              <p
                                className={`text-[11px] truncate leading-relaxed ${
                                  isActive ? "text-white/70" : "text-white/60"
                                }`}
                              >
                                {chat.lastMessage ? (
                                  <>
                                    {chat.lastMessage.role === "user" && (
                                      <span className="text-white/75">
                                        You:{" "}
                                      </span>
                                    )}
                                    {chat.lastMessage.content}
                                  </>
                                ) : (
                                  <span className="italic text-white/50">
                                    No messages
                                  </span>
                                )}
                              </p>

                              {/* Timestamp */}
                              <p
                                className={`text-[10px] mt-1 ${isActive ? "text-[#6FEC06]/70" : "text-white/55"}`}
                              >
                                {formatDistanceToNow(new Date(chat.updatedAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Delete button - slides in from right */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150 translate-x-1 group-hover:translate-x-0">
                          {deleteConfirm === chat.id ? (
                            <div className="flex items-center gap-1 bg-[#0a0520]/95 backdrop-blur-sm rounded-lg p-1 border border-white/[0.08] shadow-lg">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteChat(chat.id);
                                }}
                                disabled={deleting}
                                className="px-2 py-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[10px] font-medium transition-colors disabled:opacity-50"
                              >
                                {deleting ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  "Delete"
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm(null);
                                }}
                                className="px-2 py-1 rounded-md text-white/50 hover:bg-white/10 text-[10px] font-medium transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(chat.id);
                              }}
                              className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-white/55 hover:text-red-400 transition-all duration-150"
                              title="Delete conversation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab({
  voiceSettings,
  onVoiceChange,
  onSpeedChange,
  onAutoSpeakChange,
}: {
  voiceSettings?: VoiceSettings;
  onVoiceChange?: (voice: VoiceId) => void;
  onSpeedChange?: (speed: number) => void;
  onAutoSpeakChange?: (autoSpeak: boolean) => void;
}) {
  const settings = voiceSettings || {
    voice: "nova",
    speed: 1.0,
    autoSpeak: false,
  };

  return (
    <div className="flex flex-col h-full px-2.5 py-2 overflow-y-auto">
      {/* Voice Settings Section */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
          <Volume2 className="w-3 h-3 text-[#6FEC06]/70" />
          <h3 className="text-[11px] font-semibold text-white/80">
            Voice Output
          </h3>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-white/70 px-0.5">
            Voice
          </label>
          <div className="grid grid-cols-2 gap-1">
            {VOICE_OPTIONS.map((voice) => (
              <button
                key={voice.id}
                onClick={() => onVoiceChange?.(voice.id)}
                className={`px-2 py-1.5 rounded-md border text-left transition-all duration-150 ${
                  settings.voice === voice.id
                    ? "bg-[#6FEC06]/[0.08] border-[#6FEC06]/20"
                    : "bg-transparent border-white/[0.04] hover:border-white/[0.08]"
                }`}
              >
                <span
                  className={`font-medium text-[11px] block ${
                    settings.voice === voice.id ? "text-white" : "text-white/70"
                  }`}
                >
                  {voice.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Speed Control */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <label className="text-[10px] font-medium text-white/70">
              Speed
            </label>
            <span className="text-[10px] font-mono text-[#6FEC06]/90">
              {settings.speed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={settings.speed}
            onChange={(e) => onSpeedChange?.(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/[0.06] rounded appearance-none cursor-pointer accent-[#6FEC06] [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#6FEC06] [&::-webkit-slider-thumb]:appearance-none"
          />
          <div className="flex justify-between text-[9px] text-white/60 px-0.5">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Auto-speak Toggle */}
        <div className="mt-3 flex items-center justify-between px-2 py-2 rounded-md bg-white/[0.02] border border-white/[0.04]">
          <div>
            <span className="font-medium text-[11px] text-white/85 block">
              Auto-speak
            </span>
            <span className="text-[9px] text-white/65">
              Read responses aloud
            </span>
          </div>
          <button
            onClick={() => onAutoSpeakChange?.(!settings.autoSpeak)}
            className={`relative w-8 h-4.5 rounded-full transition-colors duration-150 ${
              settings.autoSpeak ? "bg-[#6FEC06]" : "bg-white/[0.08]"
            }`}
            style={{ height: "18px" }}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
                settings.autoSpeak ? "translate-x-3.5" : "translate-x-0"
              }`}
              style={{ width: "14px", height: "14px" }}
            />
          </button>
        </div>
      </div>

      {/* Voice Input Settings Section */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2 px-0.5">
          <Mic className="w-3 h-3 text-[#6FEC06]/70" />
          <h3 className="text-[11px] font-semibold text-white/80">
            Voice Input
          </h3>
        </div>

        <div className="px-2 py-2 rounded-md bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[10px] text-white/70 leading-relaxed">
            Click the mic button to record. Speech is transcribed automatically.
          </p>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 px-0.5">
          <Settings className="w-3 h-3 text-[#6FEC06]/70" />
          <h3 className="text-[11px] font-semibold text-white/80">Tips</h3>
        </div>

        <div className="space-y-1.5 text-[10px] text-white/70 px-0.5">
          <p className="flex items-center gap-2">
            <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] font-mono text-[9px] text-white/75">
              Enter
            </kbd>
            <span>Send</span>
          </p>
          <p className="flex items-center gap-2">
            <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] font-mono text-[9px] text-white/75">
              Shift+Enter
            </kbd>
            <span>New line</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  tab,
  isActive,
  onClick,
  badge,
}: {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative p-2.5 rounded-lg transition-all duration-150 ${
        isActive
          ? "bg-[#6FEC06]/15 text-[#6FEC06]"
          : "text-white/55 hover:text-white/75 hover:bg-white/[0.08]"
      }`}
      title={tab.label}
    >
      {tab.icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-[#6FEC06] text-black text-[9px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

interface ToolPanelMobileProps extends ToolPanelProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// Storage key for panel width
const PANEL_WIDTH_STORAGE_KEY = "agentinc_tool_panel_width";
const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 500;
const DEFAULT_PANEL_WIDTH = 288; // w-72

// Helper to get stored panel width
function getStoredPanelWidth(): number {
  if (typeof window === "undefined") return DEFAULT_PANEL_WIDTH;
  try {
    const stored = localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
    if (stored) {
      const width = parseInt(stored, 10);
      if (width >= MIN_PANEL_WIDTH && width <= MAX_PANEL_WIDTH) {
        return width;
      }
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_PANEL_WIDTH;
}

// Helper to save panel width
function savePanelWidth(width: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(width));
  } catch {
    // Ignore errors
  }
}

export function ToolPanel({
  toolGroups,
  skills,
  onGroupToggle,
  onSkillToggle,
  onApiKeyChange,
  collapsed = false,
  onCollapsedChange,
  loading = false,
  mobileOpen = false,
  onMobileClose,
  voiceSettings,
  onVoiceChange,
  onSpeedChange,
  onAutoSpeakChange,
  // Chat history props
  currentChatId,
  currentAgentId,
  identityToken,
  onNewChat,
  onSelectChat,
  historyRefreshTrigger,
}: ToolPanelMobileProps) {
  const [activeTab, setActiveTab] = useState<TabId>("tools");
  const [panelWidth, setPanelWidth] = useState<number>(DEFAULT_PANEL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Load stored width on mount
  useEffect(() => {
    setPanelWidth(getStoredPanelWidth());
  }, []);

  // Handle resize - mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Handle resize - touch events for mobile/tablet
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      // Calculate new width based on mouse position from right edge of viewport
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(
        MAX_PANEL_WIDTH,
        Math.max(MIN_PANEL_WIDTH, newWidth),
      );

      setPanelWidth(clampedWidth);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!panelRef.current || !e.touches[0]) return;

      // Calculate new width based on touch position from right edge of viewport
      const newWidth = window.innerWidth - e.touches[0].clientX;
      const clampedWidth = Math.min(
        MAX_PANEL_WIDTH,
        Math.max(MIN_PANEL_WIDTH, newWidth),
      );

      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      savePanelWidth(panelWidth);
    };

    const handleTouchEnd = () => {
      setIsResizing(false);
      savePanelWidth(panelWidth);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    // Add cursor style to body during resize
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, panelWidth]);

  const enabledCount =
    toolGroups.filter((g) => g.enabled).length +
    skills.filter((s) => s.enabled).length;

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onMobileClose}
      />

      {/* Panel - Desktop: inline, Mobile: fixed overlay */}
      <div
        ref={panelRef}
        style={{ width: collapsed ? 56 : panelWidth }}
        className={`
          h-full border-l border-white/[0.04] bg-[#000015] flex relative
          ${isResizing ? "" : "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"}
          hidden lg:flex
        `}
      >
        {/* Resize Handle */}
        {!collapsed && (
          <div
            ref={resizeHandleRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onDoubleClick={() => {
              setPanelWidth(DEFAULT_PANEL_WIDTH);
              savePanelWidth(DEFAULT_PANEL_WIDTH);
            }}
            className={`
              absolute left-0 top-0 bottom-0 w-3 -ml-1.5 cursor-col-resize z-10
              group transition-colors duration-150 touch-none
            `}
            title="Drag to resize • Double-click to reset"
          >
            {/* Resize bar - visible on hover/resize */}
            <div
              className={`
              absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2
              rounded-full transition-all duration-150
              ${
                isResizing
                  ? "bg-[#6FEC06]/70 shadow-[0_0_8px_rgba(111,236,6,0.4)]"
                  : "bg-transparent group-hover:bg-[#6FEC06]/40"
              }
            `}
            />

            {/* Visual grip indicator - always visible */}
            <div
              className={`
              absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              p-1 rounded-md bg-[#000015]/90 border transition-colors duration-150
              ${isResizing ? "border-[#6FEC06]/30" : "border-white/10 group-hover:border-[#6FEC06]/20"}
            `}
            >
              <GripVertical
                className={`w-3 h-3 transition-colors duration-150 ${isResizing ? "text-[#6FEC06]" : "text-white/55 group-hover:text-white/75"}`}
              />
            </div>

            {/* Width indicator - shows during resize */}
            {isResizing && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[#6FEC06] text-black text-[10px] font-mono font-medium whitespace-nowrap shadow-lg">
                {Math.round(panelWidth)}px
              </div>
            )}
          </div>
        )}
        {/* Vertical Tab Bar - On the left */}
        <div
          className={`w-14 shrink-0 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            collapsed ? "" : "border-r border-white/[0.04]"
          }`}
        >
          {/* Header spacer - matches chat header height */}
          <div className="h-[52px] sm:h-[60px] shrink-0 border-b border-white/[0.04]" />

          {/* Tab buttons */}
          <div className="flex-1 flex flex-col items-center py-3 gap-1">
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (collapsed) {
                    onCollapsedChange?.(false);
                  }
                }}
                badge={tab.id === "tools" ? enabledCount : undefined}
              />
            ))}
          </div>

          {/* Collapse/Expand button at bottom */}
          <div className="p-2 border-t border-white/[0.04]">
            <button
              onClick={() => onCollapsedChange?.(!collapsed)}
              className="p-2.5 rounded-lg text-white/55 hover:text-white/75 hover:bg-white/[0.08] w-full flex items-center justify-center transition-all duration-150"
              title={collapsed ? "Expand panel" : "Collapse panel"}
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${collapsed ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Content Area - Slides in/out */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          }`}
        >
          {/* Tab Header - matches chat header height */}
          <div className="h-[52px] sm:h-[60px] shrink-0 flex items-center px-3 border-b border-white/[0.04]">
            <h2 className="font-medium text-white/90 text-[13px] whitespace-nowrap">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "tools" && (
              <ToolsTab
                toolGroups={toolGroups}
                skills={skills}
                onGroupToggle={onGroupToggle}
                onSkillToggle={onSkillToggle}
                onApiKeyChange={onApiKeyChange}
                loading={loading}
              />
            )}
            {activeTab === "history" && (
              <HistoryTab
                currentChatId={currentChatId}
                currentAgentId={currentAgentId}
                identityToken={identityToken}
                onNewChat={onNewChat}
                onSelectChat={onSelectChat}
                refreshTrigger={historyRefreshTrigger}
              />
            )}
            {activeTab === "settings" && (
              <SettingsTab
                voiceSettings={voiceSettings}
                onVoiceChange={onVoiceChange}
                onSpeedChange={onSpeedChange}
                onAutoSpeakChange={onAutoSpeakChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Panel - Slide in from right */}
      <div
        className={`
          fixed top-0 right-0 z-50 h-full w-[85%] max-w-[300px] border-l border-white/[0.04] bg-[#000015] flex flex-col
          transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden
          ${mobileOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.04]">
          <h2 className="font-medium text-white/90 text-sm">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h2>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex items-center gap-1 p-2 border-b border-white/[0.04]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-[#6FEC06]/15 text-[#6FEC06]"
                  : "text-white/60 hover:text-white/80 hover:bg-white/[0.08]"
              }`}
            >
              <span className="[&>svg]:w-4 [&>svg]:h-4">{tab.icon}</span>
              <span className="hidden xs:inline">{tab.label}</span>
              {tab.id === "tools" && enabledCount > 0 && (
                <span className="min-w-[16px] h-[16px] px-0.5 rounded-full bg-[#6FEC06] text-black text-[9px] font-bold flex items-center justify-center">
                  {enabledCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "tools" && (
            <ToolsTab
              toolGroups={toolGroups}
              skills={skills}
              onGroupToggle={onGroupToggle}
              onSkillToggle={onSkillToggle}
              onApiKeyChange={onApiKeyChange}
              loading={loading}
            />
          )}
          {activeTab === "history" && (
            <HistoryTab
              currentChatId={currentChatId}
              currentAgentId={currentAgentId}
              identityToken={identityToken}
              onNewChat={onNewChat}
              onSelectChat={onSelectChat}
              refreshTrigger={historyRefreshTrigger}
            />
          )}
          {activeTab === "settings" && (
            <SettingsTab
              voiceSettings={voiceSettings}
              onVoiceChange={onVoiceChange}
              onSpeedChange={onSpeedChange}
              onAutoSpeakChange={onAutoSpeakChange}
            />
          )}
        </div>
      </div>
    </>
  );
}
