"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bot,
  Building2,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  LayoutList,
  Search,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Zap,
  ArrowUpDown,
  SlidersHorizontal,
  Check,
  Calendar,
  User,
  Droplets,
} from "lucide-react";
import { formatPrice } from "@/lib/utils/formatting";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  PaginationState,
} from "@tanstack/react-table";

// Types
interface ExploreAgent {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  rarity: string | null;
  personality: string | null;
  tokenMint: string | null;
  tokenSymbol: string | null;
  launchedAt: string | null;
  type: "agent";
  creatorWallet?: string | null;
  corporationName?: string | null;
  corporationLogo?: string | null;
}

interface ExploreCorporation {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  color: string | null;
  tokenMint: string | null;
  tokenSymbol: string | null;
  launchedAt: string | null;
  type: "corporation";
  agentCount: number;
  creatorWallet?: string | null;
}

type ExploreItem = ExploreAgent | ExploreCorporation;

interface PriceData {
  price: number;
  priceChange24h?: number;
  marketCap?: number;
  volume24h?: number;
  liquidity?: number;
  earnings?: number;
}

// Extended item with price data for table
type TableItem = ExploreItem & {
  price?: number;
  priceChange24h?: number;
  marketCap?: number;
  volume24h?: number;
  liquidity?: number;
  earnings?: number;
  creatorWallet?: string | null;
  launchedAt?: string | null;
};

import { RARITY_BADGE_STYLES } from "@/lib/utils/rarity";

const rarityColors = RARITY_BADGE_STYLES as Record<
  string,
  { bg: string; text: string; border: string }
>;

// Format large numbers (market cap, volume)
function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return "-";
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

// Format change percentage
function formatChange(change: number | undefined): string {
  if (change === undefined) return "-";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

// Ticker component for top of page
function PriceTicker({
  items,
  prices,
}: {
  items: ExploreItem[];
  prices: Record<string, PriceData>;
}) {
  const topMovers = useMemo(() => {
    return items
      .filter(
        (item) =>
          item.tokenMint &&
          prices[item.tokenMint]?.priceChange24h !== undefined,
      )
      .sort((a, b) => {
        const changeA = Math.abs(prices[a.tokenMint!]?.priceChange24h || 0);
        const changeB = Math.abs(prices[b.tokenMint!]?.priceChange24h || 0);
        return changeB - changeA;
      })
      .slice(0, 10);
  }, [items, prices]);

  if (topMovers.length === 0) return null;

  return (
    <div className="relative overflow-hidden bg-[#0a0520]/80 border-b border-white/10 py-2 h-10">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 animate-ticker flex gap-8 whitespace-nowrap">
        {[...topMovers, ...topMovers, ...topMovers].map((item, i) => {
          const priceData = prices[item.tokenMint!];
          const isPositive = (priceData?.priceChange24h || 0) >= 0;
          return (
            <Link
              key={`${item.id}-${i}`}
              href={
                item.type === "agent"
                  ? `/agent/${item.tokenMint || item.id}`
                  : `/corporation/${(item as { tokenMint?: string | null }).tokenMint || item.id}`
              }
              className="flex items-center gap-2 px-3 py-1 hover:bg-white/5 rounded-lg transition-colors"
            >
              {item.type === "agent" && (item as ExploreAgent).imageUrl ? (
                <Image
                  src={(item as ExploreAgent).imageUrl!}
                  alt={item.name}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : (
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    item.type === "corporation"
                      ? "bg-[#120557]"
                      : "bg-[#6FEC06]/20"
                  }`}
                >
                  {item.type === "corporation" ? (
                    <Building2 className="w-3 h-3 text-white/60" />
                  ) : (
                    <Bot className="w-3 h-3 text-[#6FEC06]" />
                  )}
                </div>
              )}
              <span className="text-sm font-medium">
                {item.tokenSymbol || item.name}
              </span>
              <span
                className={`text-xs font-medium ${isPositive ? "text-[#6FEC06]" : "text-red-400"}`}
              >
                {formatChange(priceData?.priceChange24h)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Column helper for TanStack Table
const columnHelper = createColumnHelper<TableItem>();

// Skeleton row component
function SkeletonRow({ index }: { index: number }) {
  return (
    <tr
      className="border-b border-white/5 skeleton-row"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Rank */}
      <td className="py-4 px-4">
        <div className="h-4 w-6 rounded skeleton-shimmer" />
      </td>
      {/* Name with avatar */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg skeleton-shimmer" />
          <div className="space-y-2">
            <div className="h-4 w-28 rounded skeleton-shimmer" />
            <div className="h-3 w-16 rounded skeleton-shimmer" />
          </div>
        </div>
      </td>
      {/* 24h Change */}
      <td className="py-4 px-4">
        <div className="h-4 w-16 rounded skeleton-shimmer" />
      </td>
      {/* Price */}
      <td className="py-4 px-4">
        <div className="h-4 w-20 rounded skeleton-shimmer" />
      </td>
      {/* Market Cap */}
      <td className="py-4 px-4">
        <div className="h-4 w-16 rounded skeleton-shimmer" />
      </td>
      {/* Volume */}
      <td className="py-4 px-4">
        <div className="h-4 w-16 rounded skeleton-shimmer" />
      </td>
      {/* Earnings */}
      <td className="py-4 px-4">
        <div className="h-4 w-20 rounded skeleton-shimmer" />
      </td>
    </tr>
  );
}

// Table skeleton component
function TableSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 rounded-2xl bg-[#0a0520]/50 border border-white/10 overflow-hidden">
      <div className="flex-1 overflow-hidden min-w-0">
        <table className="w-full">
          <thead className="bg-[#0a0520]">
            <tr className="border-b border-white/10 text-left text-sm text-white/40">
              <th className="py-4 px-4 font-medium w-12">#</th>
              <th className="py-4 px-4 font-medium">Name</th>
              <th className="py-4 px-4 font-medium">24h Change</th>
              <th className="py-4 px-4 font-medium">Price</th>
              <th className="py-4 px-4 font-medium">Market Cap</th>
              <th className="py-4 px-4 font-medium">24h Vol</th>
              <th className="py-4 px-4 font-medium">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 15 }).map((_, i) => (
              <SkeletonRow key={i} index={i} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Skeleton pagination */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-white/10 bg-[#0a0520]">
        <div className="h-4 w-32 rounded skeleton-shimmer" />
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-lg skeleton-shimmer"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        <div className="h-4 w-24 rounded skeleton-shimmer" />
      </div>
    </div>
  );
}

// Card skeleton component
function CardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="rounded-2xl bg-[#0a0520] border border-white/10 overflow-hidden skeleton-row"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image skeleton */}
      <div className="aspect-square skeleton-shimmer" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-14 rounded-full skeleton-shimmer" />
        </div>
        <div className="h-5 w-3/4 rounded skeleton-shimmer" />
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded skeleton-shimmer" />
          <div className="h-3 w-2/3 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-1 pt-1">
          <div className="h-5 w-14 rounded-full skeleton-shimmer" />
          <div className="h-5 w-12 rounded-full skeleton-shimmer" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="h-3 w-10 rounded skeleton-shimmer" />
          <div className="h-4 w-16 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

// Cards skeleton grid
function CardsGridSkeleton() {
  return (
    <div className="flex-1 overflow-auto pb-4">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

// Card component
function ItemCard({
  item,
  price,
}: {
  item: ExploreItem;
  price: PriceData | null;
}) {
  const isAgent = item.type === "agent";
  const agent = isAgent ? (item as ExploreAgent) : null;
  const corp = !isAgent ? (item as ExploreCorporation) : null;
  const isPositive = (price?.priceChange24h || 0) >= 0;
  const rarityStyle = agent?.rarity
    ? rarityColors[agent.rarity]
    : rarityColors.common;

  return (
    <div
      className={`group relative rounded-2xl bg-[#0a0520] border ${
        agent?.rarity && agent.rarity !== "common"
          ? rarityStyle.border
          : "border-white/10"
      } transition-all duration-300 overflow-hidden explore-card flex flex-col h-full hover:-translate-y-0.5`}
      style={{
        ...(agent?.rarity && agent.rarity !== "common"
          ? {
              boxShadow:
                "0 0 20px " +
                (agent.rarity === "legendary"
                  ? "rgba(255,215,0,0.15)"
                  : agent.rarity === "epic"
                    ? "rgba(168,85,247,0.15)"
                    : agent.rarity === "rare"
                      ? "rgba(59,130,246,0.15)"
                      : "rgba(111,236,6,0.15)"),
            }
          : {}),
      }}
      onMouseEnter={(e) => {
        if (agent?.rarity && agent.rarity !== "common") {
          e.currentTarget.style.boxShadow =
            "0 0 30px " +
            (agent.rarity === "legendary"
              ? "rgba(255,215,0,0.35)"
              : agent.rarity === "epic"
                ? "rgba(168,85,247,0.35)"
                : agent.rarity === "rare"
                  ? "rgba(59,130,246,0.35)"
                  : "rgba(111,236,6,0.35)");
        }
      }}
      onMouseLeave={(e) => {
        if (agent?.rarity && agent.rarity !== "common") {
          e.currentTarget.style.boxShadow =
            "0 0 20px " +
            (agent.rarity === "legendary"
              ? "rgba(255,215,0,0.15)"
              : agent.rarity === "epic"
                ? "rgba(168,85,247,0.15)"
                : agent.rarity === "rare"
                  ? "rgba(59,130,246,0.15)"
                  : "rgba(111,236,6,0.15)");
        }
      }}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-[#120557]/50 to-[#000028] overflow-hidden flex-shrink-0 rounded-t-2xl">
        {agent?.imageUrl ? (
          <Image
            src={agent.imageUrl}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-2xl"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={
              corp?.color
                ? {
                    background: `linear-gradient(135deg, ${corp.color}20, transparent)`,
                  }
                : undefined
            }
          >
            {corp?.logo ? (
              <span className="text-6xl">{corp.logo}</span>
            ) : isAgent ? (
              <Bot className="w-16 h-16 text-[#6FEC06]/40" />
            ) : (
              <Building2 className="w-16 h-16 text-white/20" />
            )}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0520] via-transparent to-transparent" />

        {/* Top badges row */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          {/* Token badge */}
          {item.tokenSymbol && (
            <span className="px-2.5 py-1 rounded-full bg-[#6FEC06]/20 text-[#6FEC06] text-xs font-semibold backdrop-blur-sm border border-[#6FEC06]/30">
              ${item.tokenSymbol}
            </span>
          )}

          <div className="flex-1" />

          {/* Rarity badge */}
          {agent?.rarity && agent.rarity !== "common" && (
            <span
              className={`px-2.5 py-1 rounded-full ${rarityStyle.bg} ${rarityStyle.text} text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border ${rarityStyle.border}`}
            >
              {agent.rarity}
            </span>
          )}
        </div>

        {/* Price change badge */}
        {price?.priceChange24h !== undefined && (
          <div
            className={`absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm ${
              isPositive
                ? "bg-[#6FEC06]/20 text-[#6FEC06]"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="text-xs font-medium">
              {formatChange(price.priceChange24h)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Top content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full ${
                isAgent
                  ? "bg-[#6FEC06]/10 text-[#6FEC06]"
                  : "bg-[#120557] text-white/60"
              }`}
            >
              {isAgent ? "Agent" : "Corporation"}
            </span>
            {corp && (
              <span className="text-[10px] text-white/40">
                {corp.agentCount} agent{corp.agentCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <h3 className="font-bold text-lg truncate font-display mb-1.5">
            {item.name}
          </h3>

          {item.description && (
            <p className="text-white/50 text-sm line-clamp-2 mb-3">
              {item.description}
            </p>
          )}
        </div>

        {/* Price and button at bottom */}
        <div className="space-y-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-xs">Price</span>
            <span className="font-mono font-medium text-sm">
              {price ? formatPrice(price.price) : "-"}
            </span>
          </div>

          <Link
            href={
              isAgent
                ? `/agent/${item.tokenMint || item.id}`
                : `/corporation/${item.tokenMint || item.id}`
            }
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#6FEC06]/10 border border-[#6FEC06]/30 rounded-xl text-[#6FEC06] text-sm font-medium hover:bg-[#6FEC06]/20 hover:border-[#6FEC06]/50 transition-all"
          >
            {isAgent ? "View Profile" : "View Corporation"}
          </Link>
        </div>
      </div>
    </div>
  );
}

// Cache TTL in milliseconds
const PRICE_CACHE_TTL = 30 * 1000; // 30 seconds

// Main Explore component
export default function ExplorePage() {
  const [view, setView] = useState<"table" | "cards">("table");
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "agent" | "corporation">(
    "all",
  );

  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: "price", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    liquidity: false,
    creatorWallet: false,
    launchedAt: false,
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });

  // Use ref for cache timestamp to avoid dependency loops
  const lastPriceFetchRef = useRef<number>(0);

  // Combine items with price data for table
  const tableData = useMemo<TableItem[]>(() => {
    // Only show minted items with tokenMint
    const hasPrices = Object.keys(prices).length > 0;
    let data = items
      .filter((item) => item.tokenMint)
      .map((item) => {
        const priceData = item.tokenMint ? prices[item.tokenMint] : undefined;
        return {
          ...item,
          price: priceData?.price,
          priceChange24h: priceData?.priceChange24h,
          marketCap: priceData?.marketCap,
          volume24h: priceData?.volume24h,
          liquidity: priceData?.liquidity,
          earnings: priceData?.earnings,
        };
      })
      // Hide delisted tokens (0 market cap) once prices have loaded
      .filter((item) => !hasPrices || (item.marketCap && item.marketCap > 0));

    // Apply type filter
    if (typeFilter !== "all") {
      data = data.filter((item) => item.type === typeFilter);
    }

    return data;
  }, [items, prices, typeFilter]);

  // Define table columns
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "rank",
        header: "#",
        cell: ({ row }) => (
          <span className="text-white/40 text-sm">{row.index + 1}</span>
        ),
        size: 50,
      }),
      columnHelper.accessor("name", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-white transition-colors"
            onClick={() => column.toggleSorting()}
          >
            Name
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const item = row.original;
          const isAgent = item.type === "agent";
          const agent = isAgent ? (item as ExploreAgent) : null;
          const corp = !isAgent ? (item as ExploreCorporation) : null;
          const rarityStyle = agent?.rarity
            ? rarityColors[agent.rarity]
            : rarityColors.common;

          return (
            <Link
              href={
                isAgent
                  ? `/agent/${item.tokenMint || item.id}`
                  : `/corporation/${item.tokenMint || item.id}`
              }
              className="flex items-center gap-3 group/link"
            >
              <div className="relative flex-shrink-0">
                {agent?.imageUrl ? (
                  <Image
                    src={agent.imageUrl}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="rounded-lg object-cover"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isAgent
                        ? "bg-gradient-to-br from-[#6FEC06]/20 to-[#120557]"
                        : "bg-[#120557]"
                    }`}
                    style={
                      corp?.color
                        ? { backgroundColor: corp.color + "20" }
                        : undefined
                    }
                  >
                    {corp?.logo ? (
                      <span className="text-lg">{corp.logo}</span>
                    ) : isAgent ? (
                      <Bot className="w-5 h-5 text-[#6FEC06]" />
                    ) : (
                      <Building2 className="w-5 h-5 text-white/60" />
                    )}
                  </div>
                )}
                {agent?.rarity && agent.rarity !== "common" && (
                  <div
                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${rarityStyle.bg} border ${rarityStyle.border}`}
                  />
                )}
              </div>
              <div className="min-w-0">
                <span className="font-medium truncate group-hover/link:text-[#6FEC06] transition-colors block">
                  {item.name}
                </span>
                {item.tokenSymbol && (
                  <span className="px-1.5 py-0.5 rounded bg-[#6FEC06]/10 text-[#6FEC06] text-[10px] font-medium inline-block mt-1">
                    ${item.tokenSymbol}
                  </span>
                )}
              </div>
            </Link>
          );
        },
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("priceChange24h", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-white transition-colors"
            onClick={() => column.toggleSorting()}
          >
            24h Change
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ getValue }) => {
          const change = getValue();
          const isPositive = (change || 0) >= 0;
          return (
            <div
              className={`flex items-center gap-1 ${isPositive ? "text-[#6FEC06]" : "text-red-400"}`}
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="font-medium">{formatChange(change)}</span>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.priceChange24h ?? -Infinity;
          const b = rowB.original.priceChange24h ?? -Infinity;
          return a - b;
        },
      }),
      columnHelper.accessor("price", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-white transition-colors"
            onClick={() => column.toggleSorting()}
          >
            Price
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-sm">{formatPrice(getValue())}</span>
        ),
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.price ?? 0;
          const b = rowB.original.price ?? 0;
          return a - b;
        },
      }),
      columnHelper.accessor("marketCap", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-white transition-colors"
            onClick={() => column.toggleSorting()}
          >
            Market Cap
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-white/70">
            {formatNumber(getValue())}
          </span>
        ),
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.marketCap ?? 0;
          const b = rowB.original.marketCap ?? 0;
          return a - b;
        },
      }),
      columnHelper.accessor("volume24h", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-white transition-colors"
            onClick={() => column.toggleSorting()}
          >
            24h Vol
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-white/70">
            {formatNumber(getValue())}
          </span>
        ),
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.volume24h ?? 0;
          const b = rowB.original.volume24h ?? 0;
          return a - b;
        },
      }),
      columnHelper.accessor("earnings", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-white transition-colors"
            onClick={() => column.toggleSorting()}
          >
            Earnings
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ getValue }) => {
          const earnings = getValue();
          if (earnings === undefined)
            return <span className="font-mono text-sm text-white/40">-</span>;
          if (earnings >= 1000) {
            return (
              <span className="font-mono text-sm text-[#6FEC06]">
                {(earnings / 1000).toFixed(2)}K SOL
              </span>
            );
          }
          return (
            <span className="font-mono text-sm text-[#6FEC06]">
              {earnings.toFixed(4)} SOL
            </span>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.earnings ?? 0;
          const b = rowB.original.earnings ?? 0;
          return a - b;
        },
      }),
      // Hidden by default columns
      columnHelper.accessor("liquidity", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-white transition-colors"
            onClick={() => column.toggleSorting()}
          >
            Liquidity
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-white/70">
            {formatNumber(getValue())}
          </span>
        ),
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.liquidity ?? 0;
          const b = rowB.original.liquidity ?? 0;
          return a - b;
        },
      }),
      columnHelper.accessor("creatorWallet", {
        header: "Creator",
        cell: ({ getValue }) => {
          const wallet = getValue();
          if (!wallet) return <span className="text-white/40">-</span>;
          const truncated = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
          return (
            <Link
              href={`/profile/${wallet}`}
              className="font-mono text-xs text-white/60 hover:text-[#6FEC06] transition-colors"
              title={wallet}
            >
              {truncated}
            </Link>
          );
        },
      }),
      columnHelper.accessor("launchedAt", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-white transition-colors"
            onClick={() => column.toggleSorting()}
          >
            Launched
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ getValue }) => {
          const date = getValue();
          if (!date) return <span className="text-white/40">-</span>;
          const d = new Date(date);
          return (
            <span className="text-xs text-white/60">
              {d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.launchedAt
            ? new Date(rowA.original.launchedAt).getTime()
            : 0;
          const b = rowB.original.launchedAt
            ? new Date(rowB.original.launchedAt).getTime()
            : 0;
          return a - b;
        },
      }),
    ],
    [],
  );

  // Create table instance
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const item = row.original;
      const search = filterValue.toLowerCase();
      return (
        item.name.toLowerCase().includes(search) ||
        (item.tokenSymbol?.toLowerCase().includes(search) ?? false) ||
        (item.description?.toLowerCase().includes(search) ?? false)
      );
    },
  });

  // Fetch prices with smart caching
  const fetchPrices = useCallback(async (mints: string[], force = false) => {
    if (mints.length === 0) return;

    const now = Date.now();
    if (!force && now - lastPriceFetchRef.current < PRICE_CACHE_TTL) {
      return;
    }

    try {
      const priceRes = await fetch(
        `/api/explore/prices?mints=${mints.join(",")}`,
      );
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        setPrices(priceData.prices || {});
        lastPriceFetchRef.current = now;
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  }, []);

  // Fetch explore data
  const fetchData = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) setIsRefreshing(true);

      try {
        const res = await fetch("/api/explore");
        if (!res.ok) throw new Error("Failed to fetch explore data");

        const data = await res.json();
        const allItems = [...data.agents, ...data.corporations];
        setItems(allItems);

        if (data.tokenMints && data.tokenMints.length > 0) {
          await fetchPrices(data.tokenMints, showRefreshIndicator);
        }
      } catch (error) {
        console.error("Error fetching explore data:", error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [fetchPrices],
  );

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh prices
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        const mints = items.filter((i) => i.tokenMint).map((i) => i.tokenMint!);
        fetchPrices(mints);
      }
    }, PRICE_CACHE_TTL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const mints = items.filter((i) => i.tokenMint).map((i) => i.tokenMint!);
        fetchPrices(mints);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [items, fetchPrices]);

  const filteredRows = table.getFilteredRowModel().rows;
  const paginatedRows = table.getRowModel().rows;

  return (
    <div className="h-screen flex flex-col overflow-hidden w-full max-w-full">
      {/* Price ticker */}
      <PriceTicker items={items} prices={prices} />

      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-hidden min-w-0">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-[#6FEC06]/30 bg-[#6FEC06]/10">
              <div className="relative">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#6FEC06]" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#6FEC06] rounded-full animate-live-pulse" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-[#6FEC06]">
                Live
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/dashboard/mint"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] text-black text-xs sm:text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#6FEC06]/20"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">Mint</span>
              </Link>
              <Link
                href="/dashboard/incorporate"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 bg-white/5 text-white text-xs sm:text-sm font-medium hover:bg-white/10 hover:border-white/30 transition-all"
              >
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">Incorporate</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 font-display">
                <span className="gradient-text-shimmer">Explore</span>
              </h1>
              <p className="text-white/50 text-sm sm:text-base">
                Discover AI agents and corporations on Agent Inc.
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center">
                <div className="flex items-center gap-1 sm:gap-1.5 text-xl sm:text-2xl font-bold">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-[#6FEC06]" />
                  {items.filter((i) => i.type === "agent").length}
                </div>
                <span className="text-[10px] sm:text-xs text-white/40">
                  Agents
                </span>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 sm:gap-1.5 text-xl sm:text-2xl font-bold">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#120557]" />
                  {items.filter((i) => i.type === "corporation").length}
                </div>
                <span className="text-[10px] sm:text-xs text-white/40">
                  Corps
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Search - full width on mobile, grows on desktop */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
            <input
              type="text"
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-[#0a0520]/80 border border-white/10 focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30 transition-all placeholder:text-white/30 text-sm sm:text-base"
            />
          </div>

          {/* Filters row - beside search on desktop, below on mobile */}
          <div className="flex gap-2 sm:gap-4">
            {/* Type filter */}
            <div className="flex rounded-lg sm:rounded-xl bg-[#0a0520]/80 border border-white/10 p-0.5 sm:p-1 shrink-0">
              {(["all", "agent", "corporation"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    typeFilter === type
                      ? "bg-[#6FEC06]/20 text-[#6FEC06]"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {type === "all" ? (
                    "All"
                  ) : type === "agent" ? (
                    <span className="flex items-center gap-1 sm:gap-1.5">
                      <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Agents</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 sm:gap-1.5">
                      <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Corps</span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg sm:rounded-xl bg-[#0a0520]/80 border border-white/10 p-0.5 sm:p-1 shrink-0">
              <button
                onClick={() => setView("table")}
                className={`p-2 sm:p-2.5 rounded-md sm:rounded-lg transition-all ${
                  view === "table"
                    ? "bg-[#6FEC06]/20 text-[#6FEC06]"
                    : "text-white/50 hover:text-white"
                }`}
                title="Table view"
              >
                <LayoutList className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => setView("cards")}
                className={`p-2 sm:p-2.5 rounded-md sm:rounded-lg transition-all ${
                  view === "cards"
                    ? "bg-[#6FEC06]/20 text-[#6FEC06]"
                    : "text-white/50 hover:text-white"
                }`}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Column filters dropdown (table view only) - hidden on mobile */}
            {view === "table" && (
              <div className="relative hidden sm:block shrink-0">
                <button
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-[#0a0520]/80 border transition-all flex items-center gap-2 ${
                    showColumnMenu
                      ? "border-[#6FEC06]/50 text-[#6FEC06]"
                      : "border-white/10 text-white/50 hover:border-[#6FEC06]/30 hover:text-[#6FEC06]"
                  }`}
                  title="Toggle columns"
                >
                  <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {showColumnMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowColumnMenu(false)}
                    />

                    {/* Dropdown menu */}
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#0a0520] border border-white/10 shadow-xl shadow-black/50 z-50 overflow-hidden">
                      <div className="px-3 py-2 border-b border-white/10">
                        <span className="text-xs font-semibold text-white/40 uppercase tracking-wide">
                          Toggle Columns
                        </span>
                      </div>
                      <div className="py-1">
                        {[
                          {
                            id: "liquidity",
                            label: "Liquidity",
                            icon: Droplets,
                          },
                          { id: "creatorWallet", label: "Creator", icon: User },
                          {
                            id: "launchedAt",
                            label: "Launch Date",
                            icon: Calendar,
                          },
                        ].map(({ id, label, icon: Icon }) => {
                          const isVisible = columnVisibility[id] !== false;
                          return (
                            <button
                              key={id}
                              onClick={() => {
                                setColumnVisibility((prev) => ({
                                  ...prev,
                                  [id]: !isVisible,
                                }));
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors"
                            >
                              <div
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                  isVisible
                                    ? "bg-[#6FEC06] border-[#6FEC06]"
                                    : "border-white/20"
                                }`}
                              >
                                {isVisible && (
                                  <Check className="w-3.5 h-3.5 text-black" />
                                )}
                              </div>
                              <Icon className="w-4 h-4 text-white/50" />
                              <span className="text-sm text-white/80">
                                {label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="px-3 py-2 border-t border-white/10">
                        <button
                          onClick={() => {
                            setColumnVisibility({
                              liquidity: true,
                              creatorWallet: true,
                              launchedAt: true,
                            });
                          }}
                          className="text-xs text-[#6FEC06] hover:underline"
                        >
                          Show all
                        </button>
                        <span className="text-white/20 mx-2">•</span>
                        <button
                          onClick={() => {
                            setColumnVisibility({
                              liquidity: false,
                              creatorWallet: false,
                              launchedAt: false,
                            });
                          }}
                          className="text-xs text-white/40 hover:text-white/60 hover:underline"
                        >
                          Hide all
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Refresh button */}
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-[#0a0520]/80 border border-white/10 hover:border-[#6FEC06]/30 text-white/50 hover:text-[#6FEC06] transition-all disabled:opacity-50 shrink-0"
            >
              <RefreshCw
                className={`w-4 h-4 sm:w-5 sm:h-5 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && view === "table" && <TableSkeleton />}
        {isLoading && view === "cards" && <CardsGridSkeleton />}

        {/* Empty state */}
        {!isLoading && filteredRows.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[#120557] to-[#6FEC06]/20 flex items-center justify-center border border-[#6FEC06]/30 shadow-lg shadow-[#6FEC06]/10">
              {typeFilter === "corporation" ? (
                <Building2 className="w-12 h-12 text-[#6FEC06]" />
              ) : typeFilter === "agent" ? (
                <Bot className="w-12 h-12 text-[#6FEC06]" />
              ) : (
                <Zap className="w-12 h-12 text-[#6FEC06]" />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-3 font-display">
              {typeFilter === "corporation"
                ? "No corporations found"
                : typeFilter === "agent"
                  ? "No agents found"
                  : "No items found"}
            </h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              {globalFilter
                ? "Try a different search term or clear your filters."
                : typeFilter === "corporation"
                  ? "Be the first to incorporate a corporation on Agent Inc."
                  : typeFilter === "agent"
                    ? "Be the first to mint an agent on Agent Inc."
                    : "Be the first to mint agents and incorporate corporations on Agent Inc."}
            </p>
            <Link
              href={
                typeFilter === "corporation"
                  ? "/dashboard/incorporate"
                  : "/dashboard/mint"
              }
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-full text-black font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#6FEC06]/25"
            >
              {typeFilter === "corporation" ? (
                <>
                  <Building2 className="w-5 h-5" />
                  Incorporate First Corporation
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Mint{" "}
                  {typeFilter === "agent" ? "First Agent" : "the First Agent"}
                </>
              )}
            </Link>
          </div>
        )}

        {/* Table view */}
        {!isLoading && filteredRows.length > 0 && view === "table" && (
          <div className="flex-1 flex flex-col min-h-0 min-w-0 rounded-2xl bg-[#0a0520]/50 border border-white/10 overflow-hidden">
            <div className="flex-1 overflow-auto min-w-0">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#0a0520] z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-white/10 text-left text-sm text-white/40"
                    >
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="py-4 px-4 font-medium">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {paginatedRows.map((row) => {
                    const globalIndex =
                      pagination.pageIndex * pagination.pageSize + row.index;
                    return (
                      <tr
                        key={row.id}
                        className="group border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="py-4 px-4">
                            {cell.column.id === "rank" ? (
                              <span className="text-white/40 text-sm">
                                {globalIndex + 1}
                              </span>
                            ) : (
                              flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 px-3 sm:px-4 py-2 sm:py-3 border-t border-white/10 bg-[#0a0520]">
              <div className="hidden sm:flex items-center gap-2 text-sm text-white/50">
                <span>
                  Showing {pagination.pageIndex * pagination.pageSize + 1}-
                  {Math.min(
                    (pagination.pageIndex + 1) * pagination.pageSize,
                    filteredRows.length,
                  )}{" "}
                  of {filteredRows.length}
                </span>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2">
                  {Array.from(
                    { length: Math.min(3, table.getPageCount()) },
                    (_, i) => {
                      const pageCount = table.getPageCount();
                      const currentPage = pagination.pageIndex;
                      let pageNumber: number;

                      if (pageCount <= 3) {
                        pageNumber = i;
                      } else if (currentPage < 2) {
                        pageNumber = i;
                      } else if (currentPage > pageCount - 3) {
                        pageNumber = pageCount - 3 + i;
                      } else {
                        pageNumber = currentPage - 1 + i;
                      }

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => table.setPageIndex(pageNumber)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                            pagination.pageIndex === pageNumber
                              ? "bg-[#6FEC06]/20 text-[#6FEC06]"
                              : "hover:bg-white/5 text-white/50"
                          }`}
                        >
                          {pageNumber + 1}
                        </button>
                      );
                    },
                  )}
                </div>

                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Last page"
                >
                  <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-white/50">Rows:</span>
                <div className="relative">
                  <select
                    value={pagination.pageSize}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}
                    className="appearance-none bg-[#0a0520] border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-sm text-white/80 cursor-pointer hover:border-white/20 focus:outline-none focus:border-[#6FEC06]/50 focus:ring-1 focus:ring-[#6FEC06]/20 transition-all"
                  >
                    {[10, 15, 20, 30, 50].map((size) => (
                      <option
                        key={size}
                        value={size}
                        className="bg-[#0a0520] text-white"
                      >
                        {size}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card view */}
        {!isLoading && filteredRows.length > 0 && view === "cards" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-auto pb-4 px-1 pt-4">
              <div className="grid gap-4 sm:gap-6 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-1">
                {paginatedRows.map((row) => (
                  <ItemCard
                    key={`${row.original.type}-${row.original.id}`}
                    item={row.original}
                    price={
                      row.original.tokenMint
                        ? prices[row.original.tokenMint] || null
                        : null
                    }
                  />
                ))}
              </div>
            </div>

            {/* Pagination controls for cards */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 px-3 sm:px-4 py-2 sm:py-3 border-t border-white/10 bg-[#0a0520]/80 rounded-lg sm:rounded-xl mt-3 sm:mt-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-white/50">
                <span>
                  Showing {pagination.pageIndex * pagination.pageSize + 1}-
                  {Math.min(
                    (pagination.pageIndex + 1) * pagination.pageSize,
                    filteredRows.length,
                  )}{" "}
                  of {filteredRows.length}
                </span>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2">
                  {Array.from(
                    { length: Math.min(3, table.getPageCount()) },
                    (_, i) => {
                      const pageCount = table.getPageCount();
                      const currentPage = pagination.pageIndex;
                      let pageNumber: number;

                      if (pageCount <= 3) {
                        pageNumber = i;
                      } else if (currentPage < 2) {
                        pageNumber = i;
                      } else if (currentPage > pageCount - 3) {
                        pageNumber = pageCount - 3 + i;
                      } else {
                        pageNumber = currentPage - 1 + i;
                      }

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => table.setPageIndex(pageNumber)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                            pagination.pageIndex === pageNumber
                              ? "bg-[#6FEC06]/20 text-[#6FEC06]"
                              : "hover:bg-white/5 text-white/50"
                          }`}
                        >
                          {pageNumber + 1}
                        </button>
                      );
                    },
                  )}
                </div>

                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Last page"
                >
                  <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-white/50">Rows:</span>
                <div className="relative">
                  <select
                    value={pagination.pageSize}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}
                    className="appearance-none bg-[#0a0520] border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-sm text-white/80 cursor-pointer hover:border-white/20 focus:outline-none focus:border-[#6FEC06]/50 focus:ring-1 focus:ring-[#6FEC06]/20 transition-all"
                  >
                    {[10, 15, 20, 30, 50].map((size) => (
                      <option
                        key={size}
                        value={size}
                        className="bg-[#0a0520] text-white"
                      >
                        {size}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
