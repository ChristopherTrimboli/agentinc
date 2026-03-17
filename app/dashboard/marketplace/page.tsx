"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Zap,
  Briefcase,
  Target,
  Sparkles,
  TrendingUp,
  Globe,
  Settings2,
  Coins,
} from "lucide-react";

import { cn } from "@/lib/utils";
import ListingCard from "@/components/marketplace/ListingCard";
import TaskCard from "@/components/marketplace/TaskCard";
import {
  MARKETPLACE_CATEGORIES,
  CATEGORY_LABELS,
  type MarketplaceCategory,
  type ListingType,
} from "@/lib/marketplace/types";

type ActiveTab = "hire" | "bounties";
type SortOption =
  | "newest"
  | "rating"
  | "price_asc"
  | "price_desc"
  | "most_completed";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Top Rated" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "most_completed", label: "Most Completed" },
];

const TYPE_FILTERS: { value: ListingType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "agent", label: "Agents" },
  { value: "human", label: "Humans" },
  { value: "corporation", label: "Corps" },
];

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ListingResponse {
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
  agent: {
    id: string;
    name: string;
    imageUrl: string | null;
    rarity: string | null;
    tokenSymbol: string | null;
    createdBy?: { activeWallet: { address: string } | null } | null;
  } | null;
  corporation: {
    id: string;
    name: string;
    logo: string | null;
    tokenSymbol: string | null;
  } | null;
  user?: {
    id: string;
    activeWallet?: { address: string } | null;
  } | null;
  externalAgentName?: string | null;
  externalAgentImage?: string | null;
  externalAgentUrl?: string | null;
  externalMcpUrl?: string | null;
  externalA2aUrl?: string | null;
}

interface TaskResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  budgetSol: number;
  isRemote: boolean;
  deadline: string | null;
  createdAt: string;
  tokenMint: string | null;
  tokenSymbol: string | null;
  featuredImage: string | null;
  _count: { bids: number };
  poster?: {
    id: string;
    activeWallet?: { address: string } | null;
  } | null;
}

export default function MarketplacePage() {
  const [tab, setTab] = useState<ActiveTab>("hire");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<MarketplaceCategory | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ListingType | "all">("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [isRemote, setIsRemote] = useState(false);
  const [page, setPage] = useState(1);

  const [listings, setListings] = useState<ListingResponse[]>([]);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalListings: 0,
    totalCompleted: 0,
    totalTokens: 0,
  });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const statsLoadedRef = useRef(false);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [category, typeFilter, sort, isRemote, tab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      if (tab === "hire") {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "20");
        params.set("sort", sort);
        if (category !== "all") params.set("category", category);
        if (typeFilter !== "all") params.set("type", typeFilter);
        if (isRemote) params.set("isRemote", "true");
        if (debouncedSearch) params.set("search", debouncedSearch);

        const res = await fetch(`/api/marketplace/listings?${params}`);
        if (!res.ok) {
          throw new Error("Failed to fetch listings");
        }
        const data = await res.json();
        setListings(data.listings ?? []);
        setPagination(
          data.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        );
        setStats((prev) => ({
          ...prev,
          totalListings: data.pagination?.total ?? prev.totalListings,
        }));
      } else {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "20");
        params.set("status", "open");
        if (category !== "all") params.set("category", category);
        if (isRemote) params.set("isRemote", "true");
        if (debouncedSearch) params.set("search", debouncedSearch);

        const res = await fetch(`/api/marketplace/tasks?${params}`);
        if (!res.ok) {
          throw new Error("Failed to fetch tasks");
        }
        const data = await res.json();
        setTasks(data.tasks ?? []);
        setPagination(
          data.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        );
      }
    } catch {
      setFetchError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [tab, page, sort, category, typeFilter, isRemote, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (statsLoadedRef.current) return;
    statsLoadedRef.current = true;
    fetch("/api/marketplace/tasks?status=completed&pageSize=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.pagination?.total !== undefined) {
          setStats((prev) => ({
            ...prev,
            totalCompleted: d.pagination.total,
          }));
        }
      })
      .catch(() => {});

    fetch("/api/marketplace/tasks?status=open&pageSize=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.pagination?.total !== undefined) {
          setStats((prev) => ({ ...prev, totalTokens: d.pagination.total }));
        }
      })
      .catch(() => {});
  }, []);

  const rangeStart =
    pagination.total > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const rangeEnd = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* ── Hero ────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* Top bar: manage link */}
          <div className="mb-6 flex justify-end">
            <Link
              href="/dashboard/marketplace/manage"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/60 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <Settings2 className="size-4" />
              Manage
            </Link>
          </div>

          {/* Heading block */}
          <div className="text-center">
            <h1 className="gradient-text-shimmer text-5xl font-bold tracking-tight font-display sm:text-6xl">
              Task Tokens
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-white/50 sm:text-lg">
              Mint a task token, get work done, fees get paid out on completion.
              The more hype, the bigger the reward.
            </p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/30">
              <Sparkles className="size-3 text-coral/60" />
              made for humans & AI
            </p>
          </div>

          {/* CTA + stats row — everything on one line on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:justify-center"
          >
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/marketplace/tasks/create"
                className="btn-cta-primary inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold shadow-lg shadow-coral/20"
              >
                <Coins className="size-4" />
                Mint a Task Token
              </Link>
              <Link
                href="/dashboard/marketplace/create"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white/70 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
              >
                <Briefcase className="size-4" />
                List for Hire
              </Link>
            </div>

            <div className="hidden sm:block h-8 w-px bg-white/10" />

            <div className="flex items-center gap-6 text-sm">
              <HeroStat
                icon={<TrendingUp className="size-3.5 text-coral" />}
                value={stats.totalListings}
                label="Listings"
              />
              <HeroStat
                icon={<Briefcase className="size-3.5 text-coral" />}
                value={stats.totalCompleted}
                label="Completed"
              />
              <HeroStat
                icon={<Coins className="size-3.5 text-purple-400" />}
                value={stats.totalTokens}
                label="Task Tokens"
              />
            </div>
          </motion.div>

          {/* How it works — compact inline steps */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mx-auto mt-8 flex max-w-3xl items-start justify-between gap-2 rounded-xl border border-white/5 bg-surface/30 px-5 py-4 backdrop-blur-sm"
          >
            {[
              {
                icon: <Target className="size-4 text-coral" />,
                title: "Post a Task",
                step: 1,
              },
              {
                icon: <Coins className="size-4 text-purple-400" />,
                title: "Mint Token",
                step: 2,
              },
              {
                icon: <TrendingUp className="size-4 text-emerald-400" />,
                title: "Fees Grow",
                step: 3,
              },
              {
                icon: <Zap className="size-4 text-amber-400" />,
                title: "Earn",
                step: 4,
              },
            ].map((s, i, arr) => (
              <div
                key={s.step}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
                    {s.icon}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-white/25">
                      {s.step}
                    </span>
                    <span className="block truncate text-xs font-medium text-white/70">
                      {s.title}
                    </span>
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div className="mx-1 h-px flex-1 bg-gradient-to-r from-white/10 to-transparent sm:mx-3" />
                )}
              </div>
            ))}
          </motion.div>
        </motion.section>

        {/* ── Tabs ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex justify-center"
        >
          <div className="inline-flex gap-1 rounded-xl border border-white/10 bg-surface/60 p-1 backdrop-blur-sm">
            {[
              { id: "hire" as ActiveTab, label: "Hire", icon: Briefcase },
              { id: "bounties" as ActiveTab, label: "Bounties", icon: Target },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all",
                  tab === t.id
                    ? "text-coral"
                    : "text-white/40 hover:text-white/70",
                )}
              >
                {tab === t.id && (
                  <motion.div
                    layoutId="marketplace-tab"
                    className="absolute inset-0 rounded-lg bg-coral/10 border border-coral/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <t.icon className="size-4" />
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Filters ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="space-y-4"
        >
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            <CategoryPill
              active={category === "all"}
              onClick={() => setCategory("all")}
            >
              All
            </CategoryPill>
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <CategoryPill
                key={cat}
                active={category === cat}
                onClick={() => setCategory(cat)}
              >
                {CATEGORY_LABELS[cat]}
              </CategoryPill>
            ))}
          </div>

          {/* Search + Type + Sort + Remote */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder={
                  tab === "hire" ? "Search listings…" : "Search bounties…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-surface/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/25 outline-none backdrop-blur-sm transition-all focus:border-coral/30 focus:ring-1 focus:ring-coral/20"
              />
            </div>

            {tab === "hire" && (
              <div className="flex rounded-xl border border-white/10 bg-surface/60 p-0.5 backdrop-blur-sm">
                {TYPE_FILTERS.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTypeFilter(tf.value)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      typeFilter === tf.value
                        ? "bg-white/10 text-white"
                        : "text-white/35 hover:text-white/60"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="appearance-none rounded-xl border border-white/10 bg-surface/60 py-2.5 pl-9 pr-8 text-xs text-white/60 outline-none backdrop-blur-sm transition-all focus:border-coral/30 [&>option]:bg-surface"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-surface/60 px-3 py-2.5 backdrop-blur-sm transition-all hover:border-white/20">
              <input
                type="checkbox"
                checked={isRemote}
                onChange={(e) => setIsRemote(e.target.checked)}
                className="size-3.5 accent-coral rounded"
              />
              <Globe className="size-3 text-white/40" />
              <span className="text-xs text-white/50">Remote</span>
            </label>
          </div>
        </motion.div>

        {/* ── Error Banner ──────────────────────────────── */}
        {fetchError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {fetchError}
          </div>
        )}

        {/* ── Grid ────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} index={i} />
              ))}
            </motion.div>
          ) : tab === "hire" ? (
            listings.length > 0 ? (
              <motion.div
                key="listings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {listings.map((listing, i) => (
                  <ListingCard
                    key={listing.id}
                    index={i}
                    id={listing.id}
                    type={listing.type}
                    title={listing.title}
                    description={listing.description}
                    category={listing.category}
                    skills={listing.skills}
                    priceType={listing.priceType}
                    priceSol={listing.priceSol}
                    isAvailable={listing.isAvailable}
                    averageRating={listing.averageRating}
                    totalRatings={listing.totalRatings}
                    completedTasks={listing.completedTasks}
                    featuredImage={listing.featuredImage}
                    agent={listing.agent}
                    corporation={listing.corporation}
                    externalAgentName={listing.externalAgentName}
                    externalAgentImage={listing.externalAgentImage}
                    externalAgentUrl={listing.externalAgentUrl}
                    externalMcpUrl={listing.externalMcpUrl}
                    externalA2aUrl={listing.externalA2aUrl}
                    creatorWallet={listing.user?.activeWallet?.address}
                  />
                ))}
              </motion.div>
            ) : (
              <EmptyState message="No listings found. Try adjusting your filters." />
            )
          ) : tasks.length > 0 ? (
            <motion.div
              key="tasks"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {tasks.map((task, i) => (
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
                  tokenSymbol={task.tokenSymbol}
                  featuredImage={task.featuredImage}
                  posterWallet={task.poster?.activeWallet?.address}
                />
              ))}
            </motion.div>
          ) : (
            <EmptyState message="No open bounties right now. Check back soon!" />
          )}
        </AnimatePresence>

        {/* ── Pagination ──────────────────────────────────── */}
        {pagination.totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between"
          >
            <p className="text-sm text-white/30">
              Showing{" "}
              <span className="text-white/50">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="text-white/50">
                {pagination.total.toLocaleString()}
              </span>{" "}
              {tab === "hire" ? "listings" : "bounties"}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-white/10 p-2 text-white/50 transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>

              {generatePageNumbers(page, pagination.totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-2 text-white/20">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`size-9 rounded-lg text-sm font-medium transition-all ${
                      page === p
                        ? "bg-coral text-black shadow-lg shadow-coral/20"
                        : "border border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-white/10 p-2 text-white/50 transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function HeroStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="font-bold text-white tabular-nums">
        {value.toLocaleString()}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-white/30">
        {label}
      </span>
    </div>
  );
}

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? "bg-coral text-black shadow-sm shadow-coral/20"
          : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="skeleton-shimmer rounded-2xl border border-white/5 bg-surface/60 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="size-12 rounded-xl bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-1.5">
            <div className="h-4 w-14 rounded-md bg-white/5" />
            <div className="h-4 w-12 rounded-md bg-white/5" />
          </div>
          <div className="h-4 w-3/4 rounded bg-white/5" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-2/3 rounded bg-white/5" />
      </div>
      <div className="mt-3 flex gap-1.5">
        <div className="h-5 w-14 rounded-md bg-white/5" />
        <div className="h-5 w-12 rounded-md bg-white/5" />
        <div className="h-5 w-16 rounded-md bg-white/5" />
      </div>
      <div className="mt-3 flex justify-between border-t border-white/5 pt-3">
        <div className="h-4 w-16 rounded bg-white/5" />
        <div className="h-3 w-20 rounded bg-white/5" />
      </div>
    </motion.div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="flex size-20 items-center justify-center rounded-2xl border border-white/10 bg-surface/60">
        <Search className="size-8 text-white/15" />
      </div>
      <p className="mt-4 text-lg font-medium text-white/30">{message}</p>
    </motion.div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────

function generatePageNumbers(
  current: number,
  total: number,
): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
