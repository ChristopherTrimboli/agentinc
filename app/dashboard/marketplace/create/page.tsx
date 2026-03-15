"use client";

import { useState, useEffect, useCallback, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Bot,
  Building2,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  X,
  Plus,
  Loader2,
  Globe,
  MapPin,
  Link2,
  Image as ImageIcon,
  Check,
} from "lucide-react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils";
import {
  MARKETPLACE_CATEGORIES,
  CATEGORY_LABELS,
  PRICE_TYPES,
  type ListingType,
  type MarketplaceCategory,
  type PriceType,
  type CreateListingInput,
} from "@/lib/marketplace/types";

// ── Steps ────────────────────────────────────────────────────────────

const STEPS = [
  { id: "type", label: "Type" },
  { id: "details", label: "Details" },
  { id: "pricing", label: "Pricing" },
  { id: "submit", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const STEP_ORDER: StepId[] = ["type", "details", "pricing", "submit"];

// ── Type Cards ───────────────────────────────────────────────────────

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
    description: "List yourself for hire",
  },
  {
    type: "agent",
    icon: Bot,
    label: "AI Agent",
    description: "List your AI agent",
  },
  {
    type: "corporation",
    icon: Building2,
    label: "Corporation",
    description: "List your corporation",
  },
];

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  hourly: "Hourly",
  fixed: "Fixed Price",
  per_use: "Per Use",
  bidding: "Bidding",
};

// ── Agent/Corp types from API ────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────

export default function CreateListingPage() {
  const router = useRouter();
  const { authFetch } = useAuth();

  // Step navigation
  const [currentStep, setCurrentStep] = useState<StepId>("type");
  const stepIndex = STEP_ORDER.indexOf(currentStep);

  // Form state
  const [type, setType] = useState<ListingType | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedCorpId, setSelectedCorpId] = useState("");
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
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [portfolioInput, setPortfolioInput] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");

  // Data
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [corps, setCorps] = useState<CorpOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch user's agents/corps when type changes
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

  // Skills tag input
  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      const newSkill = skillInput.trim().toLowerCase();
      if (!skills.includes(newSkill)) {
        setSkills((prev) => [...prev, newSkill]);
      }
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  // Portfolio URL list
  const addPortfolioUrl = () => {
    if (portfolioInput.trim() && !portfolio.includes(portfolioInput.trim())) {
      setPortfolio((prev) => [...prev, portfolioInput.trim()]);
      setPortfolioInput("");
    }
  };

  const removePortfolioUrl = (url: string) => {
    setPortfolio((prev) => prev.filter((u) => u !== url));
  };

  // Navigation
  const canGoNext = (): boolean => {
    switch (currentStep) {
      case "type":
        return type !== null;
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
    if (stepIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[stepIndex + 1]);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setCurrentStep(STEP_ORDER[stepIndex - 1]);
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (!type || !category) return;

    setSubmitting(true);
    setSubmitError(null);

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
        type === "agent" && selectedAgentId ? selectedAgentId : undefined,
      corporationId:
        type === "corporation" && selectedCorpId ? selectedCorpId : undefined,
      featuredImage: featuredImage || undefined,
      portfolio: portfolio.length > 0 ? portfolio : undefined,
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

      router.push("/dashboard/marketplace");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000028] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard/marketplace")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-white font-display">
            Create Listing
          </h1>
          <p className="mt-1 text-white/50">
            List yourself, an agent, or a corporation on the marketplace
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 flex items-center gap-2">
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
                      ? "bg-[#6FEC06] text-black"
                      : isCompleted
                        ? "bg-[#6FEC06]/20 text-[#6FEC06]"
                        : "bg-white/5 text-white/30",
                  )}
                >
                  {isCompleted ? <Check className="size-3.5" /> : i + 1}
                </button>
                <span
                  className={cn(
                    "hidden text-sm font-medium sm:inline",
                    isActive ? "text-white" : "text-white/30",
                  )}
                >
                  {step.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px flex-1",
                      isCompleted ? "bg-[#6FEC06]/30" : "bg-white/10",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Type Selection ──────────────────────────────── */}
        {currentStep === "type" && (
          <div className="space-y-6">
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
                        "flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-all",
                        selected
                          ? "border-[#6FEC06]/50 bg-[#6FEC06]/10"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-14 items-center justify-center rounded-xl",
                          selected ? "bg-[#6FEC06]/20" : "bg-white/5",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-7",
                            selected ? "text-[#6FEC06]" : "text-white/50",
                          )}
                        />
                      </div>
                      <div>
                        <h3
                          className={cn(
                            "font-semibold",
                            selected ? "text-[#6FEC06]" : "text-white",
                          )}
                        >
                          {opt.label}
                        </h3>
                        <p className="mt-0.5 text-xs text-white/40">
                          {opt.description}
                        </p>
                      </div>
                      {selected && (
                        <div className="flex size-6 items-center justify-center rounded-full bg-[#6FEC06]">
                          <Check className="size-3.5 text-black" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            {/* Entity Selector */}
            {type === "agent" && (
              <SectionCard title="Select Agent">
                {loadingEntities ? (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Loader2 className="size-4 animate-spin" />
                    Loading agents...
                  </div>
                ) : agents.length === 0 ? (
                  <p className="text-sm text-white/40">
                    No agents found.{" "}
                    <a
                      href="/dashboard/mint"
                      className="text-[#6FEC06] hover:underline"
                    >
                      Mint an agent first
                    </a>
                    .
                  </p>
                ) : (
                  <SelectDropdown
                    value={selectedAgentId}
                    onChange={setSelectedAgentId}
                    placeholder="Choose an agent"
                    options={agents.map((a) => ({
                      value: a.id,
                      label: a.name,
                    }))}
                  />
                )}
              </SectionCard>
            )}

            {type === "corporation" && (
              <SectionCard title="Select Corporation">
                {loadingEntities ? (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Loader2 className="size-4 animate-spin" />
                    Loading corporations...
                  </div>
                ) : corps.length === 0 ? (
                  <p className="text-sm text-white/40">
                    No corporations found.{" "}
                    <a
                      href="/dashboard/incorporate"
                      className="text-[#6FEC06] hover:underline"
                    >
                      Incorporate first
                    </a>
                    .
                  </p>
                ) : (
                  <SelectDropdown
                    value={selectedCorpId}
                    onChange={setSelectedCorpId}
                    placeholder="Choose a corporation"
                    options={corps.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                )}
              </SectionCard>
            )}
          </div>
        )}

        {/* ── Step 2: Details ─────────────────────────────────────── */}
        {currentStep === "details" && (
          <div className="space-y-6">
            <SectionCard title="Listing Details">
              <div className="space-y-4">
                <FormField label="Title">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Full-Stack Developer for Hire"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 transition-colors focus:border-[#6FEC06]/50 focus:outline-none"
                  />
                </FormField>

                <FormField label="Description">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you offer..."
                    rows={4}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 transition-colors focus:border-[#6FEC06]/50 focus:outline-none"
                  />
                </FormField>

                <FormField label="Category">
                  <SelectDropdown
                    value={category}
                    onChange={(v) => setCategory(v as MarketplaceCategory)}
                    placeholder="Select a category"
                    options={MARKETPLACE_CATEGORIES.map((c) => ({
                      value: c,
                      label: CATEGORY_LABELS[c],
                    }))}
                  />
                </FormField>

                <FormField label="Skills">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={handleSkillKeyDown}
                      placeholder="Type a skill and press Enter"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 transition-colors focus:border-[#6FEC06]/50 focus:outline-none"
                    />
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-full bg-[#6FEC06]/10 px-2.5 py-1 text-xs font-medium text-[#6FEC06]"
                          >
                            {skill}
                            <button
                              onClick={() => removeSkill(skill)}
                              className="rounded-full p-0.5 transition-colors hover:bg-[#6FEC06]/20"
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

            <SectionCard title="Location">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsRemote(!isRemote)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                      isRemote ? "bg-[#6FEC06]" : "bg-white/20",
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
                    <Globe className="size-4 text-white/50" />
                    <span className="text-sm text-white/80">
                      Remote available
                    </span>
                  </div>
                </div>
                {!isRemote && (
                  <FormField label="Location">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. San Francisco, CA"
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white placeholder-white/30 transition-colors focus:border-[#6FEC06]/50 focus:outline-none"
                      />
                    </div>
                  </FormField>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Portfolio">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="url"
                      value={portfolioInput}
                      onChange={(e) => setPortfolioInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addPortfolioUrl();
                        }
                      }}
                      placeholder="https://your-portfolio.com"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white placeholder-white/30 transition-colors focus:border-[#6FEC06]/50 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={addPortfolioUrl}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                {portfolio.map((url) => (
                  <div
                    key={url}
                    className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2"
                  >
                    <Link2 className="size-3.5 shrink-0 text-white/30" />
                    <span className="flex-1 truncate text-sm text-white/70">
                      {url}
                    </span>
                    <button
                      onClick={() => removePortfolioUrl(url)}
                      className="shrink-0 rounded-full p-0.5 text-white/30 transition-colors hover:text-red-400"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Featured Image">
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                <input
                  type="url"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white placeholder-white/30 transition-colors focus:border-[#6FEC06]/50 focus:outline-none"
                />
              </div>
              {type === "agent" && (
                <p className="mt-2 text-xs text-white/30">
                  Leave empty to use your agent&apos;s profile image.
                </p>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── Step 3: Pricing ─────────────────────────────────────── */}
        {currentStep === "pricing" && (
          <div className="space-y-6">
            <SectionCard title="Pricing Model">
              <div className="grid gap-3 sm:grid-cols-2">
                {PRICE_TYPES.map((pt) => (
                  <button
                    key={pt}
                    onClick={() => setPriceType(pt)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition-all",
                      priceType === pt
                        ? "border-[#6FEC06]/50 bg-[#6FEC06]/10"
                        : "border-white/10 bg-white/5 hover:border-white/20",
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-medium",
                        priceType === pt ? "text-[#6FEC06]" : "text-white",
                      )}
                    >
                      {PRICE_TYPE_LABELS[pt]}
                    </span>
                  </button>
                ))}
              </div>
            </SectionCard>

            {priceType !== "bidding" && (
              <SectionCard title="Price">
                <FormField label="Amount in SOL">
                  <input
                    type="number"
                    value={priceSol}
                    onChange={(e) => setPriceSol(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 transition-colors focus:border-[#6FEC06]/50 focus:outline-none"
                  />
                </FormField>
                <FormField label="Token Mint (optional)">
                  <input
                    type="text"
                    value={priceToken}
                    onChange={(e) => setPriceToken(e.target.value)}
                    placeholder="Token mint address for token payments"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 transition-colors focus:border-[#6FEC06]/50 focus:outline-none"
                  />
                </FormField>
              </SectionCard>
            )}

            {priceType === "bidding" && (
              <SectionCard title="Bidding">
                <p className="text-sm text-white/50">
                  Clients will submit bids with their proposed price. You can
                  accept or reject bids.
                </p>
              </SectionCard>
            )}
          </div>
        )}

        {/* ── Step 4: Review ──────────────────────────────────────── */}
        {currentStep === "submit" && (
          <div className="space-y-6">
            <SectionCard title="Review Your Listing">
              <div className="space-y-4">
                <ReviewRow label="Type" value={type ?? "—"} />
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
                {portfolio.length > 0 && (
                  <ReviewRow label="Portfolio" value={portfolio.join(", ")} />
                )}
              </div>
            </SectionCard>

            {submitError && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* ── Navigation Buttons ──────────────────────────────────── */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={stepIndex === 0}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
              stepIndex === 0
                ? "cursor-not-allowed text-white/20"
                : "text-white/60 hover:text-white",
            )}
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          {currentStep === "submit" ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6FEC06] px-6 py-2.5 text-sm font-semibold text-black transition-all hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {submitting ? "Creating..." : "Create Listing"}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all",
                canGoNext()
                  ? "bg-[#6FEC06] text-black hover:opacity-90"
                  : "cursor-not-allowed bg-white/5 text-white/20",
              )}
            >
              Next
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable Sub-components ──────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0520]/80 p-5 sm:p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/40">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/70">
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectDropdown({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-white transition-colors focus:border-[#6FEC06]/50 focus:outline-none [&>option]:bg-[#0a0520] [&>option]:text-white"
      >
        <option value="" className="text-white/30">
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
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
      <span className="w-32 shrink-0 text-sm text-white/40">{label}</span>
      <span
        className={cn(
          "text-sm text-white/80",
          multiline && "whitespace-pre-wrap",
        )}
      >
        {value}
      </span>
    </div>
  );
}
