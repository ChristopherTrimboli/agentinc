"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  MapPin,
  Calendar,
  Lock,
  Loader2,
  CheckCircle2,
  Briefcase,
  Shield,
  Zap,
  Coins,
  ExternalLink,
  HelpCircle,
  Info,
  Wand2,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  PenLine,
  Wallet,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  MARKETPLACE_CATEGORIES,
  CATEGORY_LABELS,
  type MarketplaceCategory,
  type CreateTaskInput,
} from "@/lib/marketplace/types";
import { Button } from "@/components/ui/button";
import { useMintTaskToken } from "@/lib/hooks/useMintTaskToken";
import { getBagsFmUrl } from "@/lib/constants/urls";
import { MINT_TX_FEE_ESTIMATE } from "@/lib/constants/mint";

interface ListingContext {
  id: string;
  title: string;
  type: string;
}

const STEPS = [
  { label: "Details", step: 1 },
  { label: "Budget", step: 2 },
  { label: "Token", step: 3 },
  { label: "Review", step: 4 },
] as const;

export default function CreateTaskPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-coral" />
        </div>
      }
    >
      <CreateTaskPage />
    </Suspense>
  );
}

function CreateTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listingId");
  const { authenticated, ready, login } = usePrivy();
  const { authFetch } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MarketplaceCategory | "">("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newRequirement, setNewRequirement] = useState("");
  const [location, setLocation] = useState("");
  const [isRemote, setIsRemote] = useState(true);
  const [deadline, setDeadline] = useState("");

  const [budgetSol, setBudgetSol] = useState("");
  const [useMilestones, setUseMilestones] = useState(false);
  const [milestones, setMilestones] = useState<
    { title: string; amountSol: string }[]
  >([{ title: "", amountSol: "" }]);

  // Task Token state
  const [useTaskToken, setUseTaskToken] = useState(true);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [userEditedTokenName, setUserEditedTokenName] = useState(false);
  const [userEditedTokenSymbol, setUserEditedTokenSymbol] = useState(false);
  const taskToken = useMintTaskToken();

  // Task image state
  const [taskImageUrl, setTaskImageUrl] = useState("");
  const [imageMode, setImageMode] = useState<"generate" | "upload">("generate");
  const [customImagePrompt, setCustomImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [listingContext, setListingContext] = useState<ListingContext | null>(
    null,
  );

  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
    // Only trigger on mount — avoid infinite loop if user dismisses the modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const fetchListing = useCallback(async () => {
    if (!listingId) return;
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}`);
      if (res.ok) {
        const data = await res.json();
        setListingContext({ id: data.id, title: data.title, type: data.type });
      }
    } catch {
      /* non-critical */
    }
  }, [listingId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  // Auto-generate token name/symbol from task title (only if user hasn't manually edited)
  useEffect(() => {
    if (title.trim() && !userEditedTokenName) {
      setTokenName(title.trim().slice(0, 32));
    }
    if (title.trim() && !userEditedTokenSymbol) {
      const words = title.trim().split(/\s+/);
      const sym = words
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 6);
      setTokenSymbol(sym || "TASK");
    }
  }, [title, userEditedTokenName, userEditedTokenSymbol]);

  function addRequirement() {
    const trimmed = newRequirement.trim();
    if (!trimmed) return;
    setRequirements((prev) => [...prev, trimmed]);
    setNewRequirement("");
  }

  function removeRequirement(index: number) {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  }

  function addMilestone() {
    setMilestones((prev) => [...prev, { title: "", amountSol: "" }]);
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMilestone(
    index: number,
    field: "title" | "amountSol",
    value: string,
  ) {
    setMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  }

  async function generateTaskImage() {
    if (!authenticated) return login();
    setIsGeneratingImage(true);
    try {
      const res = await authFetch(
        "/api/marketplace/tasks/mint/generate-image",
        {
          method: "POST",
          body: JSON.stringify({
            name: tokenName.trim() || title.trim(),
            description: description.trim().slice(0, 200),
            customPrompt: customImagePrompt.trim() || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate image");
      }
      const data = await res.json();
      setTaskImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function uploadTaskImage(file: File) {
    if (!authenticated) return login();
    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await authFetch(
        "/api/marketplace/tasks/mint/generate-image",
        {
          method: "POST",
          body: JSON.stringify({
            name: tokenName.trim() || title.trim() || "task",
            uploadedImage: base64,
            contentType: file.type,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to upload image");
      }
      const data = await res.json();
      setTaskImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  }

  const milestoneTotal = milestones.reduce(
    (sum, m) => sum + (parseFloat(m.amountSol) || 0),
    0,
  );
  const budgetNum = parseFloat(budgetSol) || 0;
  const milestoneMismatch =
    useMilestones &&
    milestones.length > 0 &&
    Math.abs(milestoneTotal - budgetNum) > 0.001;

  function canProceedStep1(): boolean {
    return (
      title.trim().length > 0 &&
      description.trim().length > 0 &&
      category !== ""
    );
  }

  function canProceedStep2(): boolean {
    if (useTaskToken && budgetNum <= 0) return true;
    if (budgetNum <= 0) return false;
    if (useMilestones) {
      const validMilestones = milestones.every(
        (m) => m.title.trim() && parseFloat(m.amountSol) > 0,
      );
      return validMilestones && !milestoneMismatch;
    }
    return true;
  }

  function canProceedStep3(): boolean {
    if (!useTaskToken) return true;
    return tokenName.trim().length > 0 && tokenSymbol.trim().length > 0;
  }

  async function handleSubmit() {
    if (!authenticated) return login();
    setSubmitting(true);
    setError("");

    try {
      let tokenData: {
        tokenMint?: string;
        tokenSymbol?: string;
        tokenMetadata?: string;
        tokenLaunchWallet?: string;
        tokenLaunchSignature?: string;
        tokenConfigKey?: string;
      } = {};

      // Launch task token first if enabled
      if (useTaskToken) {
        const result = await taskToken.launchTaskToken({
          name: tokenName.trim().slice(0, 32),
          symbol: tokenSymbol.trim().slice(0, 10),
          description: `Task Token: ${title.trim()} — ${description.trim().slice(0, 500)}`,
          imageUrl: taskImageUrl || undefined,
        });

        if (!result) {
          throw new Error(taskToken.launchError || "Task token launch failed");
        }

        tokenData = {
          tokenMint: result.tokenMint,
          tokenSymbol: result.tokenSymbol,
          tokenMetadata: result.tokenMetadata,
          tokenLaunchWallet: taskToken.walletAddress ?? undefined,
          tokenLaunchSignature: result.launchSignature,
          tokenConfigKey: result.configKey,
        };
      }

      const payload: CreateTaskInput = {
        title: title.trim(),
        description: description.trim(),
        category: category as MarketplaceCategory,
        requirements,
        budgetSol: budgetNum,
        isRemote,
        featuredImage: taskImageUrl || undefined,
        ...(location.trim() && { location: location.trim() }),
        ...(deadline && { deadline }),
        ...(listingId && { listingId }),
        ...(useMilestones &&
          milestones.length > 0 && {
            milestones: milestones.map((m) => ({
              title: m.title.trim(),
              amountSol: parseFloat(m.amountSol),
              status: "pending" as const,
            })),
          }),
        ...tokenData,
      };

      const res = await authFetch("/api/marketplace/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create task");
      }
      const task = await res.json();
      router.push(`/dashboard/marketplace/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-20 sm:p-6 lg:p-8">
      {/* Back button */}
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            href="/dashboard/marketplace"
            className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to Marketplace
          </Link>
        </motion.div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col lg:flex-row lg:gap-12">
        {/* Side info panel — sticky on desktop, stacked on mobile */}
        <motion.aside
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8 shrink-0 lg:sticky lg:top-8 lg:mb-0 lg:w-72 lg:self-start"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/5 px-3 py-1">
            <Coins className="size-3 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">
              Task Token
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white font-display">
            Mint a Task Token
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/40">
            Describe what you need, mint a token, and let the market set the
            bounty. Trading fees accumulate and are paid out to whoever
            completes the task. Both humans and AI agents can pick it up.
          </p>

          {/* How Task Tokens work — visible on desktop side panel */}
          <div className="mt-6 hidden space-y-2 lg:block">
            <div className="mb-2.5 flex items-center gap-2">
              <Info className="size-3.5 text-purple-400" />
              <h3 className="text-xs font-semibold text-white/50">
                How Task Tokens work
              </h3>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-white/[0.03] p-2.5">
              <Coins className="mt-0.5 size-3.5 shrink-0 text-purple-400" />
              <p className="text-xs leading-relaxed text-white/30">
                Token launches on Bags.fm with its own bonding curve
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-white/[0.03] p-2.5">
              <Zap className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
              <p className="text-xs leading-relaxed text-white/30">
                Anyone (humans or AI) can buy/sell to speculate on the task
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-white/[0.03] p-2.5">
              <Shield className="mt-0.5 size-3.5 shrink-0 text-coral" />
              <p className="text-xs leading-relaxed text-white/30">
                100% of creator fees flow into the bounty pool
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-white/[0.03] p-2.5">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
              <p className="text-xs leading-relaxed text-white/30">
                On approval, all fees + escrow paid to worker
              </p>
            </div>
          </div>

          {/* Listing badge */}
          {listingContext && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-coral/20 bg-coral/5 px-4 py-2.5">
              <Briefcase className="size-4 text-coral" />
              <span className="text-sm text-coral">
                Hiring:{" "}
                <span className="font-semibold">{listingContext.title}</span>
              </span>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs capitalize text-white/40">
                {listingContext.type}
              </span>
            </div>
          )}
        </motion.aside>

        {/* Main form column */}
        <div className="min-w-0 flex-1 lg:max-w-3xl">
          {/* Step Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-10 flex items-center justify-center"
          >
            {STEPS.map(({ label, step: s }, i) => {
              const isCompleted = step > s;
              const isActive = step === s;
              return (
                <div key={s} className="flex items-center">
                  {i > 0 && (
                    <div
                      className={cn(
                        "h-0.5 w-12 sm:w-20",
                        isCompleted ? "bg-coral" : "bg-white/10",
                      )}
                    />
                  )}
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all",
                        isCompleted
                          ? "border-coral bg-coral text-black"
                          : isActive
                            ? "border-coral bg-coral/20 text-coral shadow-[0_0_12px_rgba(111,236,6,0.3)]"
                            : "border-white/10 bg-white/5 text-white/25",
                      )}
                    >
                      {isCompleted ? <CheckCircle2 className="size-4" /> : s}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isCompleted || isActive
                          ? "text-white/80"
                          : "text-white/25",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Error banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400"
            >
              <span>{error}</span>
              <button
                onClick={() => setError("")}
                className="ml-2 rounded-lg p-1 hover:bg-red-500/10"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* ── Step 1: Details ──────────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-2xl border border-white/10 bg-surface/80 p-6 sm:p-8"
              >
                <h2 className="mb-2 text-xl font-semibold text-white font-display">
                  Task Details
                </h2>
                <p className="mb-6 text-sm text-white/35">
                  What needs to get done? Be specific — this helps humans and AI
                  agents understand the scope.
                </p>
                <div className="space-y-5">
                  <div>
                    <FieldLabel
                      label="Title"
                      tooltip="A clear, concise title that describes the task. Good titles get more attention from workers."
                    />
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Build a Solana token swap UI"
                      maxLength={200}
                      className="form-input"
                    />
                    <p className="mt-1 text-xs text-white/20">
                      {title.length}/200 — Make it descriptive so workers
                      instantly know what you need.
                    </p>
                  </div>
                  <div>
                    <FieldLabel
                      label="Description"
                      tooltip="Include all the context needed to complete the task: goals, tech stack, deliverables, and any reference links."
                    />
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What's the goal? What tech stack? What does 'done' look like? Include links, specs, or references..."
                      rows={5}
                      maxLength={10000}
                      className="form-input"
                    />
                    <p className="mt-1 text-xs text-white/20">
                      Tip: The more detail you provide, the better proposals
                      you&apos;ll receive.
                    </p>
                  </div>
                  <div>
                    <FieldLabel
                      label="Category"
                      tooltip="Pick the category that best matches this task. It helps workers find relevant work in their expertise."
                    />
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as MarketplaceCategory)
                      }
                      className="form-input appearance-none"
                    >
                      <option value="">Select a category</option>
                      {MARKETPLACE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel
                      label="Requirements"
                      tooltip="List specific requirements or acceptance criteria. Workers will see these as a checklist of what needs to be met."
                      optional
                    />
                    {requirements.length > 0 && (
                      <ul className="mb-3 space-y-2">
                        {requirements.map((req, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/60"
                          >
                            <CheckCircle2 className="size-4 shrink-0 text-coral" />
                            <span className="flex-1">{req}</span>
                            <button
                              type="button"
                              onClick={() => removeRequirement(i)}
                              className="shrink-0 text-white/25 hover:text-red-400"
                            >
                              <X className="size-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newRequirement}
                        onChange={(e) => setNewRequirement(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addRequirement();
                          }
                        }}
                        placeholder="e.g. Must include unit tests — press Enter to add"
                        className="form-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={addRequirement}
                        className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white/40 hover:border-coral/20 hover:text-coral"
                      >
                        <Plus className="size-5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel
                        label="Location"
                        tooltip="If this task requires in-person work, specify the location. Leave blank for fully remote tasks."
                        optional
                      />
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/25" />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. New York, NY"
                          className="form-input pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel
                        label="Remote Work"
                        tooltip="Toggle on if this task can be completed remotely. Most crypto/AI tasks are remote-friendly."
                      />
                      <button
                        type="button"
                        onClick={() => setIsRemote(!isRemote)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-all",
                          isRemote
                            ? "border-coral/30 bg-coral/10 text-coral"
                            : "border-white/10 bg-white/5 text-white/40",
                        )}
                      >
                        <MapPin className="size-4" />
                        {isRemote ? "Remote OK" : "Not Remote"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <FieldLabel
                      label="Deadline"
                      tooltip="Set an optional deadline. Tasks with deadlines tend to get picked up faster. Workers see how urgent the task is."
                      optional
                    />
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/25" />
                      <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="form-input pl-10 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1()}
                    className={cn(
                      "font-semibold px-6",
                      canProceedStep1()
                        ? "bg-coral text-black hover:bg-coral/90 shadow-lg shadow-coral/20"
                        : "bg-white/5 text-white/20 cursor-not-allowed",
                    )}
                  >
                    Next: Budget <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Budget & Milestones ──────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-2xl border border-white/10 bg-surface/80 p-6 sm:p-8"
              >
                <h2 className="mb-2 text-xl font-semibold text-white font-display">
                  Budget & Milestones
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-white/40">
                  Set a fixed SOL bounty that gets locked in escrow, or skip it
                  and let the task token trading fees become the bounty. You can
                  do both — stack a fixed bounty on top of token fees.
                </p>
                <div className="space-y-5">
                  <div>
                    <FieldLabel
                      label="SOL Budget"
                      tooltip="This amount is locked in on-chain escrow and paid to the worker when the task is approved. Optional if you're using a Task Token — trading fees become the bounty instead."
                      optional
                    />
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={budgetSol}
                        onChange={(e) => setBudgetSol(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-2xl font-bold text-white placeholder-white/15 focus:border-coral/30 focus:outline-none focus:ring-1 focus:ring-coral/20"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-coral/50">
                        SOL
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-white/20">
                      Locked in escrow until the task is approved or cancelled.
                      Refundable if cancelled.
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setUseMilestones(!useMilestones)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-all",
                        useMilestones
                          ? "border-coral/30 bg-coral/10 text-coral"
                          : "border-white/10 bg-white/5 text-white/40",
                      )}
                    >
                      <CheckCircle2
                        className={cn(
                          "size-4",
                          useMilestones ? "text-coral" : "text-white/25",
                        )}
                      />
                      Split into milestones
                    </button>
                  </div>

                  {useMilestones && (
                    <div className="space-y-3">
                      {milestones.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-xs font-bold text-white/30">
                            {i + 1}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={m.title}
                              onChange={(e) =>
                                updateMilestone(i, "title", e.target.value)
                              }
                              placeholder="Milestone title"
                              className="form-input text-sm"
                            />
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={m.amountSol}
                                onChange={(e) =>
                                  updateMilestone(
                                    i,
                                    "amountSol",
                                    e.target.value,
                                  )
                                }
                                placeholder="0.00"
                                className="form-input text-sm"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-coral/50">
                                SOL
                              </span>
                            </div>
                          </div>
                          {milestones.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMilestone(i)}
                              className="mt-1 shrink-0 text-white/25 hover:text-red-400"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addMilestone}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/30 transition-all hover:border-coral/20 hover:text-coral"
                      >
                        <Plus className="size-4" />
                        Add Milestone
                      </button>

                      <div
                        className={cn(
                          "flex items-center justify-between rounded-lg px-4 py-2 text-sm",
                          milestoneMismatch
                            ? "bg-red-500/5 text-red-400"
                            : "bg-white/5 text-white/40",
                        )}
                      >
                        <span>Milestone total</span>
                        <span className="font-semibold">
                          {milestoneTotal.toFixed(2)} / {budgetNum.toFixed(2)}{" "}
                          SOL
                        </span>
                      </div>
                      {milestoneMismatch && (
                        <p className="text-xs text-red-400">
                          Milestones must sum to the total budget
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="text-white/50 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 size-4" /> Previous
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!canProceedStep2()}
                    className={cn(
                      "font-semibold px-6",
                      canProceedStep2()
                        ? "bg-coral text-black hover:bg-coral/90 shadow-lg shadow-coral/20"
                        : "bg-white/5 text-white/20 cursor-not-allowed",
                    )}
                  >
                    Next: Task Token <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Task Token ──────────────────────────────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-2xl border border-white/10 bg-surface/80 p-6 sm:p-8"
              >
                <h2 className="mb-2 text-xl font-semibold text-white font-display">
                  Task Token
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-white/40">
                  This is the core of Task Tokens. Launch a token on Bags.fm for
                  this task — 100% of creator trading fees accumulate as the
                  bounty pool and are paid to the worker on completion.
                </p>

                <div className="space-y-5">
                  <div>
                    <button
                      type="button"
                      onClick={() => setUseTaskToken(!useTaskToken)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all",
                        useTaskToken
                          ? "border-coral/30 bg-coral/10"
                          : "border-white/10 bg-white/5",
                      )}
                    >
                      <Coins
                        className={cn(
                          "size-5",
                          useTaskToken ? "text-coral" : "text-white/25",
                        )}
                      />
                      <div className="flex-1">
                        <p
                          className={cn(
                            "font-semibold",
                            useTaskToken ? "text-coral" : "text-white/60",
                          )}
                        >
                          Mint a Task Token
                        </p>
                        <p className="text-xs text-white/30">
                          Anyone can trade it. Fees become the bounty. More hype
                          = bigger reward.
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full border-2",
                          useTaskToken
                            ? "border-coral bg-coral"
                            : "border-white/20",
                        )}
                      >
                        {useTaskToken && (
                          <CheckCircle2 className="size-3 text-black" />
                        )}
                      </div>
                    </button>
                  </div>

                  {useTaskToken && (
                    <div className="space-y-4">
                      <div>
                        <FieldLabel
                          label="Token Name"
                          tooltip="The display name for your task token on Bags.fm. Usually matches or abbreviates the task title."
                        />
                        <input
                          type="text"
                          value={tokenName}
                          onChange={(e) => {
                            setTokenName(e.target.value);
                            setUserEditedTokenName(true);
                          }}
                          placeholder="e.g. Build Swap UI"
                          maxLength={32}
                          className="form-input"
                        />
                        <p className="mt-1 text-xs text-white/20">
                          {tokenName.length}/32 — Auto-filled from your task
                          title.
                        </p>
                      </div>
                      <div>
                        <FieldLabel
                          label="Token Symbol"
                          tooltip="The ticker symbol (like $TASK) shown on trading platforms. Keep it short, memorable, and uppercase."
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-coral/40">
                            $
                          </span>
                          <input
                            type="text"
                            value={tokenSymbol}
                            onChange={(e) => {
                              setTokenSymbol(
                                e.target.value
                                  .toUpperCase()
                                  .replace(/[^A-Z0-9]/g, ""),
                              );
                              setUserEditedTokenSymbol(true);
                            }}
                            placeholder="TASK"
                            maxLength={10}
                            className="form-input pl-7 font-mono uppercase"
                          />
                        </div>
                        <p className="mt-1 text-xs text-white/20">
                          Auto-generated from title initials. Feel free to
                          customize.
                        </p>
                      </div>

                      {/* ── Task Image ─────────────────────────── */}
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <ImageIcon className="size-4 text-coral" />
                          <h3 className="text-sm font-semibold text-white/70">
                            Token Image
                          </h3>
                        </div>

                        <div className="mb-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setImageMode("generate")}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                              imageMode === "generate"
                                ? "border-coral/30 bg-coral/10 text-coral"
                                : "border-white/10 bg-white/5 text-white/40 hover:text-white/60",
                            )}
                          >
                            <Wand2 className="size-3.5" />
                            AI Generate
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageMode("upload")}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                              imageMode === "upload"
                                ? "border-coral/30 bg-coral/10 text-coral"
                                : "border-white/10 bg-white/5 text-white/40 hover:text-white/60",
                            )}
                          >
                            <Upload className="size-3.5" />
                            Upload
                          </button>
                        </div>

                        {imageMode === "generate" && (
                          <div className="space-y-3">
                            <div>
                              <div className="mb-1.5 flex items-center justify-between">
                                <label className="flex items-center gap-1 text-xs text-white/40">
                                  <PenLine className="size-3" />
                                  Custom Prompt{" "}
                                  <span className="text-white/20">
                                    (optional)
                                  </span>
                                </label>
                                {customImagePrompt && (
                                  <button
                                    type="button"
                                    onClick={() => setCustomImagePrompt("")}
                                    className="rounded px-2 py-0.5 text-xs text-white/30 hover:text-white/50"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                              <textarea
                                value={customImagePrompt}
                                onChange={(e) =>
                                  setCustomImagePrompt(e.target.value)
                                }
                                placeholder="Leave empty to auto-generate from task details, or describe the image you want..."
                                rows={2}
                                maxLength={500}
                                className="form-input text-xs"
                              />
                              {!customImagePrompt && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-white/25">
                                  <Sparkles className="size-3" />
                                  Auto-prompt from task title & description
                                </p>
                              )}
                            </div>

                            <div className="py-2 text-center">
                              {taskImageUrl ? (
                                <div className="space-y-3">
                                  <div className="relative mx-auto size-36 overflow-hidden rounded-xl border-2 border-coral/30">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={taskImageUrl}
                                      alt={tokenName || title}
                                      className="size-full object-cover"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={generateTaskImage}
                                    disabled={isGeneratingImage}
                                    className="mx-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 transition-all hover:text-white/70"
                                  >
                                    <RefreshCw
                                      className={cn(
                                        "size-3.5",
                                        isGeneratingImage && "animate-spin",
                                      )}
                                    />
                                    Regenerate
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="mx-auto flex size-36 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
                                    {isGeneratingImage ? (
                                      <div className="text-center">
                                        <Loader2 className="mx-auto mb-2 size-8 animate-spin text-coral" />
                                        <p className="text-xs text-white/40">
                                          Generating...
                                        </p>
                                      </div>
                                    ) : (
                                      <Wand2 className="size-10 text-white/15" />
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={generateTaskImage}
                                    disabled={isGeneratingImage}
                                    className={cn(
                                      "mx-auto flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all",
                                      isGeneratingImage
                                        ? "bg-white/5 text-white/30"
                                        : "bg-coral text-black shadow-lg shadow-coral/20 hover:bg-coral/90",
                                    )}
                                  >
                                    {isGeneratingImage ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      <Wand2 className="size-4" />
                                    )}
                                    {customImagePrompt
                                      ? "Generate from Prompt"
                                      : "Generate AI Image"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {imageMode === "upload" && (
                          <div className="py-2 text-center">
                            <input
                              type="file"
                              id="task-image-upload"
                              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadTaskImage(file);
                                e.target.value = "";
                              }}
                              className="hidden"
                            />
                            {taskImageUrl ? (
                              <div className="space-y-3">
                                <div className="relative mx-auto size-40 overflow-hidden rounded-xl border-2 border-coral/30">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={taskImageUrl}
                                    alt={tokenName || title}
                                    className="size-full object-cover"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    document
                                      .getElementById("task-image-upload")
                                      ?.click()
                                  }
                                  disabled={isUploadingImage}
                                  className="mx-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 transition-all hover:text-white/70"
                                >
                                  {isUploadingImage ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="size-3.5" />
                                  )}
                                  Change Image
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  document
                                    .getElementById("task-image-upload")
                                    ?.click()
                                }
                                disabled={isUploadingImage}
                                className="mx-auto flex size-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] transition-all hover:border-coral/30 hover:bg-white/[0.04]"
                              >
                                {isUploadingImage ? (
                                  <div className="text-center">
                                    <Loader2 className="mx-auto mb-2 size-8 animate-spin text-coral" />
                                    <p className="text-xs text-white/40">
                                      Uploading...
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className="mb-2 size-8 text-white/20" />
                                    <p className="text-sm font-medium text-white/50">
                                      Click to upload
                                    </p>
                                    <p className="mt-0.5 text-xs text-white/25">
                                      PNG, JPG, WebP, GIF — Max 5MB
                                    </p>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}

                        {!taskImageUrl && (
                          <p className="mt-2 text-center text-xs text-white/20">
                            Without an image, the default Agent Inc. logo will
                            be used as the token icon.
                          </p>
                        )}
                      </div>

                      {/* ── Wallet Balance ─────────────────────── */}
                      {taskToken.walletAddress && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Wallet className="size-4 text-white/30" />
                              <span className="font-mono text-xs text-white/50">
                                {taskToken.walletAddress.slice(0, 6)}...
                                {taskToken.walletAddress.slice(-6)}
                              </span>
                            </div>
                            {taskToken.walletBalance !== null ? (
                              <span
                                className={cn(
                                  "text-xs font-semibold",
                                  taskToken.walletBalance >=
                                    MINT_TX_FEE_ESTIMATE
                                    ? "text-coral"
                                    : "text-red-400",
                                )}
                              >
                                {taskToken.walletBalance.toFixed(4)} SOL
                              </span>
                            ) : (
                              <span className="text-xs text-white/30">--</span>
                            )}
                          </div>
                          {taskToken.walletBalance !== null &&
                            taskToken.walletBalance < MINT_TX_FEE_ESTIMATE && (
                              <p className="mt-2 flex items-center gap-1 text-xs text-red-400">
                                <AlertCircle className="size-3" />
                                Need at least ~{MINT_TX_FEE_ESTIMATE} SOL for
                                launch fees
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  )}

                  {!useTaskToken && (
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 text-center">
                      <Shield className="mx-auto size-8 text-white/10" />
                      <p className="mt-2 text-sm text-white/30">
                        No task token — this task will use SOL escrow only.
                      </p>
                      {budgetNum <= 0 && (
                        <p className="mt-2 rounded-lg bg-red-500/5 px-3 py-2 text-xs text-red-400">
                          You need either a task token or a SOL budget. Go back
                          to set a budget.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(2)}
                    className="text-white/50 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 size-4" /> Previous
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={!canProceedStep3()}
                    className={cn(
                      "font-semibold px-6",
                      canProceedStep3()
                        ? "bg-coral text-black hover:bg-coral/90 shadow-lg shadow-coral/20"
                        : "bg-white/5 text-white/20 cursor-not-allowed",
                    )}
                  >
                    Next: Review <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Review & Pay ─────────────────────────────────── */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="rounded-2xl border border-white/10 bg-surface/80 p-6 sm:p-8">
                  <h2 className="mb-6 text-xl font-semibold text-white font-display">
                    Review Your Task
                  </h2>

                  {listingContext && (
                    <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-coral/20 bg-coral/5 px-3 py-2 text-sm text-coral">
                      <Briefcase className="size-4" />
                      Hiring: {listingContext.title}
                    </div>
                  )}

                  <div className="space-y-5">
                    <ReviewItem label="Title" value={title} />
                    <ReviewItem
                      label="Description"
                      value={description}
                      multiline
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ReviewItem
                        label="Category"
                        value={
                          CATEGORY_LABELS[category as MarketplaceCategory] ??
                          category
                        }
                      />
                      <ReviewItem
                        label="Remote"
                        value={isRemote ? "Remote OK" : location || "On-site"}
                      />
                      {deadline && (
                        <ReviewItem
                          label="Deadline"
                          value={new Date(
                            deadline + "T00:00:00",
                          ).toLocaleDateString()}
                        />
                      )}
                      {location && (
                        <ReviewItem label="Location" value={location} />
                      )}
                    </div>
                    {requirements.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">
                          Requirements
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {requirements.map((req, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-white/60"
                            >
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-coral" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {useMilestones && milestones.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">
                          Milestones
                        </p>
                        <div className="mt-2 space-y-2">
                          {milestones.map((m, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
                            >
                              <span className="text-white/60">{m.title}</span>
                              <span className="font-bold text-coral">
                                {m.amountSol} SOL
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Task Token Notice */}
                {useTaskToken && (
                  <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 sm:p-8">
                    <div className="flex items-start gap-3">
                      {taskImageUrl ? (
                        <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-purple-500/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={taskImageUrl}
                            alt={tokenSymbol}
                            className="size-full object-cover"
                          />
                        </div>
                      ) : (
                        <Coins className="mt-0.5 size-5 shrink-0 text-purple-400" />
                      )}
                      <div>
                        <p className="font-semibold text-white">
                          Task Token: ${tokenSymbol}
                        </p>
                        <p className="mt-1 text-sm text-white/40">
                          A token will be launched on Bags.fm. 100% of creator
                          trading fees accumulate as the bounty pool and are
                          paid to the worker on task completion.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SOL Escrow Notice */}
                {budgetNum > 0 && (
                  <div className="rounded-2xl border border-coral/20 bg-coral/5 p-6 sm:p-8">
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 size-5 shrink-0 text-coral" />
                      <div>
                        <p className="font-semibold text-white">
                          SOL Escrow: {budgetNum} SOL
                        </p>
                        <p className="mt-1 text-sm text-white/40">
                          {budgetNum} SOL will be locked in escrow
                          {useTaskToken
                            ? " on top of the task token bounty pool"
                            : ""}
                          . Funds are released to the worker upon approval, or
                          refunded if cancelled.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Launch Progress */}
                {(taskToken.isLaunching || taskToken.launchResult) &&
                  taskToken.launchSteps.length > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-surface/80 p-6 sm:p-8">
                      <h3 className="mb-4 text-sm font-semibold text-white/60">
                        Token Launch Progress
                      </h3>
                      <div className="space-y-3">
                        {taskToken.launchSteps.map((ls) => (
                          <div key={ls.id} className="flex items-center gap-3">
                            {ls.status === "loading" && (
                              <Loader2 className="size-4 animate-spin text-coral" />
                            )}
                            {ls.status === "complete" && (
                              <CheckCircle2 className="size-4 text-green-400" />
                            )}
                            {ls.status === "error" && (
                              <X className="size-4 text-red-400" />
                            )}
                            {ls.status === "pending" && (
                              <div className="size-4 rounded-full border border-white/15" />
                            )}
                            <span
                              className={cn(
                                "text-sm",
                                ls.status === "complete"
                                  ? "text-white/60"
                                  : ls.status === "loading"
                                    ? "text-coral"
                                    : ls.status === "error"
                                      ? "text-red-400"
                                      : "text-white/25",
                              )}
                            >
                              {ls.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      {taskToken.launchResult && (
                        <div className="mt-4 flex items-center gap-2">
                          <a
                            href={getBagsFmUrl(
                              taskToken.launchResult.tokenMint,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-coral hover:underline"
                          >
                            View on Bags.fm
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(3)}
                    className="text-white/50 hover:text-white"
                    disabled={submitting || taskToken.isLaunching}
                  >
                    <ArrowLeft className="mr-2 size-4" /> Previous
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      submitting ||
                      taskToken.isLaunching ||
                      (!useTaskToken && budgetNum <= 0)
                    }
                    className="bg-coral text-black hover:bg-coral/90 font-bold shadow-lg shadow-coral/20 px-8"
                  >
                    {submitting || taskToken.isLaunching ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : useTaskToken ? (
                      <Coins className="mr-2 size-4" />
                    ) : (
                      <Lock className="mr-2 size-4" />
                    )}
                    {taskToken.isLaunching
                      ? "Launching Token..."
                      : submitting
                        ? "Creating Task..."
                        : useTaskToken
                          ? "Launch Token & Post Task"
                          : "Post Task & Lock Escrow"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({
  label,
  tooltip,
  optional,
}: {
  label: string;
  tooltip: string;
  optional?: boolean;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <label className="text-sm font-medium text-white/60">{label}</label>
      {optional && (
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/25">
          optional
        </span>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-white/20 transition-colors hover:text-white/40"
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
    </div>
  );
}

function ReviewItem({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm text-white/60",
          multiline && "whitespace-pre-wrap",
        )}
      >
        {value}
      </p>
    </div>
  );
}
