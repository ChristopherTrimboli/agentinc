"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";

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
}

function ToolGroupCard({
  group,
  onToggle,
}: {
  group: ToolGroup;
  onToggle: (enabled: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border transition-all duration-150 ${
        group.enabled
          ? "bg-[#6FEC06]/[0.06] border-[#6FEC06]/20"
          : "bg-transparent border-white/[0.04] hover:border-white/[0.08]"
      }`}
    >
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        {/* Icon */}
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 ${
            group.enabled ? "bg-[#6FEC06]/20" : "bg-white/[0.04]"
          }`}
        >
          {group.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span
            className={`font-medium text-[13px] leading-tight truncate block ${group.enabled ? "text-white" : "text-white/60"}`}
          >
            {group.name}
          </span>
        </div>

        {/* Count + Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-[10px] tabular-nums min-w-[12px] text-right ${group.enabled ? "text-white/40" : "text-white/25"}`}
          >
            {group.functions.length}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-white/[0.04] text-white/25 hover:text-white/40"
          >
            <ChevronRight
              className={`w-3 h-3 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
            />
          </button>
          <button
            onClick={() => onToggle(!group.enabled)}
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
                  className={group.enabled ? "text-white/50" : "text-white/30"}
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
}

function SkillCard({
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

  const needsApiKey = skill.requiresApiKey && !skill.isConfigured;
  const hasUserApiKey = !!skill.apiKey;

  const handleApiKeySave = () => {
    if (onApiKeyChange) {
      onApiKeyChange(localApiKey);
    }
  };

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
            className={`font-medium text-[13px] leading-tight truncate block ${skill.enabled ? "text-white" : "text-white/60"}`}
          >
            {skill.name}
          </span>
        </div>

        {/* Status + Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {needsApiKey && !hasUserApiKey && (
            <Key className="w-3 h-3 text-amber-400/60" />
          )}
          {needsApiKey && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-white/[0.04] text-white/25 hover:text-white/40"
            >
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
              />
            </button>
          )}
          <button
            onClick={() => onToggle(!skill.enabled)}
            disabled={needsApiKey && !hasUserApiKey}
            className={`p-1 rounded transition-colors ${
              skill.enabled
                ? "text-[#6FEC06]"
                : needsApiKey && !hasUserApiKey
                  ? "text-white/10 cursor-not-allowed"
                  : "text-white/20 hover:text-white/35"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && needsApiKey && (
        <div
          className={`px-2.5 pb-2 border-t ${skill.enabled ? "border-[#6FEC06]/10" : "border-white/[0.03]"}`}
        >
          <div className="pt-2 space-y-1.5">
            {skill.apiKeyConfig && (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-white/50 font-medium">
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
                      className="w-full py-1.5 pl-2.5 pr-7 rounded text-[11px] bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-white/20 focus:border-[#6FEC06]/25 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/40"
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
                  <p className="text-[9px] text-[#6FEC06]/50 flex items-center gap-1">
                    <Check className="w-2 h-2" /> Saved
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

  const filteredGroups = toolGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(search.toLowerCase()) ||
      group.functions.some((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  const filteredSkills = skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description.toLowerCase().includes(search.toLowerCase()),
  );

  // Group tools by their source/category
  const groupedTools = filteredGroups.reduce<Record<string, ToolGroup[]>>(
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
  const orderedCategories = [
    ...categoryOrder.filter((c) => groupedTools[c]),
    ...Object.keys(groupedTools).filter((c) => !categoryOrder.includes(c)),
  ];

  const enabledCount =
    toolGroups.filter((g) => g.enabled).length +
    skills.filter((s) => s.enabled).length;

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
            className="w-full pl-8 pr-2.5 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.04] text-[12px] text-white placeholder:text-white/20 focus:border-white/[0.08] focus:outline-none"
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
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30">
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
              <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30">
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
            <Wrench className="w-6 h-6 text-white/10 mx-auto mb-1.5" />
            <p className="text-[11px] text-white/30">No tools found</p>
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
            className="flex-1 py-1.5 rounded-md text-[11px] font-medium bg-white/[0.02] text-white/40 hover:text-white/60 border border-white/[0.04]"
          >
            Disable All
          </button>
        </div>
        <p className="text-center text-[9px] text-white/20 mt-1.5">
          {enabledCount} tools enabled
        </p>
      </div>
    </div>
  );
}

function HistoryTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <History className="w-7 h-7 text-white/10 mb-2" />
      <h3 className="text-[12px] font-medium text-white/50 mb-0.5">
        Chat History
      </h3>
      <p className="text-[10px] text-white/30">
        Conversation history will appear here.
      </p>
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
          <h3 className="text-[11px] font-semibold text-white/70">
            Voice Output
          </h3>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-white/40 px-0.5">
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
                    settings.voice === voice.id ? "text-white" : "text-white/50"
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
            <label className="text-[10px] font-medium text-white/40">
              Speed
            </label>
            <span className="text-[10px] font-mono text-[#6FEC06]/80">
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
          <div className="flex justify-between text-[9px] text-white/20 px-0.5">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Auto-speak Toggle */}
        <div className="mt-3 flex items-center justify-between px-2 py-2 rounded-md bg-white/[0.02] border border-white/[0.04]">
          <div>
            <span className="font-medium text-[11px] text-white/60 block">
              Auto-speak
            </span>
            <span className="text-[9px] text-white/30">
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
          <h3 className="text-[11px] font-semibold text-white/70">
            Voice Input
          </h3>
        </div>

        <div className="px-2 py-2 rounded-md bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[10px] text-white/40 leading-relaxed">
            Click the mic button to record. Speech is transcribed automatically.
          </p>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 px-0.5">
          <Settings className="w-3 h-3 text-[#6FEC06]/70" />
          <h3 className="text-[11px] font-semibold text-white/70">Tips</h3>
        </div>

        <div className="space-y-1.5 text-[10px] text-white/40 px-0.5">
          <p className="flex items-center gap-2">
            <kbd className="px-1 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] font-mono text-[9px]">
              Enter
            </kbd>
            <span>Send</span>
          </p>
          <p className="flex items-center gap-2">
            <kbd className="px-1 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] font-mono text-[9px]">
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
          : "text-white/30 hover:text-white/50 hover:bg-white/5"
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
                className={`w-3 h-3 transition-colors duration-150 ${isResizing ? "text-[#6FEC06]" : "text-white/30 group-hover:text-white/50"}`}
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
              className="p-2.5 rounded-lg text-white/30 hover:text-white/50 hover:bg-white/5 w-full flex items-center justify-center transition-all duration-150"
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
            <h2 className="font-medium text-white/80 text-[13px] whitespace-nowrap">
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
            {activeTab === "history" && <HistoryTab />}
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
          <h2 className="font-medium text-white/80 text-sm">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h2>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5"
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
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
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
          {activeTab === "history" && <HistoryTab />}
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
