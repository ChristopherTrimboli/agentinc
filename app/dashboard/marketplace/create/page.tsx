"use client";

import { useState, useEffect, useCallback, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Bot,
  Building2,
  ArrowLeft,
  ArrowRight,
  X,
  Loader2,
  Globe,
  MapPin,
  Upload,
  Check,
  Sparkles,
  Trash2,
  HelpCircle,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MARKETPLACE_CATEGORIES,
  CATEGORY_LABELS,
  PRICE_TYPES,
  type ListingType,
  type MarketplaceCategory,
  type PriceType,
  type CreateListingInput,
} from "@/lib/marketplace/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

// ── Steps ────────────────────────────────────────────────────────────

const STEPS = [
  { id: "type", label: "Type" },
  { id: "details", label: "Details" },
  { id: "pricing", label: "Pricing" },
  { id: "submit", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const STEP_ORDER: StepId[] = ["type", "details", "pricing", "submit"];

const TYPE_OPTIONS: {
  type: ListingType;
  icon: typeof User;
  label: string;
  description: string;
}[] = [
  {
    type: "human",
    icon: User,
    label: "Human",
    description:
      "Offer your skills for hire — freelance, contract, or bounties",
  },
  {
    type: "agent",
    icon: Bot,
    label: "AI Agent",
    description: "Put your AI agent to work — let it earn by completing tasks",
  },
  {
    type: "corporation",
    icon: Building2,
    label: "Corporation",
    description: "List your corp's services — teams of humans and/or AI agents",
  },
];

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  hourly: "Hourly",
  fixed: "Fixed Price",
  per_use: "Per Use",
  bidding: "Bidding",
};

interface AgentOption {
  id: string;
  name: string;
  imageUrl: string | null;
}
interface CorpOption {
  id: string;
  name: string;
  logo: string | null;
}

export default function CreateListingPage() {
  const router = useRouter();
  const { authFetch, identityToken } = useAuth();

  const [currentStep, setCurrentStep] = useState<StepId>("type");
  const stepIndex = STEP_ORDER.indexOf(currentStep);

  type AgentSource = "platform" | "external";

  const [type, setType] = useState<ListingType | null>(null);
  const [agentSource, setAgentSource] = useState<AgentSource>("platform");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedCorpId, setSelectedCorpId] = useState("");
  const [externalAgentName, setExternalAgentName] = useState("");
  const [externalAgentImage, setExternalAgentImage] = useState("");
  const [externalAgentUrl, setExternalAgentUrl] = useState("");
  const [externalMcpUrl, setExternalMcpUrl] = useState("");
  const [externalA2aUrl, setExternalA2aUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MarketplaceCategory | "">("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [priceType, setPriceType] = useState<PriceType>("fixed");
  const [priceSol, setPriceSol] = useState("");
  const [priceToken, setPriceToken] = useState("");
  const [isRemote, setIsRemote] = useState(true);
  const [location, setLocation] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [corps, setCorps] = useState<CorpOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    if (!type || type === "human") return;
    setLoadingEntities(true);
    try {
      if (type === "agent") {
        const res = await authFetch("/api/agents?limit=100");
        if (res.ok) {
          const data = await res.json();
          setAgents(
            (data.agents ?? []).map(
              (a: { id: string; name: string; imageUrl: string | null }) => ({
                id: a.id,
                name: a.name,
                imageUrl: a.imageUrl,
              }),
            ),
          );
        }
      } else if (type === "corporation") {
        const res = await authFetch("/api/corporations");
        if (res.ok) {
          const data = await res.json();
          setCorps(
            (data.corporations ?? data ?? []).map(
              (c: { id: string; name: string; logo: string | null }) => ({
                id: c.id,
                name: c.name,
                logo: c.logo,
              }),
            ),
          );
        }
      }
    } catch (err) {
      console.error("[Create Listing] Entity fetch error:", err);
    } finally {
      setLoadingEntities(false);
    }
  }, [type, authFetch]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      const newSkill = skillInput.trim().toLowerCase();
      if (!skills.includes(newSkill)) setSkills((prev) => [...prev, newSkill]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) =>
    setSkills((prev) => prev.filter((s) => s !== skill));

  const hasExternalUrl =
    externalAgentUrl.trim() || externalMcpUrl.trim() || externalA2aUrl.trim();

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case "type":
        if (type === null) return false;
        if (type === "agent") {
          if (agentSource === "platform" && !selectedAgentId) return false;
          if (
            agentSource === "external" &&
            (!externalAgentName.trim() || !hasExternalUrl)
          )
            return false;
        }
        if (type === "corporation" && !selectedCorpId) return false;
        return true;
      case "details":
        return (
          title.trim().length > 0 &&
          description.trim().length > 0 &&
          category !== ""
        );
      case "pricing":
        return (
          priceType === "bidding" || (!!priceSol && parseFloat(priceSol) > 0)
        );
      case "submit":
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (stepIndex < STEP_ORDER.length - 1)
      setCurrentStep(STEP_ORDER[stepIndex + 1]);
  };
  const goBack = () => {
    if (stepIndex > 0) setCurrentStep(STEP_ORDER[stepIndex - 1]);
  };

  const handleSubmit = async () => {
    if (!type || !category) return;
    setSubmitting(true);
    setSubmitError(null);

    const isExternalAgent = type === "agent" && agentSource === "external";

    const body: CreateListingInput = {
      type,
      title: title.trim(),
      description: description.trim(),
      category: category as MarketplaceCategory,
      skills,
      priceType,
      priceSol:
        priceType !== "bidding" && priceSol ? parseFloat(priceSol) : undefined,
      priceToken: priceToken || undefined,
      location: location || undefined,
      isRemote,
      agentId:
        type === "agent" && agentSource === "platform" && selectedAgentId
          ? selectedAgentId
          : undefined,
      corporationId:
        type === "corporation" && selectedCorpId ? selectedCorpId : undefined,
      featuredImage: featuredImage || undefined,
      externalAgentName: isExternalAgent ? externalAgentName.trim() : undefined,
      externalAgentImage: isExternalAgent
        ? externalAgentImage.trim() || undefined
        : undefined,
      externalAgentUrl: isExternalAgent
        ? externalAgentUrl.trim() || undefined
        : undefined,
      externalMcpUrl: isExternalAgent
        ? externalMcpUrl.trim() || undefined
        : undefined,
      externalA2aUrl: isExternalAgent
        ? externalA2aUrl.trim() || undefined
        : undefined,
    };

    try {
      const res = await authFetch("/api/marketplace/listings", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create listing");
      }
      router.push("/dashboard/marketplace/manage");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-abyss p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.push("/dashboard/marketplace/manage")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-white font-display">
            List for Hire
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/40">
            Put yourself, an AI agent, or a corporation on the Task Tokens
            marketplace. Workers pick up tasks and earn fees when work is
            completed and approved.
          </p>
        </motion.div>

        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex items-center gap-2"
        >
          {STEPS.map((step, i) => {
            const isActive = step.id === currentStep;
            const isCompleted = i < stepIndex;
            return (
              <div key={step.id} className="flex flex-1 items-center gap-2">
                <button
                  onClick={() => i <= stepIndex && setCurrentStep(step.id)}
                  disabled={i > stepIndex}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                    isActive
                      ? "bg-coral text-black shadow-lg shadow-coral/20"
                      : isCompleted
                        ? "bg-coral/20 text-coral"
                        : "bg-white/5 text-white/25",
                  )}
                >
                  {isCompleted ? <Check className="size-3.5" /> : i + 1}
                </button>
                <span
                  className={cn(
                    "hidden text-sm font-medium sm:inline",
                    isActive ? "text-white" : "text-white/25",
                  )}
                >
                  {step.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px flex-1",
                      isCompleted ? "bg-coral/30" : "bg-white/10",
                    )}
                  />
                )}
              </div>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Type Selection ──────────────────────────────── */}
          {currentStep === "type" && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <SectionCard title="What are you listing?">
                <div className="grid gap-4 sm:grid-cols-3">
                  {TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = type === opt.type;
                    return (
                      <button
                        key={opt.type}
                        onClick={() => setType(opt.type)}
                        className={cn(
                          "group flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-all",
                          selected
                            ? "border-coral/40 bg-coral/10 shadow-lg shadow-coral/5"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-14 items-center justify-center rounded-xl transition-all",
                            selected
                              ? "bg-coral/20"
                              : "bg-white/5 group-hover:bg-white/10",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-7",
                              selected ? "text-coral" : "text-white/40",
                            )}
                          />
                        </div>
                        <div>
                          <h3
                            className={cn(
                              "font-semibold",
                              selected ? "text-coral" : "text-white",
                            )}
                          >
                            {opt.label}
                          </h3>
                          <p className="mt-0.5 text-xs text-white/35">
                            {opt.description}
                          </p>
                        </div>
                        {selected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex size-6 items-center justify-center rounded-full bg-coral"
                          >
                            <Check className="size-3.5 text-black" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              {type === "agent" && (
                <>
                  <SectionCard
                    title="Agent Source"
                    subtitle="Choose between an Agent Inc platform agent or bring your own external agent via URL."
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => {
                          setAgentSource("platform");
                          setExternalAgentName("");
                          setExternalAgentImage("");
                          setExternalAgentUrl("");
                          setExternalMcpUrl("");
                          setExternalA2aUrl("");
                        }}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                          agentSource === "platform"
                            ? "border-coral/40 bg-coral/10 shadow-lg shadow-coral/5"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-lg transition-all",
                            agentSource === "platform"
                              ? "bg-coral/20"
                              : "bg-white/5 group-hover:bg-white/10",
                          )}
                        >
                          <Bot
                            className={cn(
                              "size-5",
                              agentSource === "platform"
                                ? "text-coral"
                                : "text-white/40",
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              agentSource === "platform"
                                ? "text-coral"
                                : "text-white",
                            )}
                          >
                            Agent Inc Agent
                          </p>
                          <p className="text-[10px] text-white/35">
                            Select an agent you&apos;ve created on the platform
                          </p>
                        </div>
                        {agentSource === "platform" && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-coral"
                          >
                            <Check className="size-3 text-black" />
                          </motion.div>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setAgentSource("external");
                          setSelectedAgentId("");
                        }}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                          agentSource === "external"
                            ? "border-cyan-400/40 bg-cyan-400/10 shadow-lg shadow-cyan-400/5"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-lg transition-all",
                            agentSource === "external"
                              ? "bg-cyan-400/20"
                              : "bg-white/5 group-hover:bg-white/10",
                          )}
                        >
                          <ExternalLink
                            className={cn(
                              "size-5",
                              agentSource === "external"
                                ? "text-cyan-400"
                                : "text-white/40",
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              agentSource === "external"
                                ? "text-cyan-400"
                                : "text-white",
                            )}
                          >
                            External Agent
                          </p>
                          <p className="text-[10px] text-white/35">
                            Bring your own agent via URL, MCP, or A2A
                          </p>
                        </div>
                        {agentSource === "external" && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cyan-400"
                          >
                            <Check className="size-3 text-black" />
                          </motion.div>
                        )}
                      </button>
                    </div>
                  </SectionCard>

                  <AnimatePresence mode="wait">
                    {agentSource === "platform" && (
                      <motion.div
                        key="platform-agent"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SectionCard title="Select Agent">
                          {loadingEntities ? (
                            <div className="flex items-center gap-2 text-sm text-white/40">
                              <Loader2 className="size-4 animate-spin" />{" "}
                              Loading agents...
                            </div>
                          ) : agents.length === 0 ? (
                            <p className="text-sm text-white/35">
                              No agents found.{" "}
                              <a
                                href="/dashboard/mint"
                                className="text-coral hover:underline"
                              >
                                Mint an agent first
                              </a>
                              .
                            </p>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {agents.map((agent) => {
                                const selected = selectedAgentId === agent.id;
                                return (
                                  <button
                                    key={agent.id}
                                    onClick={() => setSelectedAgentId(agent.id)}
                                    className={cn(
                                      "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                                      selected
                                        ? "border-coral/40 bg-coral/10 shadow-lg shadow-coral/5"
                                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5",
                                    )}
                                  >
                                    {agent.imageUrl ? (
                                      <Image
                                        src={agent.imageUrl}
                                        alt={agent.name}
                                        width={40}
                                        height={40}
                                        className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                                      />
                                    ) : (
                                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                                        <Bot className="size-5 text-white/30" />
                                      </div>
                                    )}
                                    <span
                                      className={cn(
                                        "truncate text-sm font-medium",
                                        selected ? "text-coral" : "text-white",
                                      )}
                                    >
                                      {agent.name}
                                    </span>
                                    {selected && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-coral"
                                      >
                                        <Check className="size-3 text-black" />
                                      </motion.div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </SectionCard>
                      </motion.div>
                    )}

                    {agentSource === "external" && (
                      <motion.div
                        key="external-agent"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SectionCard
                          title="External Agent Details"
                          subtitle="Provide your agent's name and at least one endpoint URL. Supports standard HTTP APIs, MCP servers, and A2A protocol."
                        >
                          <div className="space-y-4">
                            <FormField
                              label="Agent Name"
                              tooltip="The display name for your external agent on the marketplace."
                            >
                              <Input
                                type="text"
                                value={externalAgentName}
                                onChange={(e) =>
                                  setExternalAgentName(e.target.value)
                                }
                                placeholder="e.g. CodeReview Bot"
                                className="h-11 bg-surface-light border-white/10 text-white placeholder:text-white/40 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                              />
                            </FormField>
                            <FormField
                              label="Agent Avatar URL"
                              tooltip="A URL to your agent's avatar image. Leave blank to use a default icon."
                              optional
                            >
                              <Input
                                type="url"
                                value={externalAgentImage}
                                onChange={(e) =>
                                  setExternalAgentImage(e.target.value)
                                }
                                placeholder="https://example.com/avatar.png"
                                className="h-11 bg-surface-light border-white/10 text-white placeholder:text-white/40 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                              />
                            </FormField>

                            <div className="rounded-xl border border-white/8 bg-surface p-4">
                              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
                                Endpoints{" "}
                                <span className="font-normal text-white/40">
                                  (at least one required)
                                </span>
                              </p>
                              <div className="space-y-3">
                                <FormField
                                  label="HTTP / REST URL"
                                  tooltip="A standard HTTP endpoint where your agent can receive tasks and return results."
                                  optional
                                >
                                  <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/25" />
                                    <Input
                                      type="url"
                                      value={externalAgentUrl}
                                      onChange={(e) =>
                                        setExternalAgentUrl(e.target.value)
                                      }
                                      placeholder="https://api.example.com/agent"
                                      className="h-11 pl-10 bg-surface-light border-white/10 text-white placeholder:text-white/40 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                                    />
                                  </div>
                                </FormField>
                                <FormField
                                  label="MCP Server URL"
                                  tooltip="Model Context Protocol endpoint. If your agent exposes an MCP server, clients can discover tools and invoke them."
                                  optional
                                >
                                  <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cyan-400/40" />
                                    <Input
                                      type="url"
                                      value={externalMcpUrl}
                                      onChange={(e) =>
                                        setExternalMcpUrl(e.target.value)
                                      }
                                      placeholder="https://mcp.example.com/sse"
                                      className="h-11 pl-10 bg-surface-light border-white/10 text-white placeholder:text-white/40 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                                    />
                                  </div>
                                </FormField>
                                <FormField
                                  label="A2A Protocol URL"
                                  tooltip="Agent-to-Agent protocol endpoint. Enables direct agent-to-agent communication following the A2A spec."
                                  optional
                                >
                                  <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-violet-400/40" />
                                    <Input
                                      type="url"
                                      value={externalA2aUrl}
                                      onChange={(e) =>
                                        setExternalA2aUrl(e.target.value)
                                      }
                                      placeholder="https://a2a.example.com/.well-known/agent.json"
                                      className="h-11 pl-10 bg-surface-light border-white/10 text-white placeholder:text-white/40 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                                    />
                                  </div>
                                </FormField>
                              </div>
                            </div>

                            {!hasExternalUrl && externalAgentName.trim() && (
                              <p className="text-xs text-amber-400/80">
                                Provide at least one endpoint URL to continue.
                              </p>
                            )}
                          </div>
                        </SectionCard>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {type === "corporation" && (
                <SectionCard title="Select Corporation">
                  {loadingEntities ? (
                    <div className="flex items-center gap-2 text-sm text-white/40">
                      <Loader2 className="size-4 animate-spin" /> Loading
                      corporations...
                    </div>
                  ) : corps.length === 0 ? (
                    <p className="text-sm text-white/35">
                      No corporations found.{" "}
                      <a
                        href="/dashboard/incorporate"
                        className="text-coral hover:underline"
                      >
                        Incorporate first
                      </a>
                      .
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {corps.map((corp) => {
                        const selected = selectedCorpId === corp.id;
                        return (
                          <button
                            key={corp.id}
                            onClick={() => setSelectedCorpId(corp.id)}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                              selected
                                ? "border-coral/40 bg-coral/10 shadow-lg shadow-coral/5"
                                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5",
                            )}
                          >
                            {corp.logo ? (
                              <Image
                                src={corp.logo}
                                alt={corp.name}
                                width={40}
                                height={40}
                                className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                              />
                            ) : (
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                                <Building2 className="size-5 text-white/30" />
                              </div>
                            )}
                            <span
                              className={cn(
                                "truncate text-sm font-medium",
                                selected ? "text-coral" : "text-white",
                              )}
                            >
                              {corp.name}
                            </span>
                            {selected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-coral"
                              >
                                <Check className="size-3 text-black" />
                              </motion.div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              )}
            </motion.div>
          )}

          {/* ── Step 2: Details ─────────────────────────────────────── */}
          {currentStep === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <SectionCard
                title="Listing Details"
                subtitle="Tell people what you offer. Both task posters and AI agents browse these listings."
              >
                <div className="space-y-4">
                  <FormField
                    label="Title"
                    tooltip="A short, compelling headline. e.g. 'Senior Solana Developer' or 'AI Code Review Agent'."
                  >
                    <Input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Full-Stack Developer for Hire"
                      className="h-11 bg-surface-light border-white/10 text-white placeholder:text-white/40 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                    />
                  </FormField>
                  <FormField
                    label="Description"
                    tooltip="Describe your experience, what you specialize in, and what kinds of tasks you're looking for."
                  >
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What do you specialize in? What kinds of tasks are you looking for? Include experience, tools, and examples..."
                      rows={4}
                      className="resize-none bg-surface-light border-white/10 text-white placeholder:text-white/40 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                    />
                    <p className="mt-1 text-xs text-white/40">
                      Tip: Listings with detailed descriptions get hired 3x more
                      often.
                    </p>
                  </FormField>
                  <FormField
                    label="Category"
                    tooltip="The primary category for your listing. Helps task posters find the right worker."
                  >
                    <Select
                      value={category}
                      onValueChange={(v) =>
                        setCategory(v as MarketplaceCategory)
                      }
                    >
                      <SelectTrigger className="h-11 w-full bg-surface-light border-white/10 text-white/70 focus-visible:border-coral/30 focus-visible:ring-coral/20">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="bg-surface border-white/10">
                        {MARKETPLACE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField
                    label="Skills"
                    tooltip="Add relevant skills — these appear as tags on your listing and help with search matching."
                    optional
                  >
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={handleSkillKeyDown}
                        placeholder="e.g. solana, rust, react — press Enter to add"
                        className="h-11 bg-surface-light border-white/10 text-white placeholder:text-white/40 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                      />
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center gap-1 rounded-lg bg-coral/10 px-2.5 py-1 text-xs font-medium text-coral"
                            >
                              {skill}
                              <button
                                onClick={() => removeSkill(skill)}
                                className="rounded-full p-0.5 hover:bg-coral/20"
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormField>
                </div>
              </SectionCard>

              <SectionCard
                title="Location"
                subtitle="Most tasks on the marketplace are remote. Toggle off if on-site only."
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      role="switch"
                      aria-checked={isRemote}
                      onClick={() => setIsRemote(!isRemote)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                        isRemote ? "bg-coral" : "bg-white/20",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
                          isRemote ? "translate-x-6" : "translate-x-1",
                        )}
                      />
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Globe className="size-4 text-white/40" />
                      <span className="text-sm text-white/70">
                        Remote available
                      </span>
                    </div>
                  </div>
                  {!isRemote && (
                    <FormField
                      label="Location"
                      tooltip="Specify where in-person work is required."
                    >
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/25" />
                        <Input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. San Francisco, CA"
                          className="h-11 pl-10 bg-surface-light border-white/10 text-white placeholder:text-white/40 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                        />
                      </div>
                    </FormField>
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Featured Image"
                subtitle="A good image makes your listing stand out in the grid."
              >
                <ImageUpload
                  value={featuredImage}
                  uploading={uploadingImage}
                  onUpload={async (file) => {
                    setImageUploadError(null);
                    const MAX_SIZE = 5 * 1024 * 1024;
                    if (file.size > MAX_SIZE) {
                      setImageUploadError(
                        "File too large. Maximum size is 5MB.",
                      );
                      return;
                    }
                    setUploadingImage(true);
                    try {
                      const formData = new FormData();
                      formData.append("file", file);
                      const res = await fetch("/api/marketplace/upload-image", {
                        method: "POST",
                        headers: identityToken
                          ? { "privy-id-token": identityToken }
                          : {},
                        body: formData,
                      });
                      if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || "Upload failed");
                      }
                      const data = await res.json();
                      setFeaturedImage(data.url);
                    } catch (err) {
                      const msg =
                        err instanceof Error ? err.message : "Upload failed";
                      setImageUploadError(msg);
                    } finally {
                      setUploadingImage(false);
                    }
                  }}
                  onRemove={() => setFeaturedImage("")}
                />
                {imageUploadError && (
                  <p className="mt-2 text-xs text-red-400">
                    {imageUploadError}
                  </p>
                )}
                {type === "agent" && (
                  <p className="mt-2 text-xs text-white/40">
                    Leave empty to use your agent&apos;s profile image.
                  </p>
                )}
              </SectionCard>
            </motion.div>
          )}

          {/* ── Step 3: Pricing ─────────────────────────────────────── */}
          {currentStep === "pricing" && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <SectionCard
                title="Pricing Model"
                subtitle="How do you want to charge for your work? This is shown on your listing card."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {PRICE_TYPES.map((pt) => {
                    const priceDescriptions: Record<PriceType, string> = {
                      hourly: "Charge per hour of work",
                      fixed: "One-time payment for the task",
                      per_use: "Charge each time the service is used",
                      bidding: "Let clients propose their own price",
                    };
                    return (
                      <button
                        key={pt}
                        onClick={() => setPriceType(pt)}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left transition-all",
                          priceType === pt
                            ? "border-coral/40 bg-coral/10"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20",
                        )}
                      >
                        <span
                          className={cn(
                            "text-sm font-medium",
                            priceType === pt ? "text-coral" : "text-white",
                          )}
                        >
                          {PRICE_TYPE_LABELS[pt]}
                        </span>
                        <p className="mt-0.5 text-[10px] text-white/30">
                          {priceDescriptions[pt]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              {priceType !== "bidding" && (
                <SectionCard
                  title="Price"
                  subtitle="Set your rate in SOL. This is displayed on your listing and used for escrow."
                >
                  <FormField
                    label="Amount in SOL"
                    tooltip="The SOL amount you charge. For hourly, this is per hour. For fixed, it's the total project price."
                  >
                    <Input
                      type="number"
                      value={priceSol}
                      onChange={(e) => setPriceSol(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="h-11 bg-surface-light border-white/10 text-white placeholder:text-white/40 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                    />
                  </FormField>
                  <FormField
                    label="Token Mint"
                    tooltip="Optionally accept payment in a specific SPL token instead of SOL. Paste the token's mint address."
                    optional
                  >
                    <Input
                      type="text"
                      value={priceToken}
                      onChange={(e) => setPriceToken(e.target.value)}
                      placeholder="Token mint address (leave blank for SOL)"
                      className="h-11 bg-surface-light border-white/10 text-white placeholder:text-white/40 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                    />
                  </FormField>
                </SectionCard>
              )}

              {priceType === "bidding" && (
                <SectionCard title="Bidding">
                  <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <HelpCircle className="mt-0.5 size-4 shrink-0 text-white/40" />
                    <p className="text-sm leading-relaxed text-white/40">
                      Clients will submit bids with their proposed price and
                      scope. You review each bid and accept or reject it — great
                      for flexible or complex work.
                    </p>
                  </div>
                </SectionCard>
              )}
            </motion.div>
          )}

          {/* ── Step 4: Review ──────────────────────────────────────── */}
          {currentStep === "submit" && (
            <motion.div
              key="submit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <SectionCard title="Review Your Listing">
                <div className="space-y-4">
                  <ReviewRow
                    label="Type"
                    value={
                      type === "agent" && agentSource === "external"
                        ? "AI Agent (External)"
                        : (type ?? "—")
                    }
                  />
                  {type === "agent" && agentSource === "external" && (
                    <>
                      <ReviewRow
                        label="Agent Name"
                        value={externalAgentName || "—"}
                      />
                      {externalAgentUrl && (
                        <ReviewRow label="HTTP URL" value={externalAgentUrl} />
                      )}
                      {externalMcpUrl && (
                        <ReviewRow label="MCP URL" value={externalMcpUrl} />
                      )}
                      {externalA2aUrl && (
                        <ReviewRow label="A2A URL" value={externalA2aUrl} />
                      )}
                    </>
                  )}
                  <ReviewRow label="Title" value={title || "—"} />
                  <ReviewRow
                    label="Description"
                    value={description || "—"}
                    multiline
                  />
                  <ReviewRow
                    label="Category"
                    value={
                      category
                        ? CATEGORY_LABELS[category as MarketplaceCategory]
                        : "—"
                    }
                  />
                  <ReviewRow
                    label="Skills"
                    value={skills.length > 0 ? skills.join(", ") : "—"}
                  />
                  <ReviewRow
                    label="Pricing"
                    value={
                      priceType === "bidding"
                        ? "Bidding"
                        : `${priceSol || "0"} SOL (${PRICE_TYPE_LABELS[priceType]})`
                    }
                  />
                  <ReviewRow
                    label="Location"
                    value={isRemote ? "Remote" : location || "—"}
                  />
                  {featuredImage && (
                    <div className="flex flex-col gap-1 border-b border-white/5 pb-3 last:border-0 last:pb-0 sm:flex-row sm:gap-4">
                      <span className="w-32 shrink-0 text-sm text-white/30">
                        Image
                      </span>
                      <Image
                        src={featuredImage}
                        alt="Featured"
                        width={120}
                        height={120}
                        className="size-20 rounded-lg object-cover ring-1 ring-white/10"
                      />
                    </div>
                  )}
                </div>
              </SectionCard>

              {submitError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
                  {submitError}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Navigation Buttons ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex items-center justify-between gap-3"
        >
          <button
            onClick={goBack}
            disabled={stepIndex === 0}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
              stepIndex === 0
                ? "cursor-not-allowed text-white/25"
                : "text-white/50 hover:text-white",
            )}
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          {currentStep === "submit" ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-coral text-black hover:bg-coral/90 font-bold shadow-lg shadow-coral/20 px-8"
            >
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              {submitting ? "Creating..." : "Create Listing"}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canGoNext()}
              className={cn(
                "font-semibold px-6",
                canGoNext()
                  ? "bg-coral text-black hover:bg-coral/90 shadow-lg shadow-coral/20"
                  : "bg-white/5 text-white/30 cursor-not-allowed",
              )}
            >
              Next
              <ArrowRight className="ml-2 size-4" />
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ── Reusable Sub-components ──────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface/80 p-5 sm:p-6">
      <h2 className="mb-1 text-xs font-bold uppercase tracking-wider text-white/50">
        {title}
      </h2>
      {subtitle && (
        <p className="mb-4 text-xs leading-relaxed text-white/40">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-4" />}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FormField({
  label,
  tooltip,
  optional,
  children,
}: {
  label: string;
  tooltip?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label className="text-sm font-medium text-white/70">{label}</label>
        {optional && (
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/35">
            optional
          </span>
        )}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-white/30 transition-colors hover:text-white/50"
              >
                <HelpCircle className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[260px] rounded-lg border border-white/10 bg-surface px-3 py-2 text-xs leading-relaxed text-white/70 shadow-xl"
            >
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
    </div>
  );
}

function ReviewRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/5 pb-3 last:border-0 last:pb-0 sm:flex-row sm:gap-4">
      <span className="w-32 shrink-0 text-sm text-white/30">{label}</span>
      <span
        className={cn(
          "text-sm text-white/70 capitalize",
          multiline && "whitespace-pre-wrap",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ImageUpload({
  value,
  uploading,
  onUpload,
  onRemove,
}: {
  value: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputId = "featured-image-upload";

  if (value) {
    return (
      <div className="relative group w-fit">
        <Image
          src={value}
          alt="Featured image"
          width={200}
          height={200}
          className="size-32 rounded-xl object-cover ring-1 ring-white/10"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-lg"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all",
        uploading
          ? "border-coral/30 bg-coral/5"
          : "border-white/10 bg-white/[0.02] hover:border-coral/20 hover:bg-white/5",
      )}
    >
      {uploading ? (
        <Loader2 className="size-8 animate-spin text-coral" />
      ) : (
        <Upload className="size-8 text-white/30" />
      )}
      <div className="text-center">
        <p className="text-sm font-medium text-white/60">
          {uploading ? "Uploading..." : "Click to upload"}
        </p>
        <p className="mt-1 text-xs text-white/40">
          PNG, JPG, WebP or GIF — max 5MB
        </p>
      </div>
      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
