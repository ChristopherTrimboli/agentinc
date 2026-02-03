"use client";

import { useState } from "react";
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
      className={`rounded-xl border transition-all duration-200 ${
        group.enabled
          ? "bg-[#6FEC06]/10 border-[#6FEC06]/30"
          : "bg-white/[0.02] border-white/[0.06] hover:border-white/10"
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
            group.enabled ? "bg-[#6FEC06]/25" : "bg-white/5"
          }`}
        >
          {group.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span
            className={`font-medium text-sm block ${group.enabled ? "text-white" : "text-white/70"}`}
          >
            {group.name}
          </span>
          <p
            className={`text-[11px] truncate ${group.enabled ? "text-white/50" : "text-white/40"}`}
          >
            {group.functions.length} functions
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/50"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => onToggle(!group.enabled)}
            className={`p-1.5 rounded-lg transition-colors ${
              group.enabled
                ? "bg-[#6FEC06] text-black"
                : "bg-white/5 text-white/30 hover:text-white/50"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className={`px-3 pb-3 border-t ${group.enabled ? "border-[#6FEC06]/15" : "border-white/[0.04]"}`}
        >
          <div className="pt-2 space-y-1">
            {group.functions.map((fn) => (
              <div
                key={fn.id}
                className="flex items-start gap-2 py-1 text-[11px]"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${group.enabled ? "bg-[#6FEC06]" : "bg-white/20"}`}
                />
                <div className="min-w-0">
                  <span
                    className={
                      group.enabled ? "text-white/80" : "text-white/40"
                    }
                  >
                    {fn.name}
                  </span>
                  <span
                    className={
                      group.enabled
                        ? "text-white/40 ml-1"
                        : "text-white/25 ml-1"
                    }
                  >
                    — {fn.description}
                  </span>
                </div>
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
      className={`rounded-xl border transition-all duration-200 ${
        skill.enabled
          ? "bg-[#6FEC06]/10 border-[#6FEC06]/30"
          : "bg-white/[0.02] border-white/[0.06] hover:border-white/10"
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
            skill.enabled ? "bg-[#6FEC06]/25" : "bg-white/5"
          }`}
        >
          {skill.icon || "⚡"}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span
            className={`font-medium text-sm block ${skill.enabled ? "text-white" : "text-white/70"}`}
          >
            {skill.name}
          </span>
          {needsApiKey && !hasUserApiKey ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/80">
              <Key className="w-2.5 h-2.5" />
              API key required
            </span>
          ) : (
            <p
              className={`text-[11px] truncate ${skill.enabled ? "text-white/50" : "text-white/40"}`}
            >
              {skill.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {needsApiKey && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/50"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          )}
          <button
            onClick={() => onToggle(!skill.enabled)}
            disabled={needsApiKey && !hasUserApiKey}
            className={`p-1.5 rounded-lg transition-colors ${
              skill.enabled
                ? "bg-[#6FEC06] text-black"
                : needsApiKey && !hasUserApiKey
                  ? "bg-white/[0.02] text-white/15 cursor-not-allowed"
                  : "bg-white/5 text-white/30 hover:text-white/50"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && needsApiKey && (
        <div
          className={`px-3 pb-3 border-t ${skill.enabled ? "border-[#6FEC06]/15" : "border-white/[0.04]"}`}
        >
          <div className="pt-2 space-y-2">
            {skill.apiKeyConfig && (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-white/60 font-medium">
                    {skill.apiKeyConfig.label}
                  </label>
                  {skill.apiKeyConfig.helpUrl && (
                    <a
                      href={skill.apiKeyConfig.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-[#6FEC06]/70 hover:text-[#6FEC06]"
                    >
                      Get key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={localApiKey}
                      onChange={(e) => setLocalApiKey(e.target.value)}
                      placeholder={
                        skill.apiKeyConfig.placeholder || "Enter API key..."
                      }
                      className="w-full py-2 pl-3 pr-8 rounded-lg text-xs bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-white/20 focus:border-[#6FEC06]/30 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={handleApiKeySave}
                    disabled={!localApiKey || localApiKey === skill.apiKey}
                    className={`px-2.5 rounded-lg text-xs font-medium ${
                      localApiKey && localApiKey !== skill.apiKey
                        ? "bg-[#6FEC06] text-black"
                        : "bg-white/[0.03] text-white/25 cursor-not-allowed"
                    }`}
                  >
                    {skill.apiKey ? <Check className="w-3.5 h-3.5" /> : "Save"}
                  </button>
                </div>
                {hasUserApiKey && (
                  <p className="text-[10px] text-[#6FEC06]/60 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Saved locally
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
    icon: <Sparkles className="w-3 h-3 text-purple-400/60" />,
    label: "AI",
  },
  Crypto: {
    icon: <Zap className="w-3 h-3 text-amber-400/60" />,
    label: "Crypto",
  },
  Utilities: {
    icon: <Wrench className="w-3 h-3 text-[#6FEC06]/60" />,
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

  // Order categories: AI, Crypto, then Utilities
  const categoryOrder = ["AI", "Crypto", "Utilities"];
  const orderedCategories = [
    ...categoryOrder.filter((c) => groupedTools[c]),
    ...Object.keys(groupedTools).filter((c) => !categoryOrder.includes(c)),
  ];

  const enabledCount =
    toolGroups.filter((g) => g.enabled).length +
    skills.filter((s) => s.enabled).length;

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-20 bg-white/5 rounded animate-pulse" />
                <div className="h-2.5 w-28 bg-white/[0.03] rounded animate-pulse" />
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
      <div className="p-3 border-b border-white/[0.06]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder:text-white/25 focus:border-[#6FEC06]/30 focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Tool Groups by Category */}
        {orderedCategories.map((category) => {
          const categoryConfig = CATEGORY_CONFIG[category] || {
            icon: <Zap className="w-3 h-3 text-[#6FEC06]/60" />,
            label: category,
          };
          const groups = groupedTools[category];

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2 px-1">
                {categoryConfig.icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  {categoryConfig.label}
                </span>
              </div>
              <div className="space-y-2">
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
            <div className="flex items-center gap-2 mb-2 px-1">
              <Sparkles className="w-3 h-3 text-[#6FEC06]/60" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                Skills
              </span>
            </div>
            <div className="space-y-2">
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
          <div className="text-center py-8">
            <Wrench className="w-8 h-8 text-white/15 mx-auto mb-2" />
            <p className="text-xs text-white/35">No tools found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <button
            onClick={() => {
              toolGroups.forEach((g) => onGroupToggle(g.id, true));
              skills
                .filter((s) => !s.requiresApiKey || s.isConfigured || s.apiKey)
                .forEach((s) => onSkillToggle(s.id, true));
            }}
            className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#6FEC06]/10 text-[#6FEC06] hover:bg-[#6FEC06]/15 border border-[#6FEC06]/20"
          >
            Enable All
          </button>
          <button
            onClick={() => {
              toolGroups.forEach((g) => onGroupToggle(g.id, false));
              skills.forEach((s) => onSkillToggle(s.id, false));
            }}
            className="flex-1 py-2 rounded-lg text-xs font-medium bg-white/[0.03] text-white/50 hover:text-white/70 border border-white/[0.06]"
          >
            Disable All
          </button>
        </div>
        <p className="text-center text-[10px] text-white/25 mt-2">
          {enabledCount} tools enabled
        </p>
      </div>
    </div>
  );
}

function HistoryTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <History className="w-10 h-10 text-white/15 mb-3" />
      <h3 className="text-sm font-medium text-white/60 mb-1">Chat History</h3>
      <p className="text-xs text-white/35">
        Your conversation history will appear here.
      </p>
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <Settings className="w-10 h-10 text-white/15 mb-3" />
      <h3 className="text-sm font-medium text-white/60 mb-1">Settings</h3>
      <p className="text-xs text-white/35">Chat settings coming soon.</p>
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
      className={`relative p-2.5 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-[#6FEC06]/15 text-[#6FEC06]"
          : "text-white/30 hover:text-white/50 hover:bg-white/5"
      }`}
      title={tab.label}
    >
      {tab.icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#6FEC06] text-black text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(111,236,6,0.4)]">
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
}: ToolPanelMobileProps) {
  const [activeTab, setActiveTab] = useState<TabId>("tools");

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
        className={`
          h-full border-l border-white/[0.06] bg-[#000015] flex transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${collapsed ? "w-14" : "w-80"}
          hidden lg:flex
        `}
      >
        {/* Vertical Tab Bar - On the left */}
        <div
          className={`w-14 shrink-0 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            collapsed ? "" : "border-r border-white/[0.06]"
          }`}
        >
          {/* Header spacer - matches chat header height */}
          <div className="h-[52px] sm:h-[60px] shrink-0 border-b border-white/[0.06]" />

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
          <div className="p-2 border-t border-white/[0.06]">
            <button
              onClick={() => onCollapsedChange?.(!collapsed)}
              className="p-2.5 rounded-lg text-white/30 hover:text-white/50 hover:bg-white/5 w-full flex items-center justify-center transition-all duration-200"
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
          <div className="h-[52px] sm:h-[60px] shrink-0 flex items-center px-4 border-b border-white/[0.06]">
            <h2 className="font-semibold text-white text-sm whitespace-nowrap">
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
            {activeTab === "settings" && <SettingsTab />}
          </div>
        </div>
      </div>

      {/* Mobile Panel - Slide in from right */}
      <div
        className={`
          fixed top-0 right-0 z-50 h-full w-[85%] max-w-[320px] border-l border-white/[0.06] bg-[#000015] flex flex-col
          transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden
          ${mobileOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
          <h2 className="font-semibold text-white text-sm">
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
        <div className="flex items-center gap-1 p-2 border-b border-white/[0.06]">
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
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#6FEC06] text-black text-[10px] font-bold flex items-center justify-center">
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
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </div>
    </>
  );
}
