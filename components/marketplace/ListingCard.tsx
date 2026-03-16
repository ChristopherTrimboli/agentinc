"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Bot, Building2, Users, Briefcase, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  getRarityBadgeStyle,
  RARITY_BADGE_STYLES,
  type Rarity,
} from "@/lib/utils/rarity";

interface ListingCardProps {
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
  featuredImage?: string | null;
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
  index?: number;
}

const TYPE_CONFIG = {
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

const RARITY_GLOW: Record<string, string> = {
  legendary: "hover:shadow-[0_0_30px_rgba(255,215,0,0.15)]",
  epic: "hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]",
  rare: "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
  uncommon: "hover:shadow-[0_0_30px_rgba(111,236,6,0.15)]",
  common: "",
};

function getAvatarSrc(props: ListingCardProps): string | null {
  if (props.featuredImage) return props.featuredImage;
  if (props.agent?.imageUrl) return props.agent.imageUrl;
  if (props.corporation?.logo) return props.corporation.logo;
  return null;
}

export default function ListingCard(props: ListingCardProps) {
  const {
    id,
    type,
    title,
    description,
    skills,
    priceSol,
    isAvailable,
    averageRating,
    totalRatings,
    completedTasks,
    agent,
    index = 0,
  } = props;

  const avatarSrc = getAvatarSrc(props);
  const {
    label: typeLabel,
    icon: TypeIcon,
    color: typeColor,
  } = TYPE_CONFIG[type];
  const rarity = (agent?.rarity?.toLowerCase() ?? "common") as Rarity;
  const rarityStyle = getRarityBadgeStyle(rarity);
  const tokenSymbol = agent?.tokenSymbol ?? props.corporation?.tokenSymbol;
  const visibleSkills = skills.slice(0, 3);
  const extraSkillCount = skills.length - 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
    >
      <Link
        href={`/marketplace/${id}`}
        className={cn(
          "group relative block rounded-2xl border bg-surface/80 p-4 transition-all duration-300",
          "hover:scale-[1.02] hover:-translate-y-0.5",
          rarity !== "common"
            ? `${RARITY_BADGE_STYLES[rarity].border} ${RARITY_GLOW[rarity]}`
            : "border-white/10 hover:border-white/20",
        )}
      >
        {/* Rarity shimmer for legendary/epic */}
        {(rarity === "legendary" || rarity === "epic") && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
              rarity === "legendary"
                ? "bg-gradient-to-br from-[#FFD700]/5 to-transparent"
                : "bg-gradient-to-br from-[#A855F7]/5 to-transparent",
            )}
          />
        )}

        {/* Header */}
        <div className="relative flex items-start gap-3">
          <div className="relative shrink-0">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={title}
                width={48}
                height={48}
                className={cn(
                  "size-12 rounded-xl object-cover ring-2",
                  rarity !== "common"
                    ? `ring-${rarity === "legendary" ? "[#FFD700]" : rarity === "epic" ? "[#A855F7]" : rarity === "rare" ? "[#3B82F6]" : "[#6FEC06]"}/40`
                    : "ring-white/10",
                )}
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-xl bg-white/5 ring-2 ring-white/10">
                <TypeIcon className="size-5 text-white/40" />
              </div>
            )}
            {isAvailable && (
              <span className="absolute -right-1 -top-1 flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-coral opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-coral" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  typeColor,
                )}
              >
                <TypeIcon className="size-2.5" />
                {typeLabel}
              </span>
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
            <h3 className="mt-1.5 truncate text-sm font-semibold text-white group-hover:text-coral transition-colors">
              {title}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-white/50">
          {description}
        </p>

        {/* Skills */}
        {visibleSkills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/60"
              >
                {skill}
              </span>
            ))}
            {extraSkillCount > 0 && (
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/30">
                +{extraSkillCount}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
          <span className="text-sm font-bold text-coral">
            {priceSol !== null ? `${priceSol} SOL` : "Bidding"}
          </span>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {averageRating.toFixed(1)}
              {totalRatings > 0 && (
                <span className="text-white/25">({totalRatings})</span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="size-3" />
              {completedTasks}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
