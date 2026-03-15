"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Bot, Building2, Users, Briefcase } from "lucide-react";

import { cn } from "@/lib/utils";

const RARITY_BORDER: Record<string, string> = {
  common: "border-gray-500",
  uncommon: "border-green-500",
  rare: "border-blue-500",
  epic: "border-purple-500",
  legendary: "border-yellow-500",
};

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
}

const TYPE_CONFIG = {
  agent: { label: "Agent", icon: Bot },
  human: { label: "Human", icon: Users },
  corporation: { label: "Corporation", icon: Building2 },
} as const;

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
  } = props;

  const avatarSrc = getAvatarSrc(props);
  const { label: typeLabel, icon: TypeIcon } = TYPE_CONFIG[type];
  const rarity = agent?.rarity?.toLowerCase() ?? null;
  const visibleSkills = skills.slice(0, 3);
  const extraSkillCount = skills.length - 3;

  return (
    <Link
      href={`/marketplace/${id}`}
      className="group block rounded-2xl border border-white/10 bg-[#0a0520]/80 p-4 transition-all hover:border-white/20 hover:scale-[1.02]"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt={title}
              width={48}
              height={48}
              className={cn(
                "size-12 rounded-full object-cover border-2",
                rarity
                  ? (RARITY_BORDER[rarity] ?? "border-white/20")
                  : "border-white/20",
              )}
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full border-2 border-white/20 bg-white/5">
              <TypeIcon className="size-5 text-white/60" />
            </div>
          )}
          {isAvailable && (
            <span className="absolute -right-0.5 -top-0.5 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#6FEC06] opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-[#6FEC06]" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
              <TypeIcon className="size-3" />
              {typeLabel}
            </span>
            {rarity && (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs capitalize text-white/70",
                  RARITY_BORDER[rarity] ?? "border-white/20",
                )}
              >
                {rarity}
              </span>
            )}
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold text-white">
            {title}
          </h3>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 line-clamp-2 text-sm text-white/60">{description}</p>

      {/* Skills */}
      {visibleSkills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/70"
            >
              {skill}
            </span>
          ))}
          {extraSkillCount > 0 && (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/40">
              +{extraSkillCount} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-white/50">
        <span className="font-bold text-[#6FEC06]">
          {priceSol !== null ? `${priceSol} SOL` : "Bidding"}
        </span>
        <span className="flex items-center gap-1">
          <Star className="size-3 fill-yellow-500 text-yellow-500" />
          {averageRating.toFixed(1)}
          <span className="text-white/30">({totalRatings})</span>
        </span>
        <span className="flex items-center gap-1">
          <Briefcase className="size-3" />
          {completedTasks}
        </span>
      </div>
    </Link>
  );
}
