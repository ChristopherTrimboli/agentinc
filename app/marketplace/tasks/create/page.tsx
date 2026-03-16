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
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  MARKETPLACE_CATEGORIES,
  CATEGORY_LABELS,
  type MarketplaceCategory,
  type Milestone,
  type CreateTaskInput,
} from "@/lib/marketplace/types";
import { Button } from "@/components/ui/button";

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

  const [listingContext, setListingContext] = useState<ListingContext | null>(
    null,
  );

  useEffect(() => {
    if (ready && !authenticated) login();
  }, [ready, authenticated, login]);

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
    if (budgetNum <= 0) return false;
    if (useMilestones) {
      const validMilestones = milestones.every(
        (m) => m.title.trim() && parseFloat(m.amountSol) > 0,
      );
      return validMilestones && !milestoneMismatch;
    }
    return true;
  }

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="mx-auto max-w-3xl">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            href="/marketplace"
            className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to Marketplace
          </Link>
        </motion.div>

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white font-display">
            Post a Task
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Describe what you need done, set a budget, and lock escrow.
          </p>
        </motion.div>

        {/* Listing badge */}
        {listingContext && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-coral/20 bg-coral/5 px-4 py-2.5"
          >
            <Briefcase className="size-4 text-coral" />
            <span className="text-sm text-coral">
              Hiring:{" "}
              <span className="font-semibold">{listingContext.title}</span>
            </span>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs capitalize text-white/40">
              {listingContext.type}
            </span>
          </motion.div>
        )}

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
              <h2 className="mb-6 text-xl font-semibold text-white font-display">
                Task Details
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/60">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Build a Solana token swap UI"
                    maxLength={200}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/60">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the task in detail..."
                    rows={5}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/60">
                    Category
                  </label>
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
                  <label className="mb-1.5 block text-sm font-medium text-white/60">
                    Requirements
                  </label>
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
                      placeholder="Add a requirement and press Enter"
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
                    <label className="mb-1.5 block text-sm font-medium text-white/60">
                      Location (optional)
                    </label>
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
                    <label className="mb-1.5 block text-sm font-medium text-white/60">
                      Remote Work
                    </label>
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
                  <label className="mb-1.5 block text-sm font-medium text-white/60">
                    Deadline (optional)
                  </label>
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
              <h2 className="mb-6 text-xl font-semibold text-white font-display">
                Budget & Milestones
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/60">
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
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-2xl font-bold text-white placeholder-white/15 focus:border-coral/30 focus:outline-none focus:ring-1 focus:ring-coral/20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-coral/50">
                      SOL
                    </span>
                  </div>
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
                                updateMilestone(i, "amountSol", e.target.value)
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
                  Next: Review <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Review & Pay ─────────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
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

              {/* Escrow Notice */}
              <div className="rounded-2xl border border-coral/20 bg-coral/5 p-6 sm:p-8">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 size-5 shrink-0 text-coral" />
                  <div>
                    <p className="font-semibold text-white">
                      Escrow: {budgetNum} SOL
                    </p>
                    <p className="mt-1 text-sm text-white/40">
                      {budgetNum} SOL will be locked in escrow until the task is
                      completed and approved. Funds are released to the worker
                      upon approval, or refunded to you if cancelled.
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep(2)}
                  className="text-white/50 hover:text-white"
                >
                  <ArrowLeft className="mr-2 size-4" /> Previous
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-coral text-black hover:bg-coral/90 font-bold shadow-lg shadow-coral/20 px-8"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Lock className="mr-2 size-4" />
                  )}
                  Post Task & Lock Escrow
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
