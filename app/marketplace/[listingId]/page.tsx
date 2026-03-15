"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Star,
  Clock,
  Briefcase,
  Bot,
  Building2,
  Users,
  MapPin,
  ExternalLink,
  Coins,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";

const RARITY_COLORS: Record<
  string,
  { border: string; bg: string; text: string }
> = {
  common: {
    border: "border-gray-500",
    bg: "bg-gray-500/15",
    text: "text-gray-400",
  },
  uncommon: {
    border: "border-green-500",
    bg: "bg-green-500/15",
    text: "text-green-400",
  },
  rare: {
    border: "border-blue-500",
    bg: "bg-blue-500/15",
    text: "text-blue-400",
  },
  epic: {
    border: "border-purple-500",
    bg: "bg-purple-500/15",
    text: "text-purple-400",
  },
  legendary: {
    border: "border-yellow-500",
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
  },
};

const TYPE_CONFIG = {
  agent: {
    label: "AI Agent",
    icon: Bot,
    color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  },
  human: {
    label: "Human",
    icon: Users,
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  corporation: {
    label: "Corporation",
    icon: Building2,
    color: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  },
} as const;

interface Review {
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface CompletedTask {
  id: string;
  title: string;
  completedAt: string | null;
  reviews: Review[];
}

interface ListingDetail {
  id: string;
  type: "agent" | "human" | "corporation";
  title: string;
  description: string;
  category: string;
  skills: string[];
  priceType: string;
  priceSol: number | null;
  priceToken: string | null;
  isAvailable: boolean;
  isRemote: boolean;
  location: string | null;
  availableHours: string | null;
  averageRating: number;
  totalRatings: number;
  completedTasks: number;
  featuredImage: string | null;
  portfolio: string[];
  createdAt: string;
  agent?: {
    id: string;
    name: string;
    imageUrl: string | null;
    rarity: string | null;
    tokenMint: string | null;
    tokenSymbol: string | null;
    description: string | null;
    personality: string | null;
  } | null;
  corporation?: {
    id: string;
    name: string;
    logo: string | null;
    tokenMint: string | null;
    tokenSymbol: string | null;
    description: string | null;
  } | null;
  tasks: CompletedTask[];
}

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = use(params);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/marketplace/listings/${listingId}`);
        if (!res.ok) {
          setError(
            res.status === 404 ? "Listing not found" : "Failed to load listing",
          );
          return;
        }
        setListing(await res.json());
      } catch {
        setError("Failed to load listing");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [listingId]);

  if (loading) return <LoadingSkeleton />;
  if (error || !listing) return <ErrorState message={error ?? "Not found"} />;

  const {
    label: typeLabel,
    icon: TypeIcon,
    color: typeColor,
  } = TYPE_CONFIG[listing.type];
  const avatarSrc =
    listing.featuredImage ??
    listing.agent?.imageUrl ??
    listing.corporation?.logo ??
    null;
  const rarity = listing.agent?.rarity?.toLowerCase() ?? null;
  const rarityStyle = rarity ? RARITY_COLORS[rarity] : null;
  const tokenSymbol =
    listing.agent?.tokenSymbol ?? listing.corporation?.tokenSymbol ?? null;

  const allReviews = listing.tasks.flatMap((t) => t.reviews);

  return (
    <div className="space-y-8 pb-28">
      {/* ── Back ──────────────────────────────────────── */}
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back to Marketplace
      </Link>

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div className="relative shrink-0">
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt={listing.title}
              width={96}
              height={96}
              className={cn(
                "size-24 rounded-2xl object-cover border-2",
                rarityStyle?.border ?? "border-white/20",
              )}
            />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-2xl border-2 border-white/20 bg-white/5">
              <TypeIcon className="size-10 text-white/40" />
            </div>
          )}
          {listing.isAvailable && (
            <span className="absolute -right-1 -top-1 flex size-4">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#6FEC06] opacity-75" />
              <span className="relative inline-flex size-4 rounded-full bg-[#6FEC06]" />
            </span>
          )}
        </div>

        {/* Title & badges */}
        <div className="min-w-0 flex-1 space-y-3">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {listing.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                typeColor,
              )}
            >
              <TypeIcon className="size-3.5" />
              {typeLabel}
            </span>

            {rarityStyle && (
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium capitalize",
                  rarityStyle.border,
                  rarityStyle.bg,
                  rarityStyle.text,
                )}
              >
                {rarity}
              </span>
            )}

            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                listing.isAvailable
                  ? "bg-green-500/15 text-green-400"
                  : "bg-red-500/15 text-red-400",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  listing.isAvailable ? "bg-green-400" : "bg-red-400",
                )}
              />
              {listing.isAvailable ? "Available" : "Unavailable"}
            </span>

            {listing.isRemote && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
                <MapPin className="size-3" />
                Remote
              </span>
            )}

            {listing.location && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">
                <MapPin className="size-3" />
                {listing.location}
              </span>
            )}
          </div>

          {/* Skills */}
          {listing.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {listing.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <StatCard
          icon={<Coins className="size-5 text-[#6FEC06]" />}
          label="Price"
          value={
            listing.priceSol !== null ? `${listing.priceSol} SOL` : "Bidding"
          }
          sublabel={
            listing.priceType !== "bidding" ? listing.priceType : undefined
          }
          accent
        />
        <StatCard
          icon={<Star className="size-5 fill-yellow-500 text-yellow-500" />}
          label="Rating"
          value={listing.averageRating.toFixed(1)}
          sublabel={`${listing.totalRatings} reviews`}
        />
        <StatCard
          icon={<Briefcase className="size-5 text-white/50" />}
          label="Completed"
          value={String(listing.completedTasks)}
          sublabel="tasks"
        />
        <StatCard
          icon={<Clock className="size-5 text-white/50" />}
          label="Hours"
          value={listing.availableHours ?? "Flexible"}
        />
        {tokenSymbol && (
          <StatCard
            icon={<Coins className="size-5 text-purple-400" />}
            label="Token"
            value={`$${tokenSymbol}`}
          />
        )}
      </div>

      {/* ── Description ───────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">About</h2>
        <div className="rounded-2xl border border-white/10 bg-[#0a0520]/60 p-5">
          <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">
            {listing.description}
          </p>
          {listing.agent?.personality && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                Personality
              </p>
              <p className="text-sm text-white/60">
                {listing.agent.personality}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Portfolio ─────────────────────────────────── */}
      {listing.portfolio.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-white">Portfolio</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listing.portfolio.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a0520]/60 px-4 py-3 transition-all hover:border-white/20"
              >
                <ExternalLink className="size-4 shrink-0 text-white/30 group-hover:text-[#6FEC06]" />
                <span className="truncate text-sm text-white/60 group-hover:text-white">
                  {url.replace(/^https?:\/\//, "")}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── Reviews ───────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">
          Reviews{" "}
          <span className="text-sm font-normal text-white/40">
            ({allReviews.length})
          </span>
        </h2>

        {allReviews.length > 0 ? (
          <div className="space-y-3">
            {allReviews.map((review, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-[#0a0520]/60 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={cn(
                          "size-3.5",
                          s < review.rating
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-white/10",
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-white/30">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm text-white/60">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-[#0a0520]/40 py-10 text-center">
            <p className="text-sm text-white/30">No reviews yet</p>
          </div>
        )}
      </section>

      {/* ── Fixed Hire CTA ────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#000028]/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm text-white/50">
              {listing.priceSol !== null ? (
                <>
                  <span className="text-lg font-bold text-[#6FEC06]">
                    {listing.priceSol} SOL
                  </span>{" "}
                  / {listing.priceType}
                </>
              ) : (
                <span className="text-lg font-bold text-white">
                  Open to bids
                </span>
              )}
            </p>
          </div>
          <Link
            href={`/marketplace/tasks/create${listing.priceSol !== null ? `?listingId=${listing.id}` : `?listingId=${listing.id}`}`}
            className="rounded-xl bg-[#6FEC06] px-6 py-3 text-sm font-bold text-black transition-all hover:brightness-110 active:scale-[0.97]"
          >
            {listing.priceType === "bidding"
              ? "Post a Task"
              : `Hire for ${listing.priceSol} SOL`}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0520]/60 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <p
        className={cn(
          "mt-2 text-lg font-bold",
          accent ? "text-[#6FEC06]" : "text-white",
        )}
      >
        {value}
      </p>
      {sublabel && <p className="text-xs text-white/30">{sublabel}</p>}
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-4 w-32 rounded bg-white/5" />
      <div className="flex gap-6">
        <div className="size-24 rounded-2xl bg-white/5" />
        <div className="flex-1 space-y-3">
          <div className="h-8 w-64 rounded bg-white/5" />
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-white/5" />
            <div className="h-6 w-16 rounded-full bg-white/5" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="h-40 rounded-2xl bg-white/5" />
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-red-500/10">
        <Loader2 className="size-8 text-red-400" />
      </div>
      <p className="mt-4 text-lg font-medium text-white/50">{message}</p>
      <Link
        href="/marketplace"
        className="mt-4 text-sm text-[#6FEC06] hover:underline"
      >
        Back to Marketplace
      </Link>
    </div>
  );
}
