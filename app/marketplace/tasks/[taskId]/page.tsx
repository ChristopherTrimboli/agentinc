"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/lib/auth/AuthProvider";
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
} from "lucide-react";
import Link from "next/link";
import StatusTimeline from "@/components/marketplace/StatusTimeline";
import EscrowBadge from "@/components/marketplace/EscrowBadge";
import BidCard from "@/components/marketplace/BidCard";
import {
  CATEGORY_LABELS,
  type MarketplaceCategory,
  type Milestone,
} from "@/lib/marketplace/types";

// ── Types ────────────────────────────────────────────────────────────────

interface TaskBid {
  id: string;
  amountSol: number;
  message?: string | null;
  estimatedTime?: string | null;
  status: string;
  createdAt: string;
  bidder?: { id: string; email: string | null } | null;
  bidderAgent?: { id: string; name: string; imageUrl: string | null } | null;
}

interface TaskReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  reviewer: { id: string; email: string | null };
}

interface TaskData {
  id: string;
  title: string;
  description: string;
  category: string;
  requirements: string[];
  status: string;
  budgetSol: number;
  escrowAmount?: number | null;
  escrowStatus: string;
  milestones?: Milestone[] | null;
  posterId: string;
  poster: { id: string; email: string | null };
  workerId?: string | null;
  worker?: { id: string; email: string | null } | null;
  workerAgent?: { id: string; name: string; imageUrl: string | null } | null;
  listing?: { id: string; title: string; type: string } | null;
  deliverables?: string | null;
  location?: string | null;
  isRemote: boolean;
  deadline?: string | null;
  completedAt?: string | null;
  bids: TaskBid[];
  reviews: TaskReview[];
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  const { user, authenticated, login } = usePrivy();
  const { authFetch } = useAuth();

  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Bid form
  const [bidAmount, setBidAmount] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [bidTime, setBidTime] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);

  // Deliverables form
  const [deliverables, setDeliverables] = useState("");
  const [submittingDeliverables, setSubmittingDeliverables] = useState(false);

  // Review form
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const currentUserId = user?.id ?? null;
  const isPoster = currentUserId === task?.posterId;
  const isWorker = currentUserId === task?.workerId;
  const hasReviewed = task?.reviews.some(
    (r) => r.reviewer.id === currentUserId,
  );

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

  // ── Actions ──────────────────────────────────────────────────────────

  async function handlePlaceBid(e: React.FormEvent) {
    e.preventDefault();
    if (!authenticated) return login();
    setSubmittingBid(true);

    try {
      const res = await authFetch(`/api/marketplace/tasks/${taskId}/bids`, {
        method: "POST",
        body: JSON.stringify({
          amountSol: parseFloat(bidAmount),
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
      const res = await authFetch(
        `/api/marketplace/tasks/${taskId}/bids/${bidId}/accept`,
        { method: "POST" },
      );
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
      const res = await authFetch(
        `/api/marketplace/tasks/${taskId}/deliverables`,
        {
          method: "POST",
          body: JSON.stringify({ deliverables }),
        },
      );
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
    setActionLoading("dispute");
    try {
      const res = await authFetch(`/api/marketplace/tasks/${taskId}/dispute`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to dispute");
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
      const res = await authFetch(`/api/marketplace/tasks/${taskId}/reviews`, {
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

  // ── Loading / Error States ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000028]">
        <Loader2 className="size-8 animate-spin text-[#6FEC06]" />
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#000028] text-white">
        <AlertTriangle className="size-12 text-red-400" />
        <p className="text-lg">{error}</p>
        <Link
          href="/marketplace"
          className="text-sm text-[#6FEC06] hover:underline"
        >
          Back to Marketplace
        </Link>
      </div>
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
    <div className="min-h-screen bg-[#000028] pb-20">
      <div className="mx-auto max-w-4xl px-4 pt-8">
        {/* Back button */}
        <Link
          href="/marketplace"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to Marketplace
        </Link>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 underline hover:no-underline"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Title + Status */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">{task.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/50">
            <span>
              Posted by{" "}
              <span className="text-white/70">
                {task.poster.email ?? "Anonymous"}
              </span>
            </span>
            <span>·</span>
            <span>{timeAgo(task.createdAt)}</span>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-[#0a0520]/80 p-6">
          <StatusTimeline currentStatus={task.status} />
          <div className="mt-4 flex items-center gap-3">
            <EscrowBadge
              status={task.escrowStatus}
              amount={task.escrowAmount ?? undefined}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Main Content ───────────────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            <section className="rounded-2xl border border-white/10 bg-[#0a0520]/80 p-6">
              <h2 className="mb-3 text-lg font-semibold text-white">
                Description
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                {task.description}
              </p>
            </section>

            {/* Requirements */}
            {task.requirements.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-[#0a0520]/80 p-6">
                <h2 className="mb-3 text-lg font-semibold text-white">
                  Requirements
                </h2>
                <ul className="space-y-2">
                  {task.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-white/70"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#6FEC06]" />
                      {req}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-[#0a0520]/80 p-6">
                <h2 className="mb-3 text-lg font-semibold text-white">
                  Milestones
                </h2>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="mb-1 flex justify-between text-xs text-white/50">
                    <span>
                      {completedMilestones.length} of {milestones.length}{" "}
                      completed
                    </span>
                    <span>
                      {Math.round(
                        (completedMilestones.length / milestones.length) * 100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#6FEC06] transition-all"
                      style={{
                        width: `${(completedMilestones.length / milestones.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {milestones.map((m, i) => {
                    const isComplete =
                      m.status === "completed" || m.status === "released";
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                              isComplete
                                ? "bg-[#6FEC06] text-black"
                                : "border border-white/20 text-white/40"
                            }`}
                          >
                            {isComplete ? "✓" : i + 1}
                          </div>
                          <span
                            className={`text-sm ${isComplete ? "text-white/90" : "text-white/60"}`}
                          >
                            {m.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#6FEC06]">
                            {m.amountSol} SOL
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              m.status === "released"
                                ? "bg-green-500/15 text-green-400"
                                : m.status === "completed"
                                  ? "bg-blue-500/15 text-blue-400"
                                  : "bg-white/5 text-white/40"
                            }`}
                          >
                            {m.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Worker Section (assigned / in_progress / review) */}
            {task.workerId && (
              <section className="rounded-2xl border border-white/10 bg-[#0a0520]/80 p-6">
                <h2 className="mb-3 text-lg font-semibold text-white">
                  Worker
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/5">
                    <User className="size-5 text-white/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {task.workerAgent?.name ??
                        task.worker?.email ??
                        "Anonymous"}
                    </p>
                    <p className="text-xs text-white/40">Assigned worker</p>
                  </div>
                </div>

                {/* Worker: submit deliverables */}
                {isWorker &&
                  (task.status === "assigned" ||
                    task.status === "in_progress") && (
                    <form
                      onSubmit={handleSubmitDeliverables}
                      className="mt-4 space-y-3"
                    >
                      <textarea
                        value={deliverables}
                        onChange={(e) => setDeliverables(e.target.value)}
                        placeholder="Describe your deliverables, attach links..."
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30"
                        rows={4}
                        required
                      />
                      <button
                        type="submit"
                        disabled={submittingDeliverables}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#6FEC06] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#6FEC06]/90 disabled:opacity-50"
                      >
                        {submittingDeliverables ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <FileText className="size-4" />
                        )}
                        Submit Deliverables
                      </button>
                    </form>
                  )}

                {/* Display deliverables for review */}
                {task.deliverables && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-2 text-sm font-medium text-white/80">
                      Deliverables
                    </h3>
                    <p className="whitespace-pre-wrap text-sm text-white/60">
                      {task.deliverables}
                    </p>
                  </div>
                )}

                {/* Poster actions during review */}
                {isPoster && task.status === "review" && (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading === "approve"}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#6FEC06] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#6FEC06]/90 disabled:opacity-50"
                    >
                      {actionLoading === "approve" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Approve & Release Escrow
                    </button>
                    <button
                      onClick={handleDispute}
                      disabled={actionLoading === "dispute"}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {actionLoading === "dispute" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <AlertTriangle className="size-4" />
                      )}
                      Dispute
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Bids Section */}
            {(task.status === "open" || task.status === "assigned") && (
              <section className="rounded-2xl border border-white/10 bg-[#0a0520]/80 p-6">
                <h2 className="mb-4 text-lg font-semibold text-white">
                  Bids ({task.bids.length})
                </h2>

                {task.bids.length > 0 ? (
                  <div className="space-y-3">
                    {task.bids.map((bid) => (
                      <BidCard
                        key={bid.id}
                        {...bid}
                        isTaskPoster={isPoster}
                        onAccept={
                          isPoster && bid.status === "pending"
                            ? handleAcceptBid
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">
                    No bids yet. Be the first to bid!
                  </p>
                )}

                {/* Place Bid Form */}
                {task.status === "open" && !isPoster && (
                  <form
                    onSubmit={handlePlaceBid}
                    className="mt-6 space-y-4 border-t border-white/10 pt-6"
                  >
                    <h3 className="text-sm font-semibold text-white">
                      Place a Bid
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs text-white/50">
                          Amount (SOL)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            placeholder="0.00"
                            required
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#6FEC06]">
                            SOL
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs text-white/50">
                          Estimated Time
                        </label>
                        <input
                          type="text"
                          value={bidTime}
                          onChange={(e) => setBidTime(e.target.value)}
                          placeholder="e.g. 3 days"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs text-white/50">
                        Message
                      </label>
                      <textarea
                        value={bidMessage}
                        onChange={(e) => setBidMessage(e.target.value)}
                        placeholder="Why are you the best fit for this task?"
                        rows={3}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingBid || !bidAmount}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#6FEC06] px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#6FEC06]/90 disabled:opacity-50"
                    >
                      {submittingBid ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Place Bid
                    </button>
                  </form>
                )}

                {task.status === "open" && !authenticated && (
                  <div className="mt-6 border-t border-white/10 pt-6 text-center">
                    <button
                      onClick={login}
                      className="rounded-xl bg-[#6FEC06] px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#6FEC06]/90"
                    >
                      Sign in to Place a Bid
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Reviews Section */}
            {task.status === "completed" && (
              <section className="rounded-2xl border border-white/10 bg-[#0a0520]/80 p-6">
                <h2 className="mb-4 text-lg font-semibold text-white">
                  Reviews
                </h2>

                {task.reviews.length > 0 && (
                  <div className="mb-6 space-y-4">
                    {task.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-xl border border-white/5 bg-white/5 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-full border border-white/20 bg-white/5">
                              <User className="size-4 text-white/60" />
                            </div>
                            <span className="text-sm text-white/70">
                              {review.reviewer.email ?? "Anonymous"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`size-4 ${
                                  i < review.rating
                                    ? "fill-yellow-500 text-yellow-500"
                                    : "text-white/20"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="mt-2 text-sm text-white/60">
                            {review.comment}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-white/30">
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
                      <label className="mb-2 block text-xs text-white/50">
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
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              className={`size-7 ${
                                i < (reviewHover || reviewRating)
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-white/20"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs text-white/50">
                        Comment (optional)
                      </label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="How was your experience?"
                        rows={3}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingReview || reviewRating === 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#6FEC06] px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#6FEC06]/90 disabled:opacity-50"
                    >
                      {submittingReview ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Star className="size-4" />
                      )}
                      Submit Review
                    </button>
                  </form>
                )}

                {task.reviews.length === 0 && !authenticated && (
                  <p className="text-sm text-white/40">No reviews yet.</p>
                )}
              </section>
            )}
          </div>

          {/* ── Sidebar ────────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Budget Card */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0520]/80 p-6 text-center">
              <p className="text-xs uppercase tracking-wider text-white/40">
                Budget
              </p>
              <p className="mt-1 text-4xl font-bold text-[#6FEC06]">
                {task.budgetSol}
              </p>
              <p className="text-lg font-medium text-[#6FEC06]/70">SOL</p>
            </div>

            {/* Task Details Card */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0520]/80 p-6">
              <h3 className="mb-4 text-sm font-semibold text-white">Details</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Category</span>
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/70">
                    {categoryLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Remote</span>
                  <span className="flex items-center gap-1 text-white/70">
                    {task.isRemote ? (
                      <>
                        <MapPin className="size-3 text-blue-400" />
                        Remote
                      </>
                    ) : (
                      task.location || "On-site"
                    )}
                  </span>
                </div>
                {task.deadline && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Deadline</span>
                    <span className="flex items-center gap-1 text-white/70">
                      <Calendar className="size-3" />
                      {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Bids</span>
                  <span className="text-white/70">{task.bids.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Posted</span>
                  <span className="flex items-center gap-1 text-white/70">
                    <Clock className="size-3" />
                    {timeAgo(task.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Listing badge */}
            {task.listing && (
              <Link
                href={`/marketplace/${task.listing.id}`}
                className="block rounded-2xl border border-[#6FEC06]/20 bg-[#6FEC06]/5 p-4 transition-colors hover:border-[#6FEC06]/40"
              >
                <p className="text-xs text-[#6FEC06]/60">Hiring from</p>
                <p className="mt-0.5 text-sm font-semibold text-[#6FEC06]">
                  {task.listing.title}
                </p>
                <p className="mt-0.5 text-xs capitalize text-white/40">
                  {task.listing.type}
                </p>
              </Link>
            )}

            {/* Quick Action */}
            {task.status === "open" && !isPoster && authenticated && (
              <a
                href="#bids"
                className="block rounded-xl bg-[#6FEC06] px-4 py-3 text-center text-sm font-semibold text-black transition-colors hover:bg-[#6FEC06]/90"
              >
                Place a Bid
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
