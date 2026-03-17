"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Clock,
  Briefcase,
  Bot,
  Building2,
  Users,
  MapPin,
  Coins,
  AlertTriangle,
  Sparkles,
  Globe,
  Shield,
  Zap,
  User,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getRarityBadgeStyle,
  getRarityDetailStyle,
  type Rarity,
} from "@/lib/utils/rarity";

const TYPE_CONFIG = {
  agent: {
    label: "AI Agent",
    icon: Bot,
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  human: {
    label: "Human",
    icon: Users,
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  corporation: {
    label: "Corporation",
    icon: Building2,
    color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
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

export interface ListingDetailData {
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
    createdBy?: { activeWallet: { address: string } | null } | null;
  } | null;
  corporation?: {
    id: string;
    name: string;
    logo: string | null;
    tokenMint: string | null;
    tokenSymbol: string | null;
    description: string | null;
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
  tasks: CompletedTask[];
}

interface ListingDetailProps {
  listingId: string;
  backHref: string;
  backLabel: string;
  hireHref: (listingId: string) => string;
  /** "fixed" renders a sticky bottom bar, "inline" renders a card in-page */
  ctaStyle: "fixed" | "inline";
}

export default function ListingDetail({
  listingId,
  backHref,
  backLabel,
  hireHref,
  ctaStyle,
}: ListingDetailProps) {
  const [listing, setListing] = useState<ListingDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

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
  if (error || !listing)
    return <ErrorState message={error ?? "Not found"} backHref={backHref} />;

  const {
    label: typeLabel,
    icon: TypeIcon,
    color: typeColor,
  } = TYPE_CONFIG[listing.type];
  const isExternalAgent =
    listing.type === "agent" &&
    !listing.agent &&
    !!(
      listing.externalAgentUrl ||
      listing.externalMcpUrl ||
      listing.externalA2aUrl
    );
  const avatarSrc = imgError
    ? null
    : (listing.featuredImage ??
      listing.agent?.imageUrl ??
      listing.externalAgentImage ??
      listing.corporation?.logo ??
      null);
  const rarity = (listing.agent?.rarity?.toLowerCase() ?? "common") as Rarity;
  const rarityBadge = getRarityBadgeStyle(rarity);
  const rarityDetail = getRarityDetailStyle(rarity);
  const tokenSymbol =
    listing.agent?.tokenSymbol ?? listing.corporation?.tokenSymbol ?? null;
  const creatorWallet =
    listing.user?.activeWallet?.address ??
    listing.agent?.createdBy?.activeWallet?.address ??
    null;

  const allReviews = listing.tasks.flatMap((t) => t.reviews);

  const hireLinkHref = hireHref(listing.id);
  const hireLabel =
    listing.priceType === "bidding" || listing.priceSol === null
      ? "Post a Task"
      : `Hire for ${listing.priceSol} SOL`;

  return (
    <>
      <div className={cn("space-y-8", ctaStyle === "fixed" && "pb-28")}>
        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={cn(
            "relative overflow-hidden rounded-3xl border p-6 sm:p-8",
            rarity !== "common"
              ? `${rarityDetail.border}/30 ${rarityDetail.glow}`
              : "border-white/10",
            "bg-surface/80",
          )}
        >
          {rarity !== "common" && (
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-30",
                rarityDetail.gradient,
              )}
            />
          )}

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt={listing.title}
                  width={112}
                  height={112}
                  className={cn(
                    "size-28 rounded-2xl object-cover ring-2",
                    rarity !== "common"
                      ? `${rarityDetail.border}/50`
                      : "ring-white/20",
                  )}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex size-28 items-center justify-center rounded-2xl border-2 border-white/20 bg-white/5">
                  <TypeIcon className="size-12 text-white/30" />
                </div>
              )}
              {listing.isAvailable && (
                <span className="absolute -right-1.5 -top-1.5 flex size-5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-coral opacity-60" />
                  <span className="relative inline-flex size-5 items-center justify-center rounded-full bg-coral">
                    <Zap className="size-2.5 text-black" />
                  </span>
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-white font-display sm:text-4xl">
                  {listing.title}
                </h1>
                {listing.agent?.name &&
                  listing.agent.name !== listing.title && (
                    <p className="mt-1 text-sm text-white/40">
                      by {listing.agent.name}
                    </p>
                  )}
                {isExternalAgent && listing.externalAgentName && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-cyan-400/60">
                    <ExternalLink className="size-3" />
                    {listing.externalAgentName}
                  </p>
                )}
                {creatorWallet && (
                  <Link
                    href={`/profile/${creatorWallet}`}
                    className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-white/35 font-mono hover:text-[#6FEC06] transition-colors"
                  >
                    <User className="size-3" />
                    {creatorWallet.slice(0, 4)}...{creatorWallet.slice(-4)}
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold",
                    typeColor,
                  )}
                >
                  <TypeIcon className="size-3.5" />
                  {typeLabel}
                </span>

                {isExternalAgent && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-400">
                    <ExternalLink className="size-3" />
                    External Agent
                  </span>
                )}

                {rarity !== "common" && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize",
                      rarityBadge.border,
                      rarityBadge.bg,
                      rarityBadge.text,
                    )}
                  >
                    <Sparkles className="size-3" />
                    {rarity}
                  </span>
                )}

                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                    listing.isAvailable
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400",
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      listing.isAvailable ? "bg-emerald-400" : "bg-red-400",
                    )}
                  />
                  {listing.isAvailable ? "Available" : "Unavailable"}
                </span>

                {listing.isRemote && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
                    <Globe className="size-3" />
                    Remote
                  </span>
                )}

                {listing.location && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50">
                    <MapPin className="size-3" />
                    {listing.location}
                  </span>
                )}
              </div>

              {listing.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {listing.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-white/5 px-3 py-1 text-xs font-medium text-white/60"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5"
        >
          <StatCard
            icon={<Coins className="size-5 text-coral" />}
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
            icon={<Star className="size-5 fill-amber-400 text-amber-400" />}
            label="Rating"
            value={listing.averageRating.toFixed(1)}
            sublabel={`${listing.totalRatings} reviews`}
          />
          <StatCard
            icon={<Briefcase className="size-5 text-white/40" />}
            label="Completed"
            value={String(listing.completedTasks)}
            sublabel="tasks"
          />
          <StatCard
            icon={<Clock className="size-5 text-white/40" />}
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
        </motion.div>

        {/* Inline Hire CTA */}
        {ctaStyle === "inline" && listing.isAvailable && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
            className="flex flex-col items-center gap-4 rounded-2xl border border-coral/20 bg-coral/5 p-6 sm:flex-row sm:justify-between"
          >
            <PriceDisplay listing={listing} />
            <Link
              href={hireLinkHref}
              className="btn-cta-primary rounded-xl px-8 py-3 text-sm font-bold"
            >
              {hireLabel}
            </Link>
          </motion.div>
        )}

        {/* Description */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <h2 className="mb-3 text-lg font-semibold text-white font-display">
            About
          </h2>
          <div className="rounded-2xl border border-white/10 bg-surface/60 p-6">
            <p className="whitespace-pre-line text-sm leading-relaxed text-white/60">
              {listing.description}
            </p>
            {listing.agent?.personality && (
              <div className="mt-5 border-t border-white/5 pt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/30">
                  Personality
                </p>
                <p className="text-sm text-white/50 italic">
                  {listing.agent.personality}
                </p>
              </div>
            )}
          </div>
        </motion.section>

        {/* External Agent Endpoints */}
        {isExternalAgent && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2 className="mb-3 text-lg font-semibold text-white font-display">
              Agent Endpoints
            </h2>
            <div className="rounded-2xl border border-cyan-500/10 bg-surface/60 p-6 space-y-3">
              {listing.externalAgentUrl && (
                <EndpointRow
                  label="HTTP / REST"
                  url={listing.externalAgentUrl}
                  color="text-white/60"
                />
              )}
              {listing.externalMcpUrl && (
                <EndpointRow
                  label="MCP Server"
                  url={listing.externalMcpUrl}
                  color="text-cyan-400"
                />
              )}
              {listing.externalA2aUrl && (
                <EndpointRow
                  label="A2A Protocol"
                  url={listing.externalA2aUrl}
                  color="text-violet-400"
                />
              )}
            </div>
          </motion.section>
        )}

        {/* Reviews */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <h2 className="mb-3 text-lg font-semibold text-white font-display">
            Reviews{" "}
            <span className="text-sm font-normal text-white/30">
              ({allReviews.length})
            </span>
          </h2>

          {allReviews.length > 0 ? (
            <div className="space-y-3">
              {allReviews.map((review, i) => (
                <div
                  key={`${review.createdAt}-${review.rating}-${i}`}
                  className="rounded-xl border border-white/10 bg-surface/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className={cn(
                            "size-3.5",
                            s < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-white/10",
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-white/25">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-white/50">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-surface/40 py-12 text-center">
              <Star className="mx-auto size-8 text-white/10" />
              <p className="mt-2 text-sm text-white/25">No reviews yet</p>
            </div>
          )}
        </motion.section>
      </div>

      {/* Fixed bottom Hire CTA */}
      {ctaStyle === "fixed" && listing.isAvailable && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-abyss/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <PriceDisplay listing={listing} />
            <Link
              href={hireLinkHref}
              className="btn-cta-primary rounded-xl px-8 py-3 text-sm font-bold"
            >
              {hireLabel}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function PriceDisplay({ listing }: { listing: ListingDetailData }) {
  return (
    <div className="flex items-center gap-3">
      <Shield className="size-5 text-coral/60" />
      <div>
        {listing.priceSol !== null ? (
          <p className="text-sm text-white/40">
            <span className="text-xl font-bold text-coral">
              {listing.priceSol} SOL
            </span>{" "}
            / {listing.priceType}
          </p>
        ) : (
          <p className="text-xl font-bold text-white">Open to bids</p>
        )}
        <p className="text-[10px] text-white/25">Secured by on-chain escrow</p>
      </div>
    </div>
  );
}

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
    <div className="rounded-xl border border-white/10 bg-surface/60 p-4 transition-all hover:border-white/15">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-white/35">{label}</span>
      </div>
      <p
        className={cn(
          "mt-2 text-lg font-bold",
          accent ? "text-coral" : "text-white",
        )}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-[10px] text-white/25 capitalize">{sublabel}</p>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-4 w-32 rounded bg-white/5 skeleton-shimmer" />
      <div className="rounded-3xl border border-white/5 bg-surface/60 p-8 skeleton-shimmer">
        <div className="flex gap-6">
          <div className="size-28 rounded-2xl bg-white/5" />
          <div className="flex-1 space-y-3">
            <div className="h-10 w-72 rounded-lg bg-white/5" />
            <div className="flex gap-2">
              <div className="h-7 w-24 rounded-lg bg-white/5" />
              <div className="h-7 w-20 rounded-lg bg-white/5" />
              <div className="h-7 w-20 rounded-lg bg-white/5" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-lg bg-white/5" />
              <div className="h-6 w-20 rounded-lg bg-white/5" />
              <div className="h-6 w-14 rounded-lg bg-white/5" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-surface/60 border border-white/5 skeleton-shimmer"
          />
        ))}
      </div>
      <div className="h-40 rounded-2xl bg-surface/60 border border-white/5 skeleton-shimmer" />
    </div>
  );
}

function EndpointRow({
  label,
  url,
  color,
}: {
  label: string;
  url: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <LinkIcon className={cn("size-4 shrink-0", color)} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
          {label}
        </p>
        <p className="truncate text-xs font-mono text-white/50">{url}</p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg bg-white/5 p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
      >
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}

function ErrorState({
  message,
  backHref,
}: {
  message: string;
  backHref: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="flex size-20 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5">
        <AlertTriangle className="size-8 text-red-400" />
      </div>
      <p className="mt-4 text-lg font-medium text-white/40">{message}</p>
      <Link href={backHref} className="mt-4 text-sm text-coral hover:underline">
        Back to Marketplace
      </Link>
    </motion.div>
  );
}
