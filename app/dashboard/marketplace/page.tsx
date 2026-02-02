"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Users,
  ExternalLink,
  ArrowUpRight,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Zap,
} from "lucide-react";

// Types
interface MarketplaceAgent {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  rarity: string | null;
  personality: string | null;
  traits: string[];
  tokenMint: string | null;
  tokenSymbol: string | null;
  launchedAt: string | null;
  type: "agent";
  creatorId?: string;
  corporationName?: string | null;
  corporationLogo?: string | null;
}

interface MarketplaceCorporation {
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
}

type MarketplaceItem = MarketplaceAgent | MarketplaceCorporation;

interface PriceData {
  price: number;
  priceChange24h?: number;
}

type SortField = "name" | "price" | "change" | "launchedAt";
type SortDirection = "asc" | "desc";

// Rarity colors
const rarityColors: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  legendary: {
    bg: "bg-[#FFD700]/20",
    text: "text-[#FFD700]",
    border: "border-[#FFD700]/50",
  },
  epic: {
    bg: "bg-[#A855F7]/20",
    text: "text-[#A855F7]",
    border: "border-[#A855F7]/50",
  },
  rare: {
    bg: "bg-[#3B82F6]/20",
    text: "text-[#3B82F6]",
    border: "border-[#3B82F6]/50",
  },
  uncommon: {
    bg: "bg-[#6FEC06]/20",
    text: "text-[#6FEC06]",
    border: "border-[#6FEC06]/50",
  },
  common: {
    bg: "bg-white/10",
    text: "text-white/60",
    border: "border-white/20",
  },
};

// Format price with appropriate decimals
function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
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
  items: MarketplaceItem[];
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
                  ? `/agent/${item.id}`
                  : `/dashboard/network`
              }
              className="flex items-center gap-2 px-3 py-1 hover:bg-white/5 rounded-lg transition-colors"
            >
              {item.type === "agent" && (item as MarketplaceAgent).imageUrl ? (
                <Image
                  src={(item as MarketplaceAgent).imageUrl!}
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

// Table row component
function TableRow({
  item,
  price,
  index,
}: {
  item: MarketplaceItem;
  price: PriceData | null;
  index: number;
}) {
  const isAgent = item.type === "agent";
  const agent = isAgent ? (item as MarketplaceAgent) : null;
  const corp = !isAgent ? (item as MarketplaceCorporation) : null;
  const isPositive = (price?.priceChange24h || 0) >= 0;
  const rarityStyle = agent?.rarity
    ? rarityColors[agent.rarity]
    : rarityColors.common;

  return (
    <tr className="group border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      {/* Rank */}
      <td className="py-4 px-4 text-white/40 text-sm">{index + 1}</td>

      {/* Name */}
      <td className="py-4 px-4">
        <Link
          href={isAgent ? `/agent/${item.id}` : `/dashboard/network`}
          className="flex items-center gap-3 group/link"
        >
          {/* Image */}
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

          {/* Name and symbol */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate group-hover/link:text-[#6FEC06] transition-colors">
                {item.name}
              </span>
              {item.tokenSymbol && (
                <span className="px-1.5 py-0.5 rounded bg-[#6FEC06]/10 text-[#6FEC06] text-[10px] font-medium">
                  {item.tokenSymbol}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-xs ${isAgent ? "text-[#6FEC06]/60" : "text-white/40"}`}
              >
                {isAgent ? "Agent" : "Corporation"}
              </span>
              {agent?.corporationName && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="text-xs text-white/40">
                    {agent.corporationName}
                  </span>
                </>
              )}
              {corp && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="text-xs text-white/40">
                    {corp.agentCount} agents
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>
      </td>

      {/* 24h Change */}
      <td className="py-4 px-4">
        <div
          className={`flex items-center gap-1 ${isPositive ? "text-[#6FEC06]" : "text-red-400"}`}
        >
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="font-medium">
            {formatChange(price?.priceChange24h)}
          </span>
        </div>
      </td>

      {/* Price */}
      <td className="py-4 px-4">
        <span className="font-mono text-sm">
          {price ? formatPrice(price.price) : "-"}
        </span>
      </td>

      {/* Rarity / Type */}
      <td className="py-4 px-4">
        {agent?.rarity ? (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${rarityStyle.bg} ${rarityStyle.text}`}
          >
            {agent.rarity}
          </span>
        ) : (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#120557]/50 text-white/50">
            {isAgent ? "Agent" : "Corp"}
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={isAgent ? `/agent/${item.id}` : `/dashboard/network`}
            className="p-2 rounded-lg bg-white/5 hover:bg-[#6FEC06]/20 hover:text-[#6FEC06] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          {item.tokenMint && (
            <a
              href={`https://solscan.io/token/${item.tokenMint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/5 hover:bg-[#6FEC06]/20 hover:text-[#6FEC06] transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

// Card component
function ItemCard({
  item,
  price,
}: {
  item: MarketplaceItem;
  price: PriceData | null;
}) {
  const isAgent = item.type === "agent";
  const agent = isAgent ? (item as MarketplaceAgent) : null;
  const corp = !isAgent ? (item as MarketplaceCorporation) : null;
  const isPositive = (price?.priceChange24h || 0) >= 0;
  const rarityStyle = agent?.rarity
    ? rarityColors[agent.rarity]
    : rarityColors.common;

  return (
    <Link
      href={isAgent ? `/agent/${item.id}` : `/dashboard/network`}
      className={`group relative rounded-2xl bg-[#0a0520] border ${
        agent?.rarity && agent.rarity !== "common"
          ? rarityStyle.border
          : "border-white/10"
      } hover:border-[#6FEC06]/50 transition-all duration-300 overflow-hidden marketplace-card`}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-[#120557]/50 to-[#000028] overflow-hidden">
        {agent?.imageUrl ? (
          <Image
            src={agent.imageUrl}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
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

        {/* Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          {item.tokenSymbol && (
            <span className="px-2.5 py-1 rounded-full bg-[#6FEC06]/20 text-[#6FEC06] text-xs font-semibold backdrop-blur-sm border border-[#6FEC06]/30">
              {item.tokenSymbol}
            </span>
          )}
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
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
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

        <h3 className="font-bold text-lg truncate font-display mb-1">
          {item.name}
        </h3>

        {item.description && (
          <p className="text-white/50 text-sm line-clamp-2 mb-3">
            {item.description}
          </p>
        )}

        {/* Traits for agents */}
        {agent?.traits && agent.traits.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {agent.traits.slice(0, 3).map((trait) => (
              <span
                key={trait}
                className="px-2 py-0.5 rounded-full bg-[#120557]/50 border border-[#6FEC06]/20 text-[10px] text-white/60 uppercase tracking-wider"
              >
                {trait}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-white/40 text-xs">Price</span>
          <span className="font-mono font-medium">
            {price ? formatPrice(price.price) : "-"}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Main Marketplace component
export default function MarketplacePage() {
  const [view, setView] = useState<"table" | "cards">("table");
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "agent" | "corporation">(
    "all",
  );
  const [sortField, setSortField] = useState<SortField>("launchedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Fetch marketplace data
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);

    try {
      const res = await fetch("/api/marketplace");
      if (!res.ok) throw new Error("Failed to fetch marketplace data");

      const data = await res.json();
      const allItems = [...data.agents, ...data.corporations];
      setItems(allItems);

      // Fetch prices if we have token mints
      if (data.tokenMints && data.tokenMints.length > 0) {
        const priceRes = await fetch(
          `/api/marketplace/prices?mints=${data.tokenMints.join(",")}`,
        );
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          setPrices(priceData.prices || {});
        }
      }
    } catch (error) {
      console.error("Error fetching marketplace:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const mints = items.filter((i) => i.tokenMint).map((i) => i.tokenMint!);
      if (mints.length > 0) {
        fetch(`/api/marketplace/prices?mints=${mints.join(",")}`)
          .then((res) => res.json())
          .then((data) => setPrices(data.prices || {}))
          .catch(console.error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = items;

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((item) => item.type === typeFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.tokenSymbol?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "price":
          const priceA = prices[a.tokenMint || ""]?.price || 0;
          const priceB = prices[b.tokenMint || ""]?.price || 0;
          comparison = priceA - priceB;
          break;
        case "change":
          const changeA = prices[a.tokenMint || ""]?.priceChange24h || 0;
          const changeB = prices[b.tokenMint || ""]?.priceChange24h || 0;
          comparison = changeA - changeB;
          break;
        case "launchedAt":
          const dateA = a.launchedAt ? new Date(a.launchedAt).getTime() : 0;
          const dateB = b.launchedAt ? new Date(b.launchedAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });

    return result;
  }, [items, typeFilter, searchQuery, sortField, sortDirection, prices]);

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "desc" ? (
      <ChevronDown className="w-4 h-4" />
    ) : (
      <ChevronUp className="w-4 h-4" />
    );
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      {/* Price ticker */}
      <PriceTicker items={items} prices={prices} />

      <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#6FEC06]/30 bg-[#6FEC06]/10 mb-4">
            <div className="relative">
              <Sparkles className="w-3.5 h-3.5 text-[#6FEC06]" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#6FEC06] rounded-full animate-live-pulse" />
            </div>
            <span className="text-xs font-medium text-[#6FEC06]">
              Live Marketplace
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 font-display">
                Agent <span className="gradient-text-shimmer">Marketplace</span>
              </h1>
              <p className="text-white/50">
                Discover and trade AI agents and corporations on Solana
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="flex items-center gap-1.5 text-2xl font-bold">
                  <Bot className="w-5 h-5 text-[#6FEC06]" />
                  {items.filter((i) => i.type === "agent").length}
                </div>
                <span className="text-xs text-white/40">Agents</span>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5 text-2xl font-bold">
                  <Building2 className="w-5 h-5 text-[#120557]" />
                  {items.filter((i) => i.type === "corporation").length}
                </div>
                <span className="text-xs text-white/40">Corps</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder="Search by name, symbol, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0a0520]/80 border border-white/10 focus:border-[#6FEC06]/50 focus:outline-none focus:ring-1 focus:ring-[#6FEC06]/30 transition-all placeholder:text-white/30"
            />
          </div>

          {/* Type filter */}
          <div className="flex rounded-xl bg-[#0a0520]/80 border border-white/10 p-1">
            {(["all", "agent", "corporation"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  typeFilter === type
                    ? "bg-[#6FEC06]/20 text-[#6FEC06]"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {type === "all" ? (
                  "All"
                ) : type === "agent" ? (
                  <span className="flex items-center gap-1.5">
                    <Bot className="w-4 h-4" /> Agents
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Corps
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex rounded-xl bg-[#0a0520]/80 border border-white/10 p-1">
            <button
              onClick={() => setView("table")}
              className={`p-2.5 rounded-lg transition-all ${
                view === "table"
                  ? "bg-[#6FEC06]/20 text-[#6FEC06]"
                  : "text-white/50 hover:text-white"
              }`}
              title="Table view"
            >
              <LayoutList className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView("cards")}
              className={`p-2.5 rounded-lg transition-all ${
                view === "cards"
                  ? "bg-[#6FEC06]/20 text-[#6FEC06]"
                  : "text-white/50 hover:text-white"
              }`}
              title="Card view"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="p-3 rounded-xl bg-[#0a0520]/80 border border-white/10 hover:border-[#6FEC06]/30 text-white/50 hover:text-[#6FEC06] transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-2 border-[#6FEC06]/30 border-t-[#6FEC06] rounded-full animate-spin mb-4" />
            <p className="text-white/40 text-sm">Loading marketplace...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredItems.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[#120557] to-[#6FEC06]/20 flex items-center justify-center border border-[#6FEC06]/30 shadow-lg shadow-[#6FEC06]/10">
              <Zap className="w-12 h-12 text-[#6FEC06]" />
            </div>
            <h2 className="text-2xl font-bold mb-3 font-display">
              No items found
            </h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              {searchQuery
                ? "Try a different search term or clear your filters."
                : "The marketplace is waiting for the first minted agents and corporations."}
            </p>
            <Link
              href="/dashboard/mint"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-full text-black font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#6FEC06]/25"
            >
              <Sparkles className="w-5 h-5" />
              Mint the First Agent
            </Link>
          </div>
        )}

        {/* Table view */}
        {!isLoading && filteredItems.length > 0 && view === "table" && (
          <div className="rounded-2xl bg-[#0a0520]/50 border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left text-sm text-white/40">
                    <th className="py-4 px-4 font-medium">#</th>
                    <th
                      className="py-4 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <span className="flex items-center gap-1">
                        Name <SortIndicator field="name" />
                      </span>
                    </th>
                    <th
                      className="py-4 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort("change")}
                    >
                      <span className="flex items-center gap-1">
                        24h Change <SortIndicator field="change" />
                      </span>
                    </th>
                    <th
                      className="py-4 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort("price")}
                    >
                      <span className="flex items-center gap-1">
                        Price <SortIndicator field="price" />
                      </span>
                    </th>
                    <th className="py-4 px-4 font-medium">Type</th>
                    <th className="py-4 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <TableRow
                      key={`${item.type}-${item.id}`}
                      item={item}
                      price={
                        item.tokenMint ? prices[item.tokenMint] || null : null
                      }
                      index={index}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Card view */}
        {!isLoading && filteredItems.length > 0 && view === "cards" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <ItemCard
                key={`${item.type}-${item.id}`}
                item={item}
                price={item.tokenMint ? prices[item.tokenMint] || null : null}
              />
            ))}
          </div>
        )}

        {/* Results count */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="mt-6 text-center text-sm text-white/40">
            Showing {filteredItems.length} of {items.length} items
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        )}
      </div>
    </div>
  );
}
