"use client";

import { Wand2 } from "lucide-react";
import {
  RARITIES,
  getPersonalityById,
  getTraitById,
  getSkillById,
  getToolById,
  getSpecialAbilityById,
  AgentTraitData,
} from "@/lib/agentTraits";
import { TraitPill } from "./TraitPill";
import { RarityBadge } from "./RarityBadge";

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
  const specialAbility = getSpecialAbilityById(traits.specialAbility);
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
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${personality?.color}20` }}
          >
            <span className="text-base">{personality?.icon}</span>
            <span
              className="text-xs font-semibold"
              style={{ color: personality?.color }}
            >
              {personality?.name}
            </span>
          </div>
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
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full border backdrop-blur-sm"
            style={{
              backgroundColor: `${rarityConfig.color}20`,
              borderColor: `${rarityConfig.color}50`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{specialAbility?.icon}</span>
              <span
                className="text-xs font-bold"
                style={{ color: rarityConfig.color }}
              >
                {specialAbility?.name}
              </span>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-4 mt-2">{name}</h2>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-semibold">
              Traits
            </p>
            <div className="flex flex-wrap gap-1.5">
              {traits.traits.map((id) => {
                const t = getTraitById(id);
                return t ? (
                  <TraitPill key={id} icon={t.icon} name={t.name} />
                ) : null;
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-semibold">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {traits.skills.map((id) => {
                const s = getSkillById(id);
                return s ? (
                  <TraitPill key={id} icon={s.icon} name={s.name} />
                ) : null;
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-semibold">
              Tools
            </p>
            <div className="flex flex-wrap gap-1.5">
              {traits.tools.map((id) => {
                const t = getToolById(id);
                return t ? (
                  <TraitPill key={id} icon={t.icon} name={t.name} />
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
