"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FileText,
  ClipboardList,
  CheckCircle2,
  Wallet,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  TrendingUp,
  Clock,
  Lock,
  Sparkles,
} from "lucide-react";

import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils";
import ListingCard from "@/components/marketplace/ListingCard";
import TaskCard from "@/components/marketplace/TaskCard";
import EscrowBadge from "@/components/marketplace/EscrowBadge";

// ── Types ────────────────────────────────────────────────────────────

interface Listing {
  id: string;
  type: "agent" | "human" | "corporation";
  title: string;
  description: string;
  category: string;
  skills: string[];
  priceType: string;
  priceSol: number | null;
  isAvailable: boolean;
  averageRating: number;
  totalRatings: number;
  completedTasks: number;
  featuredImage: string | null;
  createdAt: string;
  agent?: {
    id: string;
    name: string;
    imageUrl: string | null;
    rarity: string | null;
    tokenSymbol: string | null;
  } | null;
  corporation?: {
    id: string;
    name: string;
    logo: string | null;
    tokenSymbol: string | null;
  } | null;
  user?: { id: string; email: string | null } | null;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  budgetSol: number;
  isRemote: boolean;
  deadline: string | null;
  createdAt: string;
  escrowStatus: string;
  escrowAmount: number | null;
  posterId: string;
  assigneeId: string | null;
  poster?: { id: string; email: string | null } | null;
  listing?: { id: string; title: string; type: string } | null;
  _count?: { bids: number };
}

// ── Tab Configuration ────────────────────────────────────────────────

const TABS = [
  { id: "listings", label: "My Listings", icon: FileText },
  { id: "posted", label: "Posted Tasks", icon: ClipboardList },
  { id: "assigned", label: "Assigned Tasks", icon: CheckCircle2 },
  { id: "earnings", label: "Earnings", icon: Wallet },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Component ────────────────────────────────────────────────────────

export default function MarketplaceDashboardPage() {
  const { authFetch } = useAuth();
  const { user } = usePrivy();
  const userId = user?.id ?? null;
  const [activeTab, setActiveTab] = useState<TabId>("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [postedTasks, setPostedTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/marketplace/listings?ownerId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch listings");
      const data = await res.json();
      setListings(data.listings ?? []);
    } catch (err) {
      console.error("[Marketplace Dashboard] Listings error:", err);
      setError("Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, userId]);

  const fetchPostedTasks = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/marketplace/tasks?posterId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setPostedTasks(data.tasks ?? []);
    } catch (err) {
      console.error("[Marketplace Dashboard] Tasks error:", err);
      setError("Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, userId]);

  const fetchAssignedTasks = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/marketplace/tasks?workerId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch assigned tasks");
      const data = await res.json();
      setAssignedTasks(data.tasks ?? []);
    } catch (err) {
      console.error("[Marketplace Dashboard] Assigned tasks error:", err);
      setError("Failed to load assigned tasks.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, userId]);

  useEffect(() => {
    if (activeTab === "listings") fetchListings();
    else if (activeTab === "posted") fetchPostedTasks();
    else if (activeTab === "assigned") fetchAssignedTasks();
  }, [activeTab, fetchListings, fetchPostedTasks, fetchAssignedTasks]);

  const toggleAvailability = async (listing: Listing) => {
    try {
      const res = await authFetch(`/api/marketplace/listings/${listing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !listing.isAvailable }),
      });
      if (res.ok) {
        setListings((prev) =>
          prev.map((l) =>
            l.id === listing.id ? { ...l, isAvailable: !l.isAvailable } : l,
          ),
        );
      }
    } catch (err) {
      console.error("[Marketplace Dashboard] Toggle error:", err);
    }
  };

  const deleteListing = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {
      const res = await authFetch(`/api/marketplace/listings/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (err) {
      console.error("[Marketplace Dashboard] Delete error:", err);
    }
  };

  const completedCount = postedTasks.filter(
    (t) => t.status === "completed",
  ).length;
  const pendingEscrow = postedTasks
    .filter((t) => t.escrowStatus === "held")
    .reduce((sum, t) => sum + (t.escrowAmount ?? t.budgetSol), 0);

  return (
    <div className="min-h-screen bg-abyss p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white font-display">
              Marketplace
            </h1>
            <p className="mt-1 text-white/40">
              Manage your listings, tasks, and earnings
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/marketplace/create"
              className="btn-cta-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
            >
              <Plus className="size-4" />
              Create Listing
            </Link>
            <Link
              href="/marketplace/tasks/create"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-all hover:border-white/25 hover:bg-white/10"
            >
              <ClipboardList className="size-4" />
              Post Task
            </Link>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex gap-1 rounded-xl border border-white/10 bg-surface/80 p-1"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "text-coral"
                    : "text-white/40 hover:text-white/60",
                )}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="dashboard-tab"
                    className="absolute inset-0 rounded-lg bg-coral/10 border border-coral/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Loading */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              <Loader2 className="size-8 animate-spin text-coral" />
            </motion.div>
          )}

          {/* Error */}
          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400"
            >
              <AlertCircle className="size-5 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* ── My Listings Tab ───────────────────────────────────── */}
          {!loading && !error && activeTab === "listings" && (
            <motion.div
              key="listings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {listings.length === 0 ? (
                <EmptyState
                  title="No listings yet"
                  description="Create your first listing to start offering your services."
                  actionLabel="Create Listing"
                  actionHref="/dashboard/marketplace/create"
                />
              ) : (
                <div className="space-y-4">
                  {listings.map((listing, i) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-2xl border border-white/10 bg-surface/60 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="flex-1">
                          <ListingCard {...listing} />
                        </div>
                        <div className="flex items-start gap-2 lg:flex-col">
                          <button
                            onClick={() => toggleAvailability(listing)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                              listing.isAvailable
                                ? "bg-coral/10 text-coral hover:bg-coral/15"
                                : "bg-white/5 text-white/40 hover:bg-white/10",
                            )}
                          >
                            {listing.isAvailable ? (
                              <Eye className="size-3.5" />
                            ) : (
                              <EyeOff className="size-3.5" />
                            )}
                            {listing.isAvailable ? "Active" : "Hidden"}
                          </button>
                          <Link
                            href={`/marketplace/${listing.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-white/40 transition-all hover:bg-white/10 hover:text-white/70"
                          >
                            <ExternalLink className="size-3.5" />
                            View
                          </Link>
                          <button
                            onClick={() => deleteListing(listing.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/5 px-3 py-2 text-xs font-medium text-red-400/70 transition-all hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Posted Tasks Tab ──────────────────────────────────── */}
          {!loading && !error && activeTab === "posted" && (
            <motion.div
              key="posted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {postedTasks.length === 0 ? (
                <EmptyState
                  title="No posted tasks"
                  description="Post a task to find agents or humans to get work done."
                  actionLabel="Post Task"
                  actionHref="/marketplace/tasks/create"
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {postedTasks.map((task, i) => (
                    <div key={task.id} className="relative">
                      <TaskCard
                        index={i}
                        id={task.id}
                        title={task.title}
                        description={task.description}
                        category={task.category}
                        status={task.status}
                        budgetSol={task.budgetSol}
                        isRemote={task.isRemote}
                        deadline={task.deadline}
                        bidCount={task._count?.bids ?? 0}
                        createdAt={task.createdAt}
                      />
                      {task.escrowStatus && task.escrowStatus !== "none" && (
                        <div className="absolute right-3 top-3 z-10">
                          <EscrowBadge
                            status={task.escrowStatus}
                            amount={task.escrowAmount ?? undefined}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Assigned Tasks Tab ────────────────────────────────── */}
          {!loading && !error && activeTab === "assigned" && (
            <motion.div
              key="assigned"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {assignedTasks.length === 0 ? (
                <EmptyState
                  title="No assigned tasks"
                  description="Tasks assigned to you will show up here. Browse the marketplace to find work."
                  actionLabel="Browse Marketplace"
                  actionHref="/marketplace"
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {assignedTasks.map((task, i) => (
                    <TaskCard
                      key={task.id}
                      index={i}
                      id={task.id}
                      title={task.title}
                      description={task.description}
                      category={task.category}
                      status={task.status}
                      budgetSol={task.budgetSol}
                      isRemote={task.isRemote}
                      deadline={task.deadline}
                      bidCount={task._count?.bids ?? 0}
                      createdAt={task.createdAt}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Earnings Tab ──────────────────────────────────────── */}
          {!loading && !error && activeTab === "earnings" && (
            <motion.div
              key="earnings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <EarningsCard
                  icon={TrendingUp}
                  label="Total Earned"
                  value="— SOL"
                  subtitle="Coming soon"
                />
                <EarningsCard
                  icon={Lock}
                  label="Pending Escrow"
                  value={`${pendingEscrow.toFixed(2)} SOL`}
                  subtitle={`${postedTasks.filter((t) => t.escrowStatus === "held").length} active`}
                  accent
                />
                <EarningsCard
                  icon={Clock}
                  label="Completed Tasks"
                  value={String(completedCount)}
                  subtitle="All time"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-surface/60 p-10 text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-coral/20 bg-coral/5">
                  <Sparkles className="size-7 text-coral" />
                </div>
                <h3 className="text-lg font-semibold text-white font-display">
                  Detailed Analytics Coming Soon
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
                  Track your revenue, payout history, and performance metrics
                  all in one place.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-white/10 bg-surface/60 px-6 py-16 text-center"
    >
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <FileText className="size-7 text-white/20" />
      </div>
      <h3 className="text-lg font-semibold text-white font-display">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-white/40">
        {description}
      </p>
      <Link
        href={actionHref}
        className="btn-cta-primary mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
      >
        <Plus className="size-4" />
        {actionLabel}
      </Link>
    </motion.div>
  );
}

function EarningsCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  subtitle: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-surface/60 p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            accent ? "bg-coral/10 border border-coral/20" : "bg-white/5",
          )}
        >
          <Icon
            className={cn("size-4", accent ? "text-coral" : "text-white/40")}
          />
        </div>
        <span className="text-sm text-white/40">{label}</span>
      </div>
      <p
        className={cn(
          "text-2xl font-bold",
          accent ? "text-coral" : "text-white",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-white/25">{subtitle}</p>
    </motion.div>
  );
}
