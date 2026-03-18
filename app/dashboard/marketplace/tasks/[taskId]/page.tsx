"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  Calendar,
  User,
  Send,
  FileText,
  Star,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Shield,
  Zap,
  X,
  ExternalLink,
  Coins,
  Copy,
  Check,
  Ban,
} from "lucide-react";
import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";
import { getBagsFmUrl, getSolscanUrl } from "@/lib/constants/urls";
import StatusTimeline from "@/components/marketplace/StatusTimeline";
import EscrowBadge from "@/components/marketplace/EscrowBadge";
import BidCard from "@/components/marketplace/BidCard";
import {
  CATEGORY_LABELS,
  type MarketplaceCategory,
  type Milestone,
} from "@/lib/marketplace/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ── Types ────────────────────────────────────────────────────────────────

interface TaskBid {
  id: string;
  amountSol: number;
  message?: string | null;
  estimatedTime?: string | null;
  status: string;
  createdAt: string;
  bidder?: {
    id: string;
    activeWallet?: { address: string } | null;
  } | null;
  bidderAgent?: { id: string; name: string; imageUrl: string | null } | null;
}

interface TaskReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    activeWallet?: { address: string } | null;
  };
}

interface TaskData {
  id: string;
  title: string;
  description: string;
  category: string;
  requirements: string[];
  status: string;
  budgetSol: number;
  featuredImage?: string | null;
  escrowAmount?: number | null;
  escrowStatus: string;
  milestones?: Milestone[] | null;
  posterId: string;
  poster: {
    id: string;
    activeWallet?: { address: string } | null;
  };
  workerId?: string | null;
  worker?: {
    id: string;
    activeWallet?: { address: string } | null;
  } | null;
  workerAgent?: {
    id: string;
    name: string;
    imageUrl: string | null;
    createdById?: string | null;
  } | null;
  listing?: { id: string; title: string; type: string } | null;
  deliverables?: string | null;
  disputeReason?: string | null;
  location?: string | null;
  isRemote: boolean;
  deadline?: string | null;
  completedAt?: string | null;
  tokenMint?: string | null;
  tokenSymbol?: string | null;
  tokenMetadata?: string | null;
  tokenLaunchSignature?: string | null;
  tokenFeesClaimed?: number | string | null;
  bids: TaskBid[];
  reviews: TaskReview[];
  createdAt: string;
  updatedAt: string;
}

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const { user, authenticated, login } = usePrivy();
  const { authFetch } = useAuth();

  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bidAmount, setBidAmount] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [bidTime, setBidTime] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);

  const [deliverables, setDeliverables] = useState("");
  const [submittingDeliverables, setSubmittingDeliverables] = useState(false);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [copiedMint, setCopiedMint] = useState(false);
  const [liveEarnings, setLiveEarnings] = useState<number | null>(null);

  const currentUserId = user?.id ?? null;
  const isPoster = currentUserId === task?.posterId;
  const isWorker =
    currentUserId === task?.workerId ||
    (!!task?.workerAgent?.createdById &&
      currentUserId === task.workerAgent.createdById);
  const hasReviewed =
    task?.reviews?.some((r) => r.reviewer.id === currentUserId) ?? false;
  const canCancel =
    isPoster &&
    !!task &&
    ["open", "assigned", "disputed"].includes(task.status);

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/marketplace/tasks/${taskId}`);
      if (!res.ok) throw new Error("Task not found");
      const data = await res.json();
      setTask(data);
    } catch {
      setError("Failed to load task");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  useEffect(() => {
    if (!task?.tokenMint) return;
    let cancelled = false;

    async function fetchEarnings() {
      try {
        const res = await fetch(`/api/explore/prices?mints=${task!.tokenMint}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const priceData = data.prices?.[task!.tokenMint!];
        if (priceData?.earnings !== undefined && !cancelled) {
          setLiveEarnings(priceData.earnings);
        }
      } catch {
        // Non-critical
      }
    }

    fetchEarnings();
    const interval = setInterval(fetchEarnings, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [task?.tokenMint]);

  // ── Actions ──────────────────────────────────────────────────────────

  async function handlePlaceBid(e: React.FormEvent) {
    e.preventDefault();
    if (!authenticated) return login();
    const parsedAmount = parseFloat(bidAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Bid amount must be a positive number");
      return;
    }
    setSubmittingBid(true);
    try {
      const res = await authFetch(`/api/marketplace/tasks/${taskId}/bid`, {
        method: "POST",
        body: JSON.stringify({
          amountSol: parsedAmount,
          message: bidMessage || undefined,
          estimatedTime: bidTime || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to place bid");
      }
      setBidAmount("");
      setBidMessage("");
      setBidTime("");
      await fetchTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bid");
    } finally {
      setSubmittingBid(false);
    }
  }

  async function handleAcceptBid(bidId: string) {
    setActionLoading(bidId);
    try {
      const res = await authFetch(`/api/marketplace/tasks/${taskId}/assign`, {
        method: "POST",
        body: JSON.stringify({ bidId }),
      });
      if (!res.ok) throw new Error("Failed to accept bid");
      await fetchTask();
    } catch {
      setError("Failed to accept bid");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSubmitDeliverables(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingDeliverables(true);
    try {
      const res = await authFetch(`/api/marketplace/tasks/${taskId}/submit`, {
        method: "POST",
        body: JSON.stringify({ deliverables }),
      });
      if (!res.ok) throw new Error("Failed to submit deliverables");
      await fetchTask();
    } catch {
      setError("Failed to submit deliverables");
    } finally {
      setSubmittingDeliverables(false);
    }
  }

  async function handleApprove() {
    setActionLoading("approve");
    try {
      const res = await authFetch(`/api/marketplace/tasks/${taskId}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve");
      await fetchTask();
    } catch {
      setError("Failed to approve deliverables");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDispute() {
    if (!disputeReason.trim()) return;
    setActionLoading("dispute");
    try {
      const res = await authFetch(`/api/marketplace/tasks/${taskId}/dispute`, {
        method: "POST",
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      if (!res.ok) throw new Error("Failed to dispute");
      setDisputeOpen(false);
      setDisputeReason("");
      await fetchTask();
    } catch {
      setError("Failed to dispute task");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!authenticated) return login();
    setSubmittingReview(true);
    try {
      const res = await authFetch(`/api/marketplace/tasks/${taskId}/review`, {
        method: "POST",
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit review");
      setReviewRating(0);
      setReviewComment("");
      await fetchTask();
    } catch {
      setError("Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Are you sure you want to cancel this task?")) return;
    setActionLoading("cancel");
    try {
      const res = await authFetch(`/api/marketplace/tasks/${taskId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel");
      }
      await fetchTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel task");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Loading / Error States ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-coral" />
          <p className="text-sm text-white/30">Loading task...</p>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-white"
      >
        <div className="flex size-20 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5">
          <AlertTriangle className="size-8 text-red-400" />
        </div>
        <p className="text-lg font-medium text-white/40">{error}</p>
        <Link
          href="/dashboard/marketplace"
          className="text-sm text-coral hover:underline"
        >
          Back to Marketplace
        </Link>
      </motion.div>
    );
  }

  if (!task) return null;

  const categoryLabel =
    CATEGORY_LABELS[task.category as MarketplaceCategory] ?? task.category;
  const milestones = (task.milestones ?? []) as Milestone[];
  const completedMilestones = milestones.filter(
    (m) => m.status === "completed" || m.status === "released",
  );

  return (
    <div className="min-h-screen overflow-x-hidden p-4 pb-20 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl min-w-0">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            href="/dashboard/marketplace"
            className="mb-6 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to Marketplace
          </Link>
        </motion.div>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400"
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

        {/* Featured Image */}
        {task.featuredImage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6"
          >
            <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-white/10 sm:h-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={task.featuredImage}
                alt={task.title}
                className="size-full object-cover"
              />
            </div>
          </motion.div>
        )}

        {/* Title + Status */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
            {task.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/40">
            <span>
              Posted by{" "}
              {task.poster.activeWallet?.address ? (
                <Link
                  href={`/profile/${task.poster.activeWallet.address}`}
                  className="text-white/60 hover:text-[#6FEC06] transition-colors"
                >
                  {`${task.poster.activeWallet.address.slice(0, 4)}...${task.poster.activeWallet.address.slice(-4)}`}
                </Link>
              ) : (
                <span className="text-white/60">Anonymous</span>
              )}
            </span>
            <span className="text-white/15">·</span>
            <span>{timeAgo(task.createdAt)}</span>
          </div>
        </motion.div>

        {/* Status Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 rounded-2xl border border-white/10 bg-surface/80 p-4 px-4 sm:p-6 sm:px-8 pb-2"
        >
          <StatusTimeline currentStatus={task.status} />
          <div className="mt-4 flex items-center gap-3">
            <EscrowBadge
              status={task.escrowStatus}
              amount={task.escrowAmount ?? undefined}
            />
          </div>
        </motion.div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-3">
          {/* ── Main Content ───────────────────────────────────────── */}
          <div className="min-w-0 space-y-6 lg:col-span-2">
            {/* Description */}
            <motion.section
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-white/10 bg-surface/80 p-4 sm:p-6"
            >
              <h2 className="mb-3 text-lg font-semibold text-white font-display">
                Description
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/60">
                {task.description}
              </p>
            </motion.section>

            {/* Requirements */}
            {task.requirements.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-2xl border border-white/10 bg-surface/80 p-4 sm:p-6"
              >
                <h2 className="mb-3 text-lg font-semibold text-white font-display">
                  Requirements
                </h2>
                <ul className="space-y-2">
                  {task.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-white/60"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-coral" />
                      {req}
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border border-white/10 bg-surface/80 p-4 sm:p-6"
              >
                <h2 className="mb-3 text-lg font-semibold text-white font-display">
                  Milestones
                </h2>

                <div className="mb-4">
                  <div className="mb-1.5 flex justify-between text-xs text-white/40">
                    <span>
                      {completedMilestones.length} of {milestones.length}{" "}
                      completed
                    </span>
                    <span className="font-medium text-white/60">
                      {Math.round(
                        (completedMilestones.length / milestones.length) * 100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(completedMilestones.length / milestones.length) * 100}%`,
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full bg-coral shadow-[0_0_8px_rgba(111,236,6,0.3)]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {milestones.map((m, i) => {
                    const isComplete =
                      m.status === "completed" || m.status === "released";
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3",
                          isComplete
                            ? "border-coral/20 bg-coral/5"
                            : "border-white/5 bg-white/[0.02]",
                        )}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              isComplete
                                ? "bg-coral text-black"
                                : "border border-white/15 text-white/30",
                            )}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="size-3.5" />
                            ) : (
                              i + 1
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-sm min-w-0 break-words",
                              isComplete ? "text-white/80" : "text-white/50",
                            )}
                          >
                            {m.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pl-8 sm:pl-0 shrink-0">
                          <span className="text-sm font-bold text-coral">
                            {m.amountSol} SOL
                          </span>
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize",
                              m.status === "released"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : m.status === "completed"
                                  ? "bg-blue-500/10 text-blue-400"
                                  : "bg-white/5 text-white/30",
                            )}
                          >
                            {m.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* Worker Section */}
            {task.workerId && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="rounded-2xl border border-white/10 bg-surface/80 p-4 sm:p-6"
              >
                <h2 className="mb-3 text-lg font-semibold text-white font-display">
                  Worker
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/5">
                    <User className="size-5 text-white/50" />
                  </div>
                  <div>
                    {task.worker?.activeWallet?.address ? (
                      <Link
                        href={`/profile/${task.worker.activeWallet.address}`}
                        className="text-sm font-medium text-white hover:text-[#6FEC06] transition-colors"
                      >
                        {task.workerAgent?.name ??
                          `${task.worker.activeWallet.address.slice(0, 4)}...${task.worker.activeWallet.address.slice(-4)}`}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-white">
                        {task.workerAgent?.name ?? "Anonymous"}
                      </p>
                    )}
                    <p className="text-xs text-white/30">Assigned worker</p>
                  </div>
                </div>

                {/* Worker: submit deliverables */}
                {isWorker &&
                  (task.status === "assigned" ||
                    task.status === "in_progress" ||
                    task.status === "disputed") && (
                    <form
                      onSubmit={handleSubmitDeliverables}
                      className="mt-4 space-y-3"
                    >
                      <label className="block text-xs font-medium text-white/40">
                        {task.status === "disputed"
                          ? "Submit Revised Deliverables"
                          : "Submit Deliverables"}
                      </label>
                      <Textarea
                        value={deliverables}
                        onChange={(e) => setDeliverables(e.target.value)}
                        placeholder="Describe your deliverables, attach links..."
                        className="bg-surface-light border-white/10 text-white placeholder:text-white/25 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                        rows={4}
                        maxLength={50000}
                        required
                      />
                      <Button
                        type="submit"
                        disabled={submittingDeliverables}
                        className="bg-coral text-black hover:bg-coral/90 font-semibold"
                      >
                        {submittingDeliverables ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 size-4" />
                        )}
                        {task.status === "disputed"
                          ? "Re-submit Deliverables"
                          : "Submit Deliverables"}
                      </Button>
                    </form>
                  )}

                {/* Display dispute reason */}
                {task.status === "disputed" && task.disputeReason && (
                  <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-400">
                      <AlertTriangle className="size-4" />
                      Dispute Reason
                    </h3>
                    <p className="whitespace-pre-wrap text-sm text-red-300/70">
                      {task.disputeReason}
                    </p>
                  </div>
                )}

                {/* Display deliverables */}
                {task.deliverables && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <h3 className="mb-2 text-sm font-semibold text-white/70">
                      Deliverables
                    </h3>
                    <p className="whitespace-pre-wrap text-sm text-white/50">
                      {task.deliverables}
                    </p>
                  </div>
                )}

                {/* Poster actions during review */}
                {isPoster && task.status === "review" && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      onClick={handleApprove}
                      disabled={actionLoading === "approve"}
                      className="bg-coral text-black hover:bg-coral/90 font-semibold shadow-lg shadow-coral/10"
                    >
                      {actionLoading === "approve" ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 size-4" />
                      )}
                      Approve & Release Escrow
                    </Button>
                    <Button
                      onClick={() => setDisputeOpen(true)}
                      disabled={actionLoading === "dispute"}
                      variant="destructive"
                      className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    >
                      <AlertTriangle className="mr-2 size-4" />
                      Dispute
                    </Button>
                  </div>
                )}

                {/* Poster: cancel task */}
                {canCancel && (
                  <div className="mt-4 border-t border-white/5 pt-4">
                    <Button
                      onClick={handleCancel}
                      disabled={actionLoading === "cancel"}
                      variant="ghost"
                      className="text-white/30 hover:text-red-400 hover:bg-red-500/10"
                      size="sm"
                    >
                      {actionLoading === "cancel" ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Ban className="mr-2 size-4" />
                      )}
                      Cancel Task
                    </Button>
                  </div>
                )}
              </motion.section>
            )}

            {/* Poster cancel for tasks without a worker (open tasks) */}
            {canCancel && !task.workerId && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="rounded-2xl border border-white/10 bg-surface/80 p-4 sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white font-display">
                    Task Actions
                  </h2>
                  <Button
                    onClick={handleCancel}
                    disabled={actionLoading === "cancel"}
                    variant="ghost"
                    className="text-white/30 hover:text-red-400 hover:bg-red-500/10"
                    size="sm"
                  >
                    {actionLoading === "cancel" ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Ban className="mr-2 size-4" />
                    )}
                    Cancel Task
                  </Button>
                </div>
              </motion.section>
            )}

            {/* Bids Section */}
            {(task.status === "open" || task.status === "assigned") && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                id="bids"
                className="rounded-2xl border border-white/10 bg-surface/80 p-4 sm:p-6"
              >
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white font-display">
                  <MessageSquare className="size-5 text-white/40" />
                  Bids
                  <span className="text-sm font-normal text-white/30">
                    ({task.bids.length})
                  </span>
                </h2>

                {task.bids.length > 0 ? (
                  <div className="space-y-3">
                    {task.bids.map((bid) => (
                      <BidCard
                        key={bid.id}
                        {...bid}
                        isTaskPoster={isPoster}
                        accepting={actionLoading === bid.id}
                        onAccept={
                          isPoster && bid.status === "pending"
                            ? handleAcceptBid
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] py-8 text-center">
                    <MessageSquare className="mx-auto size-8 text-white/10" />
                    <p className="mt-2 text-sm text-white/30">
                      No bids yet. Be the first!
                    </p>
                  </div>
                )}

                {/* Place Bid Form */}
                {task.status === "open" && !isPoster && authenticated && (
                  <form
                    onSubmit={handlePlaceBid}
                    className="mt-6 space-y-4 border-t border-white/10 pt-6"
                  >
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Zap className="size-4 text-coral" />
                      Place a Bid
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-white/40">
                          Amount (SOL)
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            placeholder="0.00"
                            required
                            className="h-11 pr-12 bg-surface-light border-white/10 text-white placeholder:text-white/20 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-coral/60">
                            SOL
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-white/40">
                          Estimated Time
                        </label>
                        <Input
                          type="text"
                          value={bidTime}
                          onChange={(e) => setBidTime(e.target.value)}
                          placeholder="e.g. 3 days"
                          className="h-11 bg-surface-light border-white/10 text-white placeholder:text-white/20 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white/40">
                        Message
                      </label>
                      <Textarea
                        value={bidMessage}
                        onChange={(e) => setBidMessage(e.target.value)}
                        placeholder="Why are you the best fit for this task?"
                        rows={3}
                        maxLength={5000}
                        className="bg-surface-light border-white/10 text-white placeholder:text-white/20 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submittingBid || !bidAmount}
                      className="bg-coral text-black hover:bg-coral/90 font-semibold shadow-lg shadow-coral/10"
                    >
                      {submittingBid ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 size-4" />
                      )}
                      Place Bid
                    </Button>
                  </form>
                )}

                {task.status === "open" && !authenticated && (
                  <div className="mt-6 border-t border-white/10 pt-6 text-center">
                    <Button
                      onClick={login}
                      className="bg-coral text-black hover:bg-coral/90 font-semibold"
                    >
                      Sign in to Place a Bid
                    </Button>
                  </div>
                )}
              </motion.section>
            )}

            {/* Reviews Section */}
            {task.status === "completed" && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl border border-white/10 bg-surface/80 p-4 sm:p-6"
              >
                <h2 className="mb-4 text-lg font-semibold text-white font-display">
                  Reviews
                </h2>

                {task.reviews.length > 0 && (
                  <div className="mb-6 space-y-4">
                    {task.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-lg border border-white/15 bg-white/5">
                              <User className="size-4 text-white/50" />
                            </div>
                            {review.reviewer.activeWallet?.address ? (
                              <Link
                                href={`/profile/${review.reviewer.activeWallet.address}`}
                                className="text-sm text-white/60 hover:text-[#6FEC06] transition-colors"
                              >
                                {`${review.reviewer.activeWallet.address.slice(0, 4)}...${review.reviewer.activeWallet.address.slice(-4)}`}
                              </Link>
                            ) : (
                              <span className="text-sm text-white/60">
                                Anonymous
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "size-3.5",
                                  i < review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-white/10",
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="mt-2 text-sm text-white/50">
                            {review.comment}
                          </p>
                        )}
                        <p className="mt-2 text-[10px] text-white/25">
                          {timeAgo(review.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Review Form */}
                {authenticated && !hasReviewed && (isPoster || isWorker) && (
                  <form
                    onSubmit={handleSubmitReview}
                    className="space-y-4 border-t border-white/10 pt-4"
                  >
                    <h3 className="text-sm font-semibold text-white">
                      Leave a Review
                    </h3>
                    <div>
                      <label className="mb-2 block text-xs font-medium text-white/40">
                        Rating
                      </label>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setReviewRating(i + 1)}
                            onMouseEnter={() => setReviewHover(i + 1)}
                            onMouseLeave={() => setReviewHover(0)}
                            className="transition-transform hover:scale-125"
                          >
                            <Star
                              className={cn(
                                "size-7",
                                i < (reviewHover || reviewRating)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-white/15",
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white/40">
                        Comment (optional)
                      </label>
                      <Textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="How was your experience?"
                        rows={3}
                        maxLength={5000}
                        className="bg-surface-light border-white/10 text-white placeholder:text-white/20 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submittingReview || reviewRating === 0}
                      className="bg-coral text-black hover:bg-coral/90 font-semibold"
                    >
                      {submittingReview ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Star className="mr-2 size-4" />
                      )}
                      Submit Review
                    </Button>
                  </form>
                )}

                {task.reviews.length === 0 && !authenticated && (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] py-8 text-center">
                    <Star className="mx-auto size-8 text-white/10" />
                    <p className="mt-2 text-sm text-white/30">
                      No reviews yet.
                    </p>
                  </div>
                )}
              </motion.section>
            )}
          </div>

          {/* ── Sidebar ────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="min-w-0 space-y-4"
          >
            {/* Bounty Card */}
            {(() => {
              const creatorFees =
                liveEarnings ?? Number(task.tokenFeesClaimed ?? 0);
              const budget = Number(task.budgetSol ?? 0);
              const totalBounty = budget + creatorFees;
              const hasToken = !!task.tokenMint;

              return (
                <div className="rounded-2xl border border-coral/20 bg-coral/5 p-4 sm:p-6">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-coral/50">
                      {hasToken ? "Total Bounty" : "Budget"}
                    </p>
                    <p className="mt-1 text-3xl sm:text-4xl font-bold text-coral">
                      {totalBounty > 0
                        ? totalBounty < 0.01
                          ? totalBounty.toFixed(6)
                          : totalBounty.toFixed(2)
                        : "0"}
                    </p>
                    <p className="text-sm font-medium text-coral/40">SOL</p>
                  </div>

                  {hasToken && (
                    <div className="mt-4 space-y-2 border-t border-coral/10 pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/35">SOL Budget</span>
                        <span className="font-medium text-white/60">
                          {budget > 0 ? `${budget} SOL` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/35">Creator Fees</span>
                        <span className="font-medium text-[#6FEC06]">
                          {creatorFees > 0
                            ? `${creatorFees < 0.01 ? creatorFees.toFixed(6) : creatorFees.toFixed(4)} SOL`
                            : "0 SOL"}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/25 pt-1">
                        Creator fees accumulate from token trading on Bags.fm
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Task Token Card */}
            {task.tokenMint && (
              <div className="rounded-2xl border border-[#6FEC06]/20 bg-[#6FEC06]/5 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="size-4 text-[#6FEC06]" />
                  <h3 className="text-sm font-semibold text-white">
                    Task Token
                  </h3>
                </div>

                {task.tokenSymbol && (
                  <p className="text-xl sm:text-2xl font-bold text-[#6FEC06] mb-3">
                    {task.tokenSymbol}
                  </p>
                )}

                <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <code className="flex-1 truncate text-xs text-white/50">
                    {task.tokenMint}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(task.tokenMint!);
                      setCopiedMint(true);
                      setTimeout(() => setCopiedMint(false), 2000);
                    }}
                    className="shrink-0 rounded-md p-1 text-white/30 hover:bg-white/10 hover:text-white/60 transition-colors"
                  >
                    {copiedMint ? (
                      <Check className="size-3.5 text-[#6FEC06]" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>

                {/* Creator fees stat */}
                {(() => {
                  const fees =
                    liveEarnings ?? Number(task.tokenFeesClaimed ?? 0);
                  return (
                    <div className="mb-3 rounded-lg border border-[#6FEC06]/10 bg-[#6FEC06]/5 px-3 py-2.5 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6FEC06]/40">
                        Creator Fees Earned
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-[#6FEC06]">
                        {fees > 0
                          ? `${fees < 0.01 ? fees.toFixed(6) : fees.toFixed(4)} SOL`
                          : "0 SOL"}
                      </p>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <a
                    href={getBagsFmUrl(task.tokenMint)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#6FEC06]/30 bg-[#6FEC06]/10 px-4 py-2.5 text-sm font-semibold text-[#6FEC06] hover:bg-[#6FEC06]/20 transition-all"
                  >
                    <Zap className="size-4" />
                    Buy on Bags
                    <ExternalLink className="size-3" />
                  </a>
                  <a
                    href={getSolscanUrl("token", task.tokenMint)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/50 hover:bg-white/10 hover:text-white/70 transition-all"
                  >
                    View on Solscan
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                {task.tokenLaunchSignature && (
                  <a
                    href={getSolscanUrl("tx", task.tokenLaunchSignature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-center text-[10px] text-white/25 hover:text-white/40 transition-colors"
                  >
                    View launch transaction
                  </a>
                )}
              </div>
            )}

            {/* Task Details Card */}
            <div className="rounded-2xl border border-white/10 bg-surface/80 p-5">
              <h3 className="mb-4 text-sm font-semibold text-white">Details</h3>
              <div className="space-y-3">
                <DetailRow label="Category">
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-white/60">
                    {categoryLabel}
                  </span>
                </DetailRow>
                <DetailRow label="Remote">
                  {task.isRemote ? (
                    <span className="flex items-center gap-1 text-blue-400">
                      <MapPin className="size-3" />
                      Remote
                    </span>
                  ) : (
                    <span className="text-white/60">
                      {task.location || "On-site"}
                    </span>
                  )}
                </DetailRow>
                {task.deadline && (
                  <DetailRow label="Deadline">
                    <span className="flex items-center gap-1 text-white/60">
                      <Calendar className="size-3" />
                      {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  </DetailRow>
                )}
                <DetailRow label="Bids">
                  <span className="font-medium text-white/60">
                    {task.bids.length}
                  </span>
                </DetailRow>
                <DetailRow label="Posted">
                  <span className="flex items-center gap-1 text-white/60">
                    <Clock className="size-3" />
                    {timeAgo(task.createdAt)}
                  </span>
                </DetailRow>
              </div>
            </div>

            {/* Listing badge */}
            {task.listing && (
              <Link
                href={`/dashboard/marketplace/${task.listing.id}`}
                className="block rounded-2xl border border-coral/20 bg-coral/5 p-4 transition-all hover:border-coral/30"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-coral/40">
                  Hiring from
                </p>
                <p className="mt-0.5 text-sm font-semibold text-coral">
                  {task.listing.title}
                </p>
                <p className="mt-0.5 text-xs capitalize text-white/30">
                  {task.listing.type}
                </p>
              </Link>
            )}

            {/* Quick Action */}
            {task.status === "open" && !isPoster && authenticated && (
              <a
                href="#bids"
                className="btn-cta-primary block rounded-xl px-4 py-3 text-center text-sm font-bold"
              >
                <Shield className="mr-2 inline size-4" />
                Place a Bid
              </a>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Dispute Dialog ────────────────────────────────────────── */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent className="bg-surface border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="size-5 text-red-400" />
              Dispute Task
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Describe the reason for your dispute. This will be reviewed by the
              platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
              maxLength={5000}
              className="bg-surface-light border-white/10 text-white placeholder:text-white/20 focus-visible:border-red-500/30 focus-visible:ring-red-500/20"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setDisputeOpen(false)}
                className="text-white/50 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDispute}
                disabled={!disputeReason.trim() || actionLoading === "dispute"}
                variant="destructive"
                className="bg-red-500 hover:bg-red-600"
              >
                {actionLoading === "dispute" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <AlertTriangle className="mr-2 size-4" />
                )}
                Submit Dispute
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/35">{label}</span>
      {children}
    </div>
  );
}
