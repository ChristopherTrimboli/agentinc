"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/lib/auth/AuthProvider";
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
} from "lucide-react";
import Link from "next/link";
import {
  MARKETPLACE_CATEGORIES,
  CATEGORY_LABELS,
  type MarketplaceCategory,
  type Milestone,
  type CreateTaskInput,
} from "@/lib/marketplace/types";

// ── Types ────────────────────────────────────────────────────────────────

interface ListingContext {
  id: string;
  title: string;
  type: string;
}

const STEPS = [
  { label: "Details", step: 1 },
  { label: "Budget", step: 2 },
  { label: "Review", step: 3 },
] as const;

export default function CreateTaskPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
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

  // Step 1: Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MarketplaceCategory | "">("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newRequirement, setNewRequirement] = useState("");
  const [location, setLocation] = useState("");
  const [isRemote, setIsRemote] = useState(true);
  const [deadline, setDeadline] = useState("");

  // Step 2: Budget & Milestones
  const [budgetSol, setBudgetSol] = useState("");
  const [useMilestones, setUseMilestones] = useState(false);
  const [milestones, setMilestones] = useState<
    { title: string; amountSol: string }[]
  >([{ title: "", amountSol: "" }]);

  // Listing context
  const [listingContext, setListingContext] = useState<ListingContext | null>(
    null,
  );

  // Auth gate
  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
  }, [ready, authenticated, login]);

  // Fetch listing context if listingId is present
  const fetchListing = useCallback(async () => {
    if (!listingId) return;
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}`);
      if (res.ok) {
        const data = await res.json();
        setListingContext({ id: data.id, title: data.title, type: data.type });
      }
    } catch {
      // Non-critical — listing context is optional
    }
  }, [listingId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  // ── Requirement helpers ────────────────────────────────────────────────

  function addRequirement() {
    const trimmed = newRequirement.trim();
    if (!trimmed) return;
    setRequirements((prev) => [...prev, trimmed]);
    setNewRequirement("");
  }

  function removeRequirement(index: number) {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Milestone helpers ──────────────────────────────────────────────────

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

  const milestoneTotal = milestones.reduce(
    (sum, m) => sum + (parseFloat(m.amountSol) || 0),
    0,
  );
  const budgetNum = parseFloat(budgetSol) || 0;
  const milestoneMismatch =
    useMilestones &&
    milestones.length > 0 &&
    Math.abs(milestoneTotal - budgetNum) > 0.001;

  // ── Step Validation ────────────────────────────────────────────────────

  function canProceedStep1(): boolean {
    return (
      title.trim().length > 0 &&
      description.trim().length > 0 &&
      category !== ""
    );
  }

  function canProceedStep2(): boolean {
    if (budgetNum <= 0) return false;
    if (useMilestones) {
      const validMilestones = milestones.every(
        (m) => m.title.trim() && parseFloat(m.amountSol) > 0,
      );
      return validMilestones && !milestoneMismatch;
    }
    return true;
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!authenticated) return login();
    setSubmitting(true);
    setError("");

    try {
      const payload: CreateTaskInput = {
        title: title.trim(),
        description: description.trim(),
        category: category as MarketplaceCategory,
        requirements,
        budgetSol: budgetNum,
        isRemote,
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
      router.push(`/marketplace/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000028]">
        <Loader2 className="size-8 animate-spin text-[#6FEC06]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000028] pb-20">
      <div className="mx-auto max-w-3xl px-4 pt-8">
        {/* Back button */}
        <Link
          href="/marketplace"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to Marketplace
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Post a Task</h1>
          <p className="mt-1 text-sm text-white/50">
            Describe what you need done, set a budget, and lock escrow.
          </p>
        </div>

        {/* Listing badge */}
        {listingContext && (
          <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-[#6FEC06]/20 bg-[#6FEC06]/5 px-4 py-2.5">
            <Briefcase className="size-4 text-[#6FEC06]" />
            <span className="text-sm text-[#6FEC06]">
              Hiring:{" "}
              <span className="font-semibold">{listingContext.title}</span>
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize text-white/50">
              {listingContext.type}
            </span>
          </div>
        )}

        {/* Step Indicator */}
        <div className="mb-10 flex items-center justify-center gap-0">
          {STEPS.map(({ label, step: s }, i) => {
            const isCompleted = step > s;
            const isActive = step === s;
            return (
              <div key={s} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`h-0.5 w-12 sm:w-20 ${
                      isCompleted ? "bg-[#6FEC06]" : "bg-white/10"
                    }`}
                  />
                )}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                      isCompleted
                        ? "border-[#6FEC06] bg-[#6FEC06] text-black"
                        : isActive
                          ? "border-[#6FEC06] bg-[#6FEC06]/20 text-[#6FEC06]"
                          : "border-white/10 bg-white/5 text-white/30"
                    }`}
                  >
                    {isCompleted ? "✓" : s}
                  </div>
                  <span
                    className={`text-xs ${
                      isCompleted || isActive
                        ? "text-white/90"
                        : "text-white/30"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 underline hover:no-underline"
            >
              dismiss
            </button>
          </div>
        )}

        {/* ── Step 1: Details ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="rounded-2xl border border-white/10 bg-[#0a0520]/80 p-6 sm:p-8">
            <h2 className="mb-6 text-xl font-semibold text-white">
              Task Details
            </h2>
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Build a Solana token swap UI"
                  maxLength={200}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the task in detail, including deliverables and acceptance criteria..."
                  rows={5}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30"
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as MarketplaceCategory)
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30 [&>option]:bg-[#0a0520] [&>option]:text-white"
                >
                  <option value="">Select a category</option>
                  {MARKETPLACE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Requirements */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">
                  Requirements
                </label>
                {requirements.length > 0 && (
                  <ul className="mb-3 space-y-2">
                    {requirements.map((req, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70"
                      >
                        <CheckCircle2 className="size-4 shrink-0 text-[#6FEC06]" />
                        <span className="flex-1">{req}</span>
                        <button
                          type="button"
                          onClick={() => removeRequirement(i)}
                          className="shrink-0 text-white/30 transition-colors hover:text-red-400"
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
                    placeholder="Add a requirement and press Enter"
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30"
                  />
                  <button
                    type="button"
                    onClick={addRequirement}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white/50 transition-colors hover:border-[#6FEC06]/30 hover:text-[#6FEC06]"
                  >
                    <Plus className="size-5" />
                  </button>
                </div>
              </div>

              {/* Location + Remote */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/70">
                    Location (optional)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. New York, NY"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white placeholder-white/30 focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/70">
                    Remote Work
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsRemote(!isRemote)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors ${
                      isRemote
                        ? "border-[#6FEC06]/30 bg-[#6FEC06]/10 text-[#6FEC06]"
                        : "border-white/10 bg-white/5 text-white/50"
                    }`}
                  >
                    <MapPin className="size-4" />
                    {isRemote ? "Remote OK" : "Not Remote"}
                  </button>
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">
                  Deadline (optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30 [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#6FEC06] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#6FEC06]/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next: Budget
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Budget & Milestones ──────────────────────────── */}
        {step === 2 && (
          <div className="rounded-2xl border border-white/10 bg-[#0a0520]/80 p-6 sm:p-8">
            <h2 className="mb-6 text-xl font-semibold text-white">
              Budget & Milestones
            </h2>
            <div className="space-y-5">
              {/* Budget */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">
                  Budget
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={budgetSol}
                    onChange={(e) => setBudgetSol(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-2xl font-bold text-white placeholder-white/20 focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-[#6FEC06]">
                    SOL
                  </span>
                </div>
              </div>

              {/* Milestones toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setUseMilestones(!useMilestones)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors ${
                    useMilestones
                      ? "border-[#6FEC06]/30 bg-[#6FEC06]/10 text-[#6FEC06]"
                      : "border-white/10 bg-white/5 text-white/50"
                  }`}
                >
                  <CheckCircle2
                    className={`size-4 ${useMilestones ? "text-[#6FEC06]" : "text-white/30"}`}
                  />
                  Split into milestones
                </button>
              </div>

              {/* Milestones list */}
              {useMilestones && (
                <div className="space-y-3">
                  {milestones.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-4"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs font-bold text-white/40">
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
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#6FEC06]/50 focus:outline-none"
                        />
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={m.amountSol}
                            onChange={(e) =>
                              updateMilestone(i, "amountSol", e.target.value)
                            }
                            placeholder="0.00"
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#6FEC06]/50 focus:outline-none"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6FEC06]">
                            SOL
                          </span>
                        </div>
                      </div>
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(i)}
                          className="mt-1 shrink-0 text-white/30 transition-colors hover:text-red-400"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addMilestone}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-white/40 transition-colors hover:border-[#6FEC06]/30 hover:text-[#6FEC06]"
                  >
                    <Plus className="size-4" />
                    Add Milestone
                  </button>

                  {/* Sum indicator */}
                  <div
                    className={`flex items-center justify-between rounded-lg px-4 py-2 text-sm ${
                      milestoneMismatch
                        ? "bg-red-500/10 text-red-400"
                        : "bg-white/5 text-white/50"
                    }`}
                  >
                    <span>Milestone total</span>
                    <span className="font-semibold">
                      {milestoneTotal.toFixed(2)} / {budgetNum.toFixed(2)} SOL
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

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
              >
                <ArrowLeft className="size-4" />
                Previous
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#6FEC06] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#6FEC06]/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next: Review
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Pay ─────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0520]/80 p-6 sm:p-8">
              <h2 className="mb-6 text-xl font-semibold text-white">
                Review Your Task
              </h2>

              {listingContext && (
                <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-[#6FEC06]/20 bg-[#6FEC06]/5 px-3 py-2 text-sm text-[#6FEC06]">
                  <Briefcase className="size-4" />
                  Hiring: {listingContext.title}
                </div>
              )}

              <div className="space-y-5">
                {/* Title & Description */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">
                    Title
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {title}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">
                    Description
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">
                    {description}
                  </p>
                </div>

                {/* Details grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/40">
                      Category
                    </p>
                    <p className="mt-1 text-sm text-white/70">
                      {CATEGORY_LABELS[category as MarketplaceCategory] ??
                        category}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/40">
                      Remote
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-white/70">
                      <MapPin className="size-3 text-blue-400" />
                      {isRemote ? "Remote OK" : location || "On-site"}
                    </p>
                  </div>
                  {deadline && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-white/40">
                        Deadline
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-white/70">
                        <Calendar className="size-3" />
                        {new Date(deadline + "T00:00:00").toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {location && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-white/40">
                        Location
                      </p>
                      <p className="mt-1 text-sm text-white/70">{location}</p>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                {requirements.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/40">
                      Requirements
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {requirements.map((req, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-white/70"
                        >
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#6FEC06]" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Milestones */}
                {useMilestones && milestones.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/40">
                      Milestones
                    </p>
                    <div className="mt-2 space-y-2">
                      {milestones.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
                        >
                          <span className="text-white/70">{m.title}</span>
                          <span className="font-semibold text-[#6FEC06]">
                            {m.amountSol} SOL
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Escrow Notice + Submit */}
            <div className="rounded-2xl border border-[#6FEC06]/20 bg-[#6FEC06]/5 p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 size-5 shrink-0 text-[#6FEC06]" />
                <div>
                  <p className="font-semibold text-white">
                    Escrow: {budgetNum} SOL
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {budgetNum} SOL will be locked in escrow until the task is
                    completed and approved. Funds are released to the worker
                    upon approval, or refunded to you if cancelled.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
              >
                <ArrowLeft className="size-4" />
                Previous
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#6FEC06] px-8 py-3 text-sm font-bold text-black transition-all hover:bg-[#6FEC06]/90 hover:shadow-lg hover:shadow-[#6FEC06]/20 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Lock className="size-4" />
                )}
                Post Task & Lock Escrow
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
