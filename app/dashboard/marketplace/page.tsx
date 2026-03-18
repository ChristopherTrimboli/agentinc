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
  LayoutGrid,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ListingCard from "@/components/marketplace/ListingCard";
import TaskCard from "@/components/marketplace/TaskCard";
import {
  MARKETPLACE_CATEGORIES,
  CATEGORY_LABELS,
  type MarketplaceCategory,
  type ListingType,
} from "@/lib/marketplace/types";

type ActiveTab = "all" | "hire" | "bounties";
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
  const [tab, setTab] = useState<ActiveTab>("all");
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
  const [taskEarnings, setTaskEarnings] = useState<Record<string, number>>({});
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
      if (tab === "hire" || tab === "all") {
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
        if (tab === "hire") {
          setPagination(
            data.pagination ?? {
              page: 1,
              pageSize: 20,
              total: 0,
              totalPages: 0,
            },
          );
        }
        setStats((prev) => ({
          ...prev,
          totalListings: data.pagination?.total ?? prev.totalListings,
        }));
      }

      if (tab === "bounties" || tab === "all") {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "20");
        if (category !== "all") params.set("category", category);
        if (isRemote) params.set("isRemote", "true");
        if (debouncedSearch) params.set("search", debouncedSearch);

        const res = await fetch(`/api/marketplace/tasks?${params}`);
        if (!res.ok) {
          throw new Error("Failed to fetch tasks");
        }
        const data = await res.json();
        setTasks(data.tasks ?? []);
        if (tab === "bounties") {
          setPagination(
            data.pagination ?? {
              page: 1,
              pageSize: 20,
              total: 0,
              totalPages: 0,
            },
          );
        }
      }

      if (tab === "all") {
        setPagination({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
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
    const mints = tasks.filter((t) => t.tokenMint).map((t) => t.tokenMint!);
    if (mints.length === 0) return;

    fetch(`/api/explore/prices?mints=${mints.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        const earnings: Record<string, number> = {};
        for (const mint of mints) {
          if (data.prices?.[mint]?.earnings !== undefined) {
            earnings[mint] = data.prices[mint].earnings;
          }
        }
        setTaskEarnings(earnings);
      })
      .catch(() => {});
  }, [tasks]);

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
            <h1 className="gradient-text-shimmer text-3xl font-bold tracking-tight font-display sm:text-5xl lg:text-6xl">
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
            <div className="flex w-full flex-col gap-2.5 px-4 sm:w-auto sm:flex-row sm:gap-3 sm:px-0">
              <Link
                href="/dashboard/marketplace/tasks/create"
                className="btn-cta-primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold shadow-lg shadow-coral/20"
              >
                <Coins className="size-4" />
                Mint a Task Token
              </Link>
              <Link
                href="/dashboard/marketplace/create"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white/70 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
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

          {/* How it works — animated inline steps */}
          <HowItWorksSteps />
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
              { id: "all" as ActiveTab, label: "All", icon: LayoutGrid },
              { id: "hire" as ActiveTab, label: "Hire", icon: Briefcase },
              { id: "bounties" as ActiveTab, label: "Bounties", icon: Target },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex items-center gap-1.5 sm:gap-2 rounded-lg px-4 sm:px-6 py-2.5 text-sm font-medium transition-all",
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
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0 sm:pb-0 scrollbar-none">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:min-w-[200px] sm:flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={
                  tab === "hire"
                    ? "Search listings…"
                    : tab === "bounties"
                      ? "Search bounties…"
                      : "Search listings & bounties…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-10 bg-surface-light border-white/10 backdrop-blur-sm placeholder:text-white/40 focus-visible:border-coral/30 focus-visible:ring-coral/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {(tab === "hire" || tab === "all") && (
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

              <Select
                value={sort}
                onValueChange={(v) => setSort(v as SortOption)}
              >
                <SelectTrigger
                  size="sm"
                  className="h-9 gap-1.5 border-white/10 bg-surface/60 backdrop-blur-sm text-white/60 focus-visible:border-coral/30 focus-visible:ring-coral/20"
                >
                  <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface border-white/10">
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                type="button"
                onClick={() => setIsRemote(!isRemote)}
                className={cn(
                  "flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm backdrop-blur-sm transition-all",
                  isRemote
                    ? "border-coral/30 bg-coral/10 text-coral"
                    : "border-white/10 bg-surface/60 text-white/50 hover:border-white/20 hover:text-white/70",
                )}
              >
                <Globe className="size-3.5" />
                <span className="text-xs font-medium">Remote</span>
              </button>
            </div>
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
          ) : (
            (() => {
              const showListings = tab === "all" || tab === "hire";
              const showTasks = tab === "all" || tab === "bounties";
              const hasListings = showListings && listings.length > 0;
              const hasTasks = showTasks && tasks.length > 0;
              const hasContent = hasListings || hasTasks;

              if (!hasContent) {
                return (
                  <EmptyState
                    message={
                      tab === "hire"
                        ? "No listings found. Try adjusting your filters."
                        : tab === "bounties"
                          ? "No bounties found. Try adjusting your filters."
                          : "No listings or bounties found. Try adjusting your filters."
                    }
                  />
                );
              }

              return (
                <motion.div
                  key={tab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {hasListings &&
                    listings.map((listing, i) => (
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
                  {hasTasks &&
                    tasks.map((task, i) => (
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
                        creatorFees={
                          task.tokenMint
                            ? taskEarnings[task.tokenMint]
                            : undefined
                        }
                      />
                    ))}
                </motion.div>
              );
            })()
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
              {tab === "hire"
                ? "listings"
                : tab === "bounties"
                  ? "bounties"
                  : "items"}
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
      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
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

// ── How It Works — animated stepper ──────────────────────────────────

const STEPS = [
  {
    icon: Target,
    title: "Post a Task",
    step: 1,
    color: "var(--color-coral, #ff6b6b)",
    twIcon: "text-coral",
  },
  {
    icon: Coins,
    title: "Mint Token",
    step: 2,
    color: "#c084fc",
    twIcon: "text-purple-400",
  },
  {
    icon: TrendingUp,
    title: "Fees Grow",
    step: 3,
    color: "#34d399",
    twIcon: "text-emerald-400",
  },
  {
    icon: Zap,
    title: "Earn",
    step: 4,
    color: "#fbbf24",
    twIcon: "text-amber-400",
  },
] as const;

const CYCLE_MS = 2400;

function HowItWorksSteps() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setActive((p) => (p + 1) % STEPS.length),
      CYCLE_MS,
    );
    return () => clearInterval(id);
  }, []);

  const elements: React.ReactNode[] = [];
  STEPS.forEach((s, i) => {
    const isActive = active === i;
    const Icon = s.icon;

    elements.push(
      <motion.div
        key={`step-${s.step}`}
        className="flex min-w-0 items-center gap-1.5 sm:gap-2"
        animate={{
          scale: isActive ? 1.08 : 1,
          opacity: isActive ? 1 : 0.55,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
          {isActive && (
            <motion.div
              layoutId="step-glow"
              className="absolute inset-0 rounded-lg"
              style={{
                boxShadow: `0 0 12px 2px ${s.color}40, inset 0 0 8px ${s.color}20`,
                border: `1px solid ${s.color}50`,
                background: `${s.color}10`,
              }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
            />
          )}
          <Icon className={cn("size-4 relative z-10", s.twIcon)} />
        </div>
        <div className="hidden min-w-0 sm:block">
          <span
            className={cn(
              "block text-[10px] font-bold uppercase tracking-wider transition-colors duration-500",
              isActive ? "text-white/50" : "text-white/25",
            )}
          >
            {s.step}
          </span>
          <span
            className={cn(
              "block truncate text-xs font-medium transition-colors duration-500",
              isActive ? "text-white" : "text-white/50",
            )}
          >
            {s.title}
          </span>
        </div>
        {/* Mobile: just step number below icon */}
        <span
          className={cn(
            "block sm:hidden text-[9px] font-bold transition-colors duration-500",
            isActive ? "text-white" : "text-white/35",
          )}
        >
          {s.step}
        </span>
      </motion.div>,
    );

    if (i < STEPS.length - 1) {
      elements.push(
        <div
          key={`line-${i}`}
          className="relative mx-1 h-px flex-1 min-w-4 overflow-hidden sm:mx-3 sm:min-w-6"
        >
          <div className="absolute inset-0 bg-white/8" />
          <motion.div
            className="absolute inset-y-0 left-0 h-full"
            style={{
              background: `linear-gradient(90deg, ${STEPS[i].color}80, ${STEPS[i + 1].color}80)`,
            }}
            animate={{
              width: active >= i ? "100%" : "0%",
              opacity: active === i ? 1 : active > i ? 0.5 : 0.15,
            }}
            transition={{
              duration: (CYCLE_MS / 1000) * 0.7,
              ease: "easeInOut",
            }}
          />
          {active === i && (
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 size-1.5 rounded-full"
              style={{
                background: STEPS[i + 1].color,
                boxShadow: `0 0 6px ${STEPS[i + 1].color}`,
              }}
              initial={{ left: "0%" }}
              animate={{ left: "100%" }}
              transition={{
                duration: (CYCLE_MS / 1000) * 0.7,
                ease: "easeInOut",
              }}
              key={`dot-${active}`}
            />
          )}
        </div>,
      );
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="mx-auto mt-8 flex w-full max-w-2xl items-center justify-center rounded-xl border border-white/5 bg-surface/30 px-3 py-3 sm:px-5 sm:py-4 backdrop-blur-sm"
    >
      {elements}
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
