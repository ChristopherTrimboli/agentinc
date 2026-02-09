"use client";

import { Wand2 } from "lucide-react";
import {
  RARITIES,
  LEGACY_TO_SCORES,
  getPersonalityById,
  AgentTraitData,
} from "@/lib/agentTraits";
import { RarityBadge } from "./RarityBadge";
import {
  PersonalityRadar,
  PersonalityBadge,
} from "@/components/ui/PersonalityRadar";

interface AgentPreviewCardProps {
  name: string;
  traits: AgentTraitData;
  imageUrl?: string;
  isGeneratingImage?: boolean;
}

export function AgentPreviewCard({
  name,
  traits,
  imageUrl,
  isGeneratingImage,
}: AgentPreviewCardProps) {
  const personality = getPersonalityById(traits.personality);
  const rarityConfig = RARITIES[traits.rarity];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2"
      style={{
        borderColor: `${rarityConfig.color}50`,
        boxShadow: `0 0 40px ${rarityConfig.color}15`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at top, ${rarityConfig.color}15 0%, transparent 50%)`,
        }}
      />
      <div className="relative p-4 bg-[#0a0520]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <RarityBadge rarity={traits.rarity} />
          <PersonalityBadge
            personality={traits.personality}
            scores={traits.personalityScores}
          />
        </div>

        <div className="relative mb-4">
          <div
            className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border"
            style={{ borderColor: `${rarityConfig.color}30` }}
          >
            {isGeneratingImage ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#120557]/50 to-[#000028]">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-[#6FEC06]/30 border-t-[#6FEC06] animate-spin" />
                  <Wand2 className="absolute inset-0 m-auto w-6 h-6 text-[#6FEC06]" />
                </div>
                <p className="mt-3 text-xs text-white/50 animate-pulse">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#120557]/50 to-[#000028]">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl mb-2"
                  style={{ backgroundColor: `${personality?.color}20` }}
                >
                  {personality?.icon}
                </div>
                <p className="text-xs text-white/40">No image yet</p>
              </div>
            )}
          </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-4 mt-2">{name}</h2>

        {/* Personality Radar Chart */}
        {(() => {
          const radarScores =
            traits.personalityScores ??
            LEGACY_TO_SCORES[traits.personality] ??
            null;
          if (!radarScores) return null;
          return (
            <div className="mb-4">
              <PersonalityRadar
                scores={radarScores}
                size="sm"
                showMBTI
                showValues
              />
            </div>
          );
        })()}
      </div>
    </div>
  );
}
