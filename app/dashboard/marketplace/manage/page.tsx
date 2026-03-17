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
  TrendingUp,
  Clock,
  Lock,
  Sparkles,
  ArrowLeft,
  Star,
  Briefcase,
  Bot,
  Building2,
  Users,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";

import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils";
import {
  getRarityBadgeStyle,
  getRarityRingColor,
  type Rarity,
} from "@/lib/utils/rarity";
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
  externalAgentName?: string | null;
  externalAgentImage?: string | null;
  externalAgentUrl?: string | null;
  externalMcpUrl?: string | null;
  externalA2aUrl?: string | null;
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
  featuredImage?: string | null;
  tokenSymbol?: string | null;
  posterId: string;
  assigneeId: string | null;
  poster?: { id: string } | null;
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
  const [loading, setLoading] = useState<Record<TabId, boolean>>({
    listings: false,
    posted: false,
    assigned: false,
    earnings: false,
  });
  const [error, setError] = useState<Record<TabId, string | null>>({
    listings: null,
    posted: null,
    assigned: null,
    earnings: null,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    if (!userId) return;
    setLoading((prev) => ({ ...prev, listings: true }));
    setError((prev) => ({ ...prev, listings: null }));
    try {
      const res = await authFetch(
        `/api/marketplace/listings?ownerId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch listings");
      const data = await res.json();
      setListings(data.listings ?? []);
    } catch (err) {
      console.error("[Marketplace Dashboard] Listings error:", err);
      setError((prev) => ({ ...prev, listings: "Failed to load listings." }));
    } finally {
      setLoading((prev) => ({ ...prev, listings: false }));
    }
  }, [authFetch, userId]);

  const fetchPostedTasks = useCallback(async () => {
    if (!userId) return;
    setLoading((prev) => ({ ...prev, posted: true }));
    setError((prev) => ({ ...prev, posted: null }));
    try {
      const res = await authFetch(
        `/api/marketplace/tasks?posterId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setPostedTasks(data.tasks ?? []);
    } catch (err) {
      console.error("[Marketplace Dashboard] Tasks error:", err);
      setError((prev) => ({ ...prev, posted: "Failed to load tasks." }));
    } finally {
      setLoading((prev) => ({ ...prev, posted: false }));
    }
  }, [authFetch, userId]);

  const fetchAssignedTasks = useCallback(async () => {
    if (!userId) return;
    setLoading((prev) => ({ ...prev, assigned: true }));
    setError((prev) => ({ ...prev, assigned: null }));
    try {
      const res = await authFetch(
        `/api/marketplace/tasks?workerId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch assigned tasks");
      const data = await res.json();
      setAssignedTasks(data.tasks ?? []);
    } catch (err) {
      console.error("[Marketplace Dashboard] Assigned tasks error:", err);
      setError((prev) => ({
        ...prev,
        assigned: "Failed to load assigned tasks.",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, assigned: false }));
    }
  }, [authFetch, userId]);

  useEffect(() => {
    if (activeTab === "listings") fetchListings();
    else if (activeTab === "posted") fetchPostedTasks();
    else if (activeTab === "assigned") fetchAssignedTasks();
    else if (activeTab === "earnings") fetchPostedTasks();
  }, [activeTab, fetchListings, fetchPostedTasks, fetchAssignedTasks]);

  const toggleAvailability = async (listing: Listing) => {
    if (actionLoading) return;
    setActionLoading(listing.id);
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
      } else {
        setError((prev) => ({
          ...prev,
          listings: "Failed to update listing.",
        }));
      }
    } catch (err) {
      console.error("[Marketplace Dashboard] Toggle error:", err);
      setError((prev) => ({ ...prev, listings: "Failed to update listing." }));
    } finally {
      setActionLoading(null);
    }
  };

  const deleteListing = async (id: string) => {
    if (actionLoading) return;
    if (!window.confirm("Are you sure you want to delete this listing?"))
      return;
    setActionLoading(id);
    try {
      const res = await authFetch(`/api/marketplace/listings/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        setError((prev) => ({
          ...prev,
          listings: data.error || "Failed to delete listing.",
        }));
      }
    } catch (err) {
      console.error("[Marketplace Dashboard] Delete error:", err);
      setError((prev) => ({ ...prev, listings: "Failed to delete listing." }));
    } finally {
      setActionLoading(null);
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
            <Link
              href="/dashboard/marketplace"
              className="mb-2 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Back to Marketplace
            </Link>
            <h1 className="text-3xl font-bold text-white font-display">
              Manage Listings
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
              href="/dashboard/marketplace/tasks/create"
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

        {/* Loading / Error / Content */}
        <AnimatePresence mode="wait">
          {loading[activeTab] && (
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

          {error[activeTab] && !loading[activeTab] && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400"
            >
              <AlertCircle className="size-5 shrink-0" />
              {error[activeTab]}
            </motion.div>
          )}

          {/* ── My Listings Tab ───────────────────────────────────── */}
          {!loading[activeTab] &&
            !error[activeTab] &&
            activeTab === "listings" && (
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
                  <div className="space-y-3">
                    {listings.map((listing, i) => (
                      <ManageListingRow
                        key={listing.id}
                        listing={listing}
                        index={i}
                        onToggle={() => toggleAvailability(listing)}
                        onDelete={() => deleteListing(listing.id)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          {/* ── Posted Tasks Tab ──────────────────────────────────── */}
          {!loading[activeTab] &&
            !error[activeTab] &&
            activeTab === "posted" && (
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
                    actionHref="/dashboard/marketplace/tasks/create"
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {postedTasks.map((task, i) => (
                      <div key={task.id} className="relative h-full">
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
                          featuredImage={task.featuredImage}
                          tokenSymbol={task.tokenSymbol}
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
          {!loading[activeTab] &&
            !error[activeTab] &&
            activeTab === "assigned" && (
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
                    actionHref="/dashboard/marketplace"
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
                        featuredImage={task.featuredImage}
                        tokenSymbol={task.tokenSymbol}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          {/* ── Earnings Tab ──────────────────────────────────────── */}
          {!loading[activeTab] &&
            !error[activeTab] &&
            activeTab === "earnings" && (
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

const LISTING_TYPE_CONFIG = {
  agent: {
    label: "Agent",
    icon: Bot,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  human: {
    label: "Human",
    icon: Users,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  corporation: {
    label: "Corp",
    icon: Building2,
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  },
} as const;

function ManageListingRow({
  listing,
  index,
  onToggle,
  onDelete,
}: {
  listing: Listing;
  index: number;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const {
    label: typeLabel,
    icon: TypeIcon,
    color: typeColor,
  } = LISTING_TYPE_CONFIG[listing.type];
  const isExternalAgent =
    listing.type === "agent" &&
    !listing.agent &&
    !!(
      listing.externalAgentUrl ||
      listing.externalMcpUrl ||
      listing.externalA2aUrl
    );
  const rarity = (listing.agent?.rarity?.toLowerCase() ?? "common") as Rarity;
  const rarityStyle = getRarityBadgeStyle(rarity);
  const ringColor = getRarityRingColor(rarity);
  const tokenSymbol =
    listing.agent?.tokenSymbol ?? listing.corporation?.tokenSymbol;
  const avatarSrc = imgError
    ? null
    : (listing.featuredImage ??
      listing.agent?.imageUrl ??
      listing.externalAgentImage ??
      listing.corporation?.logo ??
      null);
  const visibleSkills = listing.skills.slice(0, 5);
  const extraSkillCount = listing.skills.length - 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link
        href={`/dashboard/marketplace/${listing.id}`}
        className="group block rounded-2xl border border-white/10 bg-surface/60 p-5 transition-all hover:border-white/20 hover:bg-surface/80"
      >
        <div className="flex gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={listing.title}
                width={72}
                height={72}
                className={cn(
                  "size-[72px] rounded-2xl object-cover ring-2",
                  ringColor,
                )}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex size-[72px] items-center justify-center rounded-2xl bg-white/5 ring-2 ring-white/10">
                <TypeIcon className="size-7 text-white/30" />
              </div>
            )}
            <span
              className={cn(
                "absolute -right-1 -top-1 size-3.5 rounded-full border-2 border-surface",
                listing.isAvailable ? "bg-emerald-400" : "bg-white/20",
              )}
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Title row */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-white group-hover:text-coral transition-colors">
                {listing.title}
              </h3>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  typeColor,
                )}
              >
                <TypeIcon className="size-2.5" />
                {typeLabel}
              </span>
              {isExternalAgent && (
                <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400">
                  <ExternalLink className="size-2.5" />
                  External
                </span>
              )}
              {rarity !== "common" && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize",
                    rarityStyle.border,
                    rarityStyle.bg,
                    rarityStyle.text,
                  )}
                >
                  <Sparkles className="size-2.5" />
                  {rarity}
                </span>
              )}
              {tokenSymbol && (
                <span className="rounded-md bg-coral/10 px-1.5 py-0.5 text-[10px] font-bold text-coral">
                  ${tokenSymbol}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/40">
              {listing.description}
            </p>

            {/* Skills */}
            {visibleSkills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {visibleSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/50"
                  >
                    {skill}
                  </span>
                ))}
                {extraSkillCount > 0 && (
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/25">
                    +{extraSkillCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar: stats + actions */}
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
          {/* Stats */}
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-coral">
              {listing.priceSol !== null
                ? `${listing.priceSol} SOL`
                : "Bidding"}
            </span>
            <span className="flex items-center gap-1 text-sm text-white/50">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {listing.averageRating.toFixed(1)}
              {listing.totalRatings > 0 && (
                <span className="text-white/25">({listing.totalRatings})</span>
              )}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-white/50">
              <Briefcase className="size-3.5 text-white/30" />
              {listing.completedTasks} task
              {listing.completedTasks !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.preventDefault()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              title={listing.isAvailable ? "Hide listing" : "Make visible"}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                listing.isAvailable
                  ? "text-emerald-400 hover:bg-emerald-500/10"
                  : "text-white/30 hover:bg-white/5 hover:text-white/50",
              )}
            >
              {listing.isAvailable ? (
                <span className="flex items-center gap-1.5">
                  <Eye className="size-3.5" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <EyeOff className="size-3.5" /> Hidden
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete listing"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/20 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <span className="flex items-center gap-1.5">
                <Trash2 className="size-3.5" /> Delete
              </span>
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

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
