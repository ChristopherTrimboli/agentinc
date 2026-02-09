"use client";

import { Wand2 } from "lucide-react";
import {
  RARITIES,
  MBTI_TYPES,
  AgentTraitData,
  type MBTIType,
} from "@/lib/agentTraits";
import { RarityBadge } from "./RarityBadge";
import { PersonalityRadar } from "@/components/ui/PersonalityRadar";

interface AgentPreviewCardProps {
  name: string;
  traits: AgentTraitData;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  creatorAddress: string;
  description?: string;
  tokenSymbol?: string;
  mintedAt?: Date | string;
}

export function AgentPreviewCard({
  name,
  traits,
  imageUrl,
  isGeneratingImage,
  creatorAddress,
  description,
  tokenSymbol,
  mintedAt,
}: AgentPreviewCardProps) {
  const personality = MBTI_TYPES[traits.personality as MBTIType];
  const rarityConfig = RARITIES[traits.rarity];
  const radarScores = traits.personalityScores;

  // Format wallet address: show first 4 and last 4 chars
  const formatAddress = (address: string) => {
    if (!address) return "";
    if (address.length <= 12) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Format mint date
  const formatMintDate = (date?: Date | string) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Outer glow effect */}
      <div
        className="absolute -inset-[1px] rounded-[20px] opacity-75 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${rarityConfig.color}40 0%, ${rarityConfig.color}20 50%, ${rarityConfig.color}40 100%)`,
        }}
      />

      {/* Main card container */}
      <div
        className="relative overflow-hidden rounded-[20px] border-[3px] bg-gradient-to-b from-[#0a0520] via-[#120557] to-[#0a0520]"
        style={{
          borderColor: rarityConfig.color,
          boxShadow: `0 0 60px ${rarityConfig.color}30, inset 0 1px 0 ${rarityConfig.color}20`,
        }}
      >
        {/* Animated background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, ${rarityConfig.color} 0, ${rarityConfig.color} 1px, transparent 1px, transparent 10px)`,
          }}
        />

        {/* Top shine effect */}
        <div
          className="absolute top-0 left-0 right-0 h-32 opacity-30"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${rarityConfig.color}40 0%, transparent 70%)`,
          }}
        />

        {/* Card header with name */}
        <div className="relative px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Left side: Name (Pokemon style) */}
            <div className="flex-1">
              <h2
                className="text-2xl font-black tracking-tight leading-tight drop-shadow-lg"
                style={{
                  color: "#ffffff",
                  fontWeight: 950,
                  textShadow: `0 0 20px ${rarityConfig.color}80, 0 2px 8px ${rarityConfig.color}60, 0 0 1px #ffffff`,
                  WebkitTextStroke: "0.5px rgba(255, 255, 255, 0.3)",
                }}
              >
                {name}
              </h2>
            </div>

            {/* Right side: Rarity */}
            <div className="flex flex-col items-end">
              <RarityBadge rarity={traits.rarity} />
            </div>
          </div>
        </div>

        {/* Image container */}
        <div className="relative px-5 pb-3">
          <div
            className="relative w-full aspect-square rounded-xl overflow-hidden border-2 shadow-2xl"
            style={{
              borderColor: `${rarityConfig.color}60`,
              boxShadow: `0 8px 32px ${rarityConfig.color}25, inset 0 1px 0 ${rarityConfig.color}20`,
            }}
          >
            {/* Inner gradient frame */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, ${rarityConfig.color}08 0%, transparent 20%, transparent 80%, ${rarityConfig.color}08 100%)`,
              }}
            />

            {isGeneratingImage ? (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${rarityConfig.color}10 0%, transparent 50%, ${rarityConfig.color}10 100%)`,
                }}
              >
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-full border-[3px] border-t-transparent animate-spin"
                    style={{ borderColor: rarityConfig.color }}
                  />
                  <Wand2
                    className="absolute inset-0 m-auto w-7 h-7"
                    style={{ color: rarityConfig.color }}
                  />
                </div>
                <p
                  className="mt-4 text-xs font-semibold animate-pulse"
                  style={{ color: `${rarityConfig.color}cc` }}
                >
                  Generating AI image...
                </p>
              </div>
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${rarityConfig.color}10 0%, transparent 50%, ${rarityConfig.color}10 100%)`,
                }}
              >
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl shadow-lg"
                  style={{
                    backgroundColor: `${personality?.color}25`,
                    border: `2px solid ${personality?.color}40`,
                  }}
                >
                  {personality?.icon}
                </div>
                <p
                  className="mt-3 text-xs font-medium"
                  style={{ color: `${rarityConfig.color}80` }}
                >
                  No image yet
                </p>
              </div>
            )}
          </div>

          {/* Description under image */}
          {description && (
            <div className="mt-3">
              <p
                className="text-xs leading-relaxed text-center px-2"
                style={{ color: "#ffffffcc" }}
              >
                {description}
              </p>
            </div>
          )}
        </div>

        {/* Stats section - 50/50 split */}
        {radarScores && (
          <div className="relative px-5 pb-5">
            {/* Divider line */}
            <div
              className="h-[2px] mb-4 rounded-full"
              style={{
                background: `linear-gradient(to right, transparent, ${rarityConfig.color}40, transparent)`,
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Left: Creator info and token */}
              <div className="flex flex-col justify-start gap-2.5">
                {/* Creator chip */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-white/50 px-0.5">
                    Creator
                  </span>
                  <div
                    className="px-3 py-2 rounded-lg text-[12px] font-mono font-medium backdrop-blur-sm"
                    style={{
                      color: "#ffffff",
                      backgroundColor: `${rarityConfig.color}15`,
                      border: `1.5px solid ${rarityConfig.color}50`,
                      boxShadow: `0 2px 8px ${rarityConfig.color}20`,
                    }}
                  >
                    {formatAddress(creatorAddress)}
                  </div>
                </div>

                {/* Token chip */}
                {tokenSymbol && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-white/50 px-0.5">
                      Token
                    </span>
                    <div
                      className="px-3 py-2 rounded-lg text-[12px] font-mono font-semibold backdrop-blur-sm"
                      style={{
                        color: "#ffffff",
                        backgroundColor: `${rarityConfig.color}15`,
                        border: `1.5px solid ${rarityConfig.color}50`,
                        boxShadow: `0 2px 8px ${rarityConfig.color}20`,
                      }}
                    >
                      ${tokenSymbol.toUpperCase()}
                    </div>
                  </div>
                )}

                {/* Mint date chip */}
                {formatMintDate(mintedAt) && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-white/50 px-0.5">
                      Minted
                    </span>
                    <div
                      className="px-3 py-2 rounded-lg text-[12px] font-medium backdrop-blur-sm"
                      style={{
                        color: "#ffffff",
                        backgroundColor: `${rarityConfig.color}15`,
                        border: `1.5px solid ${rarityConfig.color}50`,
                        boxShadow: `0 2px 8px ${rarityConfig.color}20`,
                      }}
                    >
                      {formatMintDate(mintedAt)}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Radar chart */}
              <div className="flex items-center justify-center w-full">
                <PersonalityRadar scores={radarScores} variant="compact" />
              </div>
            </div>
          </div>
        )}

        {/* Bottom decorative edge */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 opacity-50"
          style={{
            background: `linear-gradient(to right, transparent, ${rarityConfig.color}, transparent)`,
          }}
        />
      </div>
    </div>
  );
}
