"use client";

import {
  Shuffle,
  Wand2,
  Coins,
  Rocket,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Lock,
  Unlock,
  RefreshCw,
  Image as ImageIcon,
  Wallet,
  Globe,
  Twitter,
} from "lucide-react";
import {
  RARITIES,
  getPersonalityById,
  getTraitById,
  getSkillById,
  getToolById,
  getSpecialAbilityById,
} from "@/lib/agentTraits";
import { APP_BASE_URL, MINT_TX_FEE_ESTIMATE } from "@/lib/constants/mint";
import { UseMintAgentReturn } from "@/lib/hooks/useMintAgent";
import { TraitPill } from "./TraitPill";
import { RarityBadge } from "./RarityBadge";
import { AgentPreviewCard } from "./AgentPreviewCard";
import { StepIndicator } from "./StepIndicator";
import { LaunchModal } from "./LaunchModal";
import { MintSuccessScreen } from "./MintSuccessScreen";

interface MintWizardProps {
  mint: UseMintAgentReturn;
  chatPath?: string; // Optional custom chat path for success screen
}

export function MintWizard({ mint, chatPath }: MintWizardProps) {
  const {
    currentStep,
    agentName,
    agentTraits,
    imageUrl,
    lockedTraits,
    tokenSymbol,
    description,
    initialBuyAmount,
    twitterHandle,
    agentId,
    isRandomizing,
    isGeneratingImage,
    isLaunching,
    isLoadingBalance,
    launchError,
    launchSteps,
    launchResult,
    walletBalance,
    walletAddress,
    requiredBalance,
    hasEnoughBalance,
    canProceedToStep1,
    canProceedToStep2,
    canLaunch,
    setCurrentStep,
    setAgentName,
    setTokenSymbol,
    setDescription,
    setInitialBuyAmount,
    setTwitterHandle,
    setLaunchError,
    randomizeAgent,
    toggleLock,
    generateImage,
    handleLaunch,
    resetMint,
    fetchBalance,
  } = mint;

  // Success screen
  if (launchResult && agentTraits) {
    return (
      <MintSuccessScreen
        launchResult={launchResult}
        agentName={agentName}
        agentTraits={agentTraits}
        tokenSymbol={tokenSymbol}
        imageUrl={imageUrl}
        onMintAnother={resetMint}
        chatPath={chatPath}
      />
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight font-display">
          Mint Your <span className="gradient-text-shimmer">AI Agent</span>
        </h1>
        <p className="text-white/50 text-sm md:text-base mb-4 max-w-2xl mx-auto">
          Randomize traits, generate a unique AI image, and launch your
          agent&apos;s token on Solana
        </p>
        <StepIndicator currentStep={currentStep} />
      </div>

      {/* Error */}
      {launchError && (
        <div className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3 backdrop-blur-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{launchError}</span>
          <button
            onClick={() => setLaunchError("")}
            className="ml-auto text-red-400/60 hover:text-red-400"
          >
            ×
          </button>
        </div>
      )}

      {/* Launch modal */}
      <LaunchModal isLaunching={isLaunching} launchSteps={launchSteps} />

      {/* Main content grid */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Left: Agent preview */}
        <div className="lg:sticky lg:top-20">
          {agentTraits && (
            <AgentPreviewCard
              name={agentName}
              traits={agentTraits}
              imageUrl={imageUrl}
              isGeneratingImage={isGeneratingImage}
            />
          )}
        </div>

        {/* Right: Step content */}
        <div className="space-y-4">
          {/* Step 0: Randomize */}
          {currentStep === 0 && agentTraits && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#0a0520]/50 border border-white/10 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#6FEC06]/20 flex items-center justify-center border border-[#6FEC06]/30">
                      <Shuffle className="w-4 h-4 text-[#6FEC06]" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm">Randomize Traits</h2>
                      <p className="text-[10px] text-white/40">
                        Roll for unique attributes
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={randomizeAgent}
                    disabled={isRandomizing}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-lg text-black text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50 shadow-lg shadow-[#6FEC06]/20"
                  >
                    {isRandomizing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Shuffle className="w-3.5 h-3.5" />
                    )}
                    Randomize
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                      Agent Name
                    </label>
                    <button
                      onClick={() => toggleLock("name")}
                      className={`p-0.5 rounded ${lockedTraits.has("name") ? "text-amber-400" : "text-white/30 hover:text-white/50"}`}
                    >
                      {lockedTraits.has("name") ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => {
                      setAgentName(e.target.value);
                      setTokenSymbol("");
                    }}
                    className="w-full px-3 py-2 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg text-white font-semibold placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50"
                    placeholder="Enter agent name"
                  />
                </div>

                <div className="space-y-3">
                  {/* Personality */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                        Personality
                      </span>
                      <button
                        onClick={() => toggleLock("personality")}
                        className={`p-0.5 rounded ${lockedTraits.has("personality") ? "text-amber-400" : "text-white/30 hover:text-white/50"}`}
                      >
                        {lockedTraits.has("personality") ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    {(() => {
                      const p = getPersonalityById(agentTraits.personality);
                      return p ? (
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isRandomizing && !lockedTraits.has("personality") ? "opacity-50 blur-sm" : ""}`}
                          style={{
                            backgroundColor: `${p.color}15`,
                            borderColor: `${p.color}40`,
                          }}
                        >
                          <span className="text-xl">{p.icon}</span>
                          <div>
                            <p
                              className="font-semibold text-sm"
                              style={{ color: p.color }}
                            >
                              {p.name}
                            </p>
                            <p className="text-[10px] text-white/50">
                              {p.description}
                            </p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Traits */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                        Traits ({agentTraits.traits.length})
                      </span>
                      <button
                        onClick={() => toggleLock("traits")}
                        className={`p-0.5 rounded ${lockedTraits.has("traits") ? "text-amber-400" : "text-white/30 hover:text-white/50"}`}
                      >
                        {lockedTraits.has("traits") ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div
                      className={`flex flex-wrap gap-1.5 ${isRandomizing && !lockedTraits.has("traits") ? "opacity-50 blur-sm" : ""}`}
                    >
                      {agentTraits.traits.map((id) => {
                        const t = getTraitById(id);
                        return t ? (
                          <TraitPill key={id} icon={t.icon} name={t.name} />
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                        Skills ({agentTraits.skills.length})
                      </span>
                      <button
                        onClick={() => toggleLock("skills")}
                        className={`p-0.5 rounded ${lockedTraits.has("skills") ? "text-amber-400" : "text-white/30 hover:text-white/50"}`}
                      >
                        {lockedTraits.has("skills") ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div
                      className={`flex flex-wrap gap-1.5 ${isRandomizing && !lockedTraits.has("skills") ? "opacity-50 blur-sm" : ""}`}
                    >
                      {agentTraits.skills.map((id) => {
                        const s = getSkillById(id);
                        return s ? (
                          <TraitPill key={id} icon={s.icon} name={s.name} />
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Tools */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                        Tools ({agentTraits.tools.length})
                      </span>
                      <button
                        onClick={() => toggleLock("tools")}
                        className={`p-0.5 rounded ${lockedTraits.has("tools") ? "text-amber-400" : "text-white/30 hover:text-white/50"}`}
                      >
                        {lockedTraits.has("tools") ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div
                      className={`flex flex-wrap gap-1.5 ${isRandomizing && !lockedTraits.has("tools") ? "opacity-50 blur-sm" : ""}`}
                    >
                      {agentTraits.tools.map((id) => {
                        const t = getToolById(id);
                        return t ? (
                          <TraitPill key={id} icon={t.icon} name={t.name} />
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Special Ability */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                        Special Ability
                      </span>
                      <button
                        onClick={() => toggleLock("specialAbility")}
                        className={`p-0.5 rounded ${lockedTraits.has("specialAbility") ? "text-amber-400" : "text-white/30 hover:text-white/50"}`}
                      >
                        {lockedTraits.has("specialAbility") ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    {(() => {
                      const a = getSpecialAbilityById(agentTraits.specialAbility);
                      const rarity = RARITIES[agentTraits.rarity];
                      return a ? (
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isRandomizing && !lockedTraits.has("specialAbility") ? "opacity-50 blur-sm" : ""}`}
                          style={{
                            backgroundColor: `${rarity.color}10`,
                            borderColor: `${rarity.color}30`,
                          }}
                        >
                          <span className="text-xl">{a.icon}</span>
                          <div>
                            <p
                              className="font-semibold text-sm"
                              style={{ color: rarity.color }}
                            >
                              {a.name}
                            </p>
                            <p className="text-[10px] text-white/50">
                              {a.description}
                            </p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep(1)}
                  disabled={!canProceedToStep1}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-lg text-black text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 shadow-lg shadow-[#6FEC06]/20"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Generate Image */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#0a0520]/50 border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#6FEC06]/20 flex items-center justify-center border border-[#6FEC06]/30">
                    <Wand2 className="w-4 h-4 text-[#6FEC06]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">Generate AI Image</h2>
                    <p className="text-[10px] text-white/40">
                      Create a unique profile picture
                    </p>
                  </div>
                </div>

                <div className="text-center py-4">
                  {imageUrl ? (
                    <div className="space-y-3">
                      <div className="relative w-40 h-40 mx-auto rounded-xl overflow-hidden border-2 border-[#6FEC06]/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={agentName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={generateImage}
                        disabled={isGeneratingImage}
                        className="flex items-center gap-1.5 px-3 py-1.5 mx-auto bg-[#120557]/50 hover:bg-[#120557]/70 border border-[#6FEC06]/20 rounded-lg text-xs font-medium"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isGeneratingImage ? "animate-spin" : ""}`}
                        />
                        Regenerate
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-40 h-40 mx-auto rounded-xl bg-[#120557]/50 border border-[#6FEC06]/20 flex items-center justify-center">
                        {isGeneratingImage ? (
                          <div className="text-center">
                            <Loader2 className="w-10 h-10 text-[#6FEC06] animate-spin mx-auto mb-2" />
                            <p className="text-xs text-white/50">Generating...</p>
                          </div>
                        ) : (
                          <ImageIcon className="w-12 h-12 text-white/20" />
                        )}
                      </div>
                      <button
                        onClick={generateImage}
                        disabled={isGeneratingImage}
                        className="flex items-center gap-2 px-5 py-2.5 mx-auto bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-lg text-black text-sm font-semibold disabled:opacity-50 hover:opacity-90 shadow-lg shadow-[#6FEC06]/20"
                      >
                        {isGeneratingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4" />
                        )}
                        Generate AI Image
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#120557]/50 hover:bg-[#120557]/70 border border-white/10 rounded-lg text-xs font-medium"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToStep2}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-lg text-black text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 shadow-lg shadow-[#6FEC06]/20"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Configure Token */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#0a0520]/50 border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#6FEC06]/20 flex items-center justify-center border border-[#6FEC06]/30">
                    <Coins className="w-4 h-4 text-[#6FEC06]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">Configure Token</h2>
                    <p className="text-[10px] text-white/40">Set up token details</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-semibold">
                      Token Symbol <span className="text-[#6FEC06]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-medium text-sm">
                        $
                      </span>
                      <input
                        type="text"
                        value={tokenSymbol}
                        onChange={(e) =>
                          setTokenSymbol(e.target.value.toUpperCase().slice(0, 10))
                        }
                        className="w-full pl-7 pr-3 py-2 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg text-white text-sm font-mono uppercase placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50"
                        placeholder="AGENT"
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-semibold">
                      Description <span className="text-white/20">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50 resize-none"
                      placeholder="Describe your agent..."
                      rows={2}
                      maxLength={1000}
                    />
                  </div>

                  {/* Social Links Section */}
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-3 font-semibold">
                      Social Links <span className="text-white/20">(optional)</span>
                    </p>

                    {/* Website - Auto-generated */}
                    <div className="mb-3">
                      <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1.5 font-semibold flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Website
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#120557]/30 border border-white/10 rounded-lg">
                        <span className="text-xs text-white/50 font-mono truncate">
                          {APP_BASE_URL}/agent/{agentId.slice(0, 8)}...
                        </span>
                        <span className="text-[10px] text-[#6FEC06] ml-auto">
                          Auto-set
                        </span>
                      </div>
                    </div>

                    {/* Twitter/X Handle */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1.5 font-semibold flex items-center gap-1">
                        <Twitter className="w-3 h-3" />
                        Twitter/X
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                          @
                        </span>
                        <input
                          type="text"
                          value={twitterHandle}
                          onChange={(e) =>
                            setTwitterHandle(
                              e.target.value.replace(/^@/, "").replace(/\s/g, "")
                            )
                          }
                          className="w-full pl-7 pr-3 py-2 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50"
                          placeholder="username"
                          maxLength={15}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-semibold">
                      Initial Buy Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={initialBuyAmount}
                        onChange={(e) => setInitialBuyAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50"
                        placeholder="0.01"
                        min="0"
                        step="0.01"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs font-medium">
                        SOL
                      </span>
                    </div>
                  </div>
                  {walletAddress && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                          Launch Wallet
                        </label>
                        <button
                          onClick={fetchBalance}
                          disabled={isLoadingBalance}
                          className="text-[10px] text-[#6FEC06] hover:text-[#9FF24A] flex items-center gap-1"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${isLoadingBalance ? "animate-spin" : ""}`}
                          />
                          Refresh
                        </button>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-white/40" />
                          <span className="font-mono text-xs text-white/60">
                            {walletAddress.slice(0, 6)}...
                            {walletAddress.slice(-6)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isLoadingBalance ? (
                            <Loader2 className="w-3 h-3 animate-spin text-white/40" />
                          ) : walletBalance !== null ? (
                            <span
                              className={`text-xs font-semibold ${walletBalance >= requiredBalance ? "text-[#6FEC06]" : "text-red-400"}`}
                            >
                              {walletBalance.toFixed(4)} SOL
                            </span>
                          ) : (
                            <span className="text-xs text-white/40">--</span>
                          )}
                        </div>
                      </div>
                      {walletBalance !== null && walletBalance < requiredBalance && (
                        <p className="mt-1.5 text-[10px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Need at least {requiredBalance.toFixed(4)} SOL (
                          {(parseFloat(initialBuyAmount) || 0).toFixed(2)} + ~
                          {MINT_TX_FEE_ESTIMATE} fees)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#120557]/50 hover:bg-[#120557]/70 border border-white/10 rounded-lg text-xs font-medium"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!tokenSymbol.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-lg text-black text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 shadow-lg shadow-[#6FEC06]/20"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Launch */}
          {currentStep === 3 && agentTraits && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#0a0520]/50 border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#6FEC06]/20 flex items-center justify-center border border-[#6FEC06]/30">
                    <Rocket className="w-4 h-4 text-[#6FEC06]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">Launch Agent</h2>
                    <p className="text-[10px] text-white/40">
                      Review and mint on Solana
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/50 text-xs">Agent Name</span>
                    <span className="font-semibold text-sm">{agentName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/50 text-xs">Token Symbol</span>
                    <span className="font-mono font-semibold text-sm text-[#6FEC06]">
                      ${tokenSymbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/50 text-xs">Rarity</span>
                    <RarityBadge rarity={agentTraits.rarity} />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/50 text-xs">Initial Buy</span>
                    <span className="font-semibold text-sm">
                      {parseFloat(initialBuyAmount) > 0
                        ? `${initialBuyAmount} SOL`
                        : "None"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-white/50 text-xs">Network</span>
                    <span className="flex items-center gap-1.5 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6FEC06] animate-pulse" />
                      Solana Mainnet
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLaunch}
                  disabled={!canLaunch || isLaunching}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-lg text-black font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 shadow-lg shadow-[#6FEC06]/25"
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Minting...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Mint Agent on Solana
                    </>
                  )}
                </button>
                <p className="text-[10px] text-white/40 text-center mt-3">
                  Token launched on{" "}
                  <a
                    href="https://bags.fm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6FEC06] hover:underline"
                  >
                    Bags.fm
                  </a>
                </p>
              </div>

              <div className="flex justify-start">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#120557]/50 hover:bg-[#120557]/70 border border-white/10 rounded-lg text-xs font-medium"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
