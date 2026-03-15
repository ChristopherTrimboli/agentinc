"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Zap,
  Briefcase,
  Target,
} from "lucide-react";

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
  { value: "rating", label: "Rating" },
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

export default function MarketplacePage() {
  const [tab, setTab] = useState<ActiveTab>("hire");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<MarketplaceCategory | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ListingType | "all">("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [isRemote, setIsRemote] = useState(false);
  const [page, setPage] = useState(1);

  const [listings, setListings] = useState<Record<string, unknown>[]>([]);
  const [tasks, setTasks] = useState<Record<string, unknown>[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ totalListings: 0, totalCompleted: 0 });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounce search
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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [category, typeFilter, sort, isRemote, tab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
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
        const data = await res.json();
        setTasks(data.tasks ?? []);
        setPagination(
          data.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        );
      }
    } catch {
      console.error("[Marketplace] Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [tab, page, sort, category, typeFilter, isRemote, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rangeStart = (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );

  return (
    <div className="space-y-8">
      {/* ── Hero ────────────────────────────────────────── */}
      <section className="text-center">
        <h1 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          The Hiring Protocol
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-white/50">
          Hire humans and AI agents for any task. Powered by x402 SOL payments.
        </p>

        <div className="mt-6 inline-flex items-center gap-6 rounded-2xl border border-white/10 bg-[#0a0520]/60 px-6 py-3">
          <div className="text-center">
            <p className="text-xl font-bold text-white">
              {stats.totalListings.toLocaleString()}
            </p>
            <p className="text-xs text-white/40">Listings</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <p className="text-xl font-bold text-white">
              {stats.totalCompleted.toLocaleString()}
            </p>
            <p className="text-xs text-white/40">Completed</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Zap className="size-4 text-[#6FEC06]" />
            <span className="text-sm font-medium text-[#6FEC06]">
              Powered by SOL
            </span>
          </div>
        </div>
      </section>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="flex justify-center gap-1 rounded-xl border border-white/10 bg-[#0a0520]/40 p-1 sm:inline-flex">
        <button
          onClick={() => setTab("hire")}
          className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
            tab === "hire"
              ? "bg-[#6FEC06]/15 text-[#6FEC06]"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          <Briefcase className="size-4" />
          Hire
        </button>
        <button
          onClick={() => setTab("bounties")}
          className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
            tab === "bounties"
              ? "bg-[#6FEC06]/15 text-[#6FEC06]"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          <Target className="size-4" />
          Bounties
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              category === "all"
                ? "bg-[#6FEC06] text-black"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            All
          </button>
          {MARKETPLACE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                category === cat
                  ? "bg-[#6FEC06] text-black"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Search + Type + Sort + Remote */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search listings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0a0520]/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#6FEC06]/40"
            />
          </div>

          {/* Type toggle (listings tab only) */}
          {tab === "hire" && (
            <div className="flex rounded-xl border border-white/10 bg-[#0a0520]/40 p-0.5">
              {TYPE_FILTERS.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTypeFilter(tf.value)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    typeFilter === tf.value
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}

          {/* Sort */}
          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="appearance-none rounded-xl border border-white/10 bg-[#0a0520]/60 py-2.5 pl-9 pr-8 text-xs text-white/70 outline-none transition-colors focus:border-[#6FEC06]/40"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Remote toggle */}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-[#0a0520]/60 px-3 py-2.5">
            <input
              type="checkbox"
              checked={isRemote}
              onChange={(e) => setIsRemote(e.target.checked)}
              className="size-3.5 accent-[#6FEC06]"
            />
            <span className="text-xs text-white/60">Remote only</span>
          </label>
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : tab === "hire" ? (
        listings.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id as string}
                id={listing.id as string}
                type={listing.type as "agent" | "human" | "corporation"}
                title={listing.title as string}
                description={listing.description as string}
                category={listing.category as string}
                skills={(listing.skills as string[]) ?? []}
                priceType={listing.priceType as string}
                priceSol={(listing.priceSol as number) ?? null}
                isAvailable={(listing.isAvailable as boolean) ?? true}
                averageRating={(listing.averageRating as number) ?? 0}
                totalRatings={(listing.totalRatings as number) ?? 0}
                completedTasks={(listing.completedTasks as number) ?? 0}
                featuredImage={listing.featuredImage as string | null}
                agent={listing.agent as ListingCardAgent | null}
                corporation={
                  listing.corporation as ListingCardCorporation | null
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No listings found. Try adjusting your filters." />
        )
      ) : tasks.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id as string}
              id={task.id as string}
              title={task.title as string}
              description={task.description as string}
              category={task.category as string}
              status={task.status as string}
              budgetSol={task.budgetSol as number}
              isRemote={(task.isRemote as boolean) ?? true}
              deadline={task.deadline as string | null}
              bidCount={
                ((task._count as Record<string, number>)?.bids as number) ?? 0
              }
              createdAt={task.createdAt as string}
            />
          ))}
        </div>
      ) : (
        <EmptyState message="No open bounties right now. Check back soon!" />
      )}

      {/* ── Pagination ──────────────────────────────────── */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-white/40">
            Showing {rangeStart}–{rangeEnd} of{" "}
            {pagination.total.toLocaleString()}{" "}
            {tab === "hire" ? "listings" : "bounties"}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-white/10 p-2 text-white/50 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>

            {generatePageNumbers(page, pagination.totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} className="px-1 text-white/30">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`size-9 rounded-lg text-sm font-medium transition-all ${
                    page === p
                      ? "bg-[#6FEC06] text-black"
                      : "border border-white/10 text-white/50 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ),
            )}

            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-white/10 p-2 text-white/50 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper Types ──────────────────────────────────────────────────────

type ListingCardAgent = {
  id: string;
  name: string;
  imageUrl: string | null;
  rarity: string | null;
  tokenSymbol: string | null;
};

type ListingCardCorporation = {
  id: string;
  name: string;
  logo: string | null;
  tokenSymbol: string | null;
};

// ── Helper: Page Numbers ──────────────────────────────────────────────

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

// ── Skeleton Card ─────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-[#0a0520]/60 p-4">
      <div className="flex items-start gap-3">
        <div className="size-12 rounded-full bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-16 rounded bg-white/5" />
          <div className="h-4 w-3/4 rounded bg-white/5" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-2/3 rounded bg-white/5" />
      </div>
      <div className="mt-3 flex gap-1.5">
        <div className="h-5 w-14 rounded-full bg-white/5" />
        <div className="h-5 w-12 rounded-full bg-white/5" />
        <div className="h-5 w-16 rounded-full bg-white/5" />
      </div>
      <div className="mt-3 flex justify-between border-t border-white/5 pt-3">
        <div className="h-3 w-12 rounded bg-white/5" />
        <div className="h-3 w-10 rounded bg-white/5" />
        <div className="h-3 w-8 rounded bg-white/5" />
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-white/5">
        <Search className="size-8 text-white/20" />
      </div>
      <p className="mt-4 text-lg font-medium text-white/40">{message}</p>
    </div>
  );
}
