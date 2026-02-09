"use client";

import { useRef } from "react";
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
  Upload,
  Sparkles,
  PenLine,
} from "lucide-react";
import { LEGACY_TO_SCORES } from "@/lib/agentTraits";
import {
  PersonalityRadar,
  PersonalityBadge,
} from "@/components/ui/PersonalityRadar";
import { APP_BASE_URL, MINT_TX_FEE_ESTIMATE } from "@/lib/constants/mint";
import { UseMintAgentReturn } from "@/lib/hooks/useMintAgent";
import { EXTERNAL_APIS } from "@/lib/constants/urls";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    canProceedToStep1,
    canProceedToStep2,
    canLaunch,
    imageMode,
    customImagePrompt,
    isUploadingImage,
    setCurrentStep,
    setAgentName,
    setTokenSymbol,
    setDescription,
    setInitialBuyAmount,
    setTwitterHandle,
    setLaunchError,
    setImageMode,
    setCustomImagePrompt,
    randomizeAgent,
    toggleLock,
    generateImage,
    uploadImage,
    handleLaunch,
    resetMint,
    fetchBalance,
  } = mint;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2 tracking-tight font-display">
          Mint Your <span className="gradient-text-shimmer">AI Agent</span>
        </h1>
        <p className="text-white/50 text-xs sm:text-sm md:text-base mb-3 sm:mb-4 max-w-2xl mx-auto px-2">
          Randomize personality, generate a unique AI image, and launch your
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
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* Left: Agent preview */}
        <div className="lg:sticky lg:top-20 order-2 lg:order-1">
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
        <div className="space-y-3 sm:space-y-4 order-1 lg:order-2">
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
                      <h2 className="font-semibold text-sm">
                        Randomize Personality
                      </h2>
                      <p className="text-[10px] text-white/40">
                        Roll for unique personality
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
                  {/* Personality — Radar Chart + MBTI */}
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
                    <div
                      className={`rounded-lg border border-white/10 bg-[#120557]/30 p-2 ${isRandomizing && !lockedTraits.has("personality") ? "opacity-50 blur-sm" : ""}`}
                    >
                      {(() => {
                        const radarScores =
                          agentTraits.personalityScores ??
                          LEGACY_TO_SCORES[agentTraits.personality] ??
                          null;
                        return radarScores ? (
                          <PersonalityRadar
                            scores={radarScores}
                            size="sm"
                            showMBTI
                            showValues
                          />
                        ) : (
                          <PersonalityBadge
                            personality={agentTraits.personality}
                          />
                        );
                      })()}
                    </div>
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
                    <ImageIcon className="w-4 h-4 text-[#6FEC06]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">Agent Image</h2>
                    <p className="text-[10px] text-white/40">
                      Generate or upload a profile picture
                    </p>
                  </div>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setImageMode("generate")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      imageMode === "generate"
                        ? "bg-[#6FEC06]/20 border border-[#6FEC06]/40 text-[#6FEC06]"
                        : "bg-[#120557]/30 border border-white/10 text-white/50 hover:text-white/70"
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Generate
                  </button>
                  <button
                    onClick={() => setImageMode("upload")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      imageMode === "upload"
                        ? "bg-[#6FEC06]/20 border border-[#6FEC06]/40 text-[#6FEC06]"
                        : "bg-[#120557]/30 border border-white/10 text-white/50 hover:text-white/70"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                </div>

                {/* Generate Mode */}
                {imageMode === "generate" && (
                  <div className="space-y-4">
                    {/* Custom Prompt Toggle */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase tracking-wider text-white/40 font-semibold flex items-center gap-1">
                          <PenLine className="w-3 h-3" />
                          Custom Prompt
                          <span className="text-white/20">(optional)</span>
                        </label>
                        {customImagePrompt && (
                          <button
                            onClick={() => setCustomImagePrompt("")}
                            className="text-[10px] text-white/40 hover:text-white/60"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <textarea
                        value={customImagePrompt}
                        onChange={(e) => setCustomImagePrompt(e.target.value)}
                        className="w-full px-3 py-2 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg text-white text-xs placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50 resize-none"
                        placeholder="Leave empty to auto-generate from traits, or enter your own prompt..."
                        rows={3}
                        maxLength={500}
                      />
                      {!customImagePrompt && (
                        <p className="text-[10px] text-white/30 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Auto-prompt from personality, rarity & abilities
                        </p>
                      )}
                    </div>

                    {/* Image Preview / Generate Button */}
                    <div className="text-center py-2">
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
                                <p className="text-xs text-white/50">
                                  Generating...
                                </p>
                              </div>
                            ) : (
                              <Wand2 className="w-12 h-12 text-white/20" />
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
                            {customImagePrompt
                              ? "Generate from Prompt"
                              : "Generate AI Image"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Upload Mode */}
                {imageMode === "upload" && (
                  <div className="text-center py-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
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
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="flex items-center gap-1.5 px-3 py-1.5 mx-auto bg-[#120557]/50 hover:bg-[#120557]/70 border border-[#6FEC06]/20 rounded-lg text-xs font-medium"
                        >
                          {isUploadingImage ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Change Image
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="w-40 h-40 mx-auto rounded-xl bg-[#120557]/50 border-2 border-dashed border-[#6FEC06]/30 flex flex-col items-center justify-center cursor-pointer hover:bg-[#120557]/70 hover:border-[#6FEC06]/50 transition-all"
                        >
                          {isUploadingImage ? (
                            <div className="text-center">
                              <Loader2 className="w-10 h-10 text-[#6FEC06] animate-spin mx-auto mb-2" />
                              <p className="text-xs text-white/50">
                                Uploading...
                              </p>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-10 h-10 text-white/30 mb-2" />
                              <p className="text-xs text-white/50">
                                Click to upload
                              </p>
                              <p className="text-[10px] text-white/30 mt-1">
                                PNG, JPG, WebP, GIF
                              </p>
                              <p className="text-[10px] text-white/30">
                                Max 5MB
                              </p>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
                    <p className="text-[10px] text-white/40">
                      Set up token details
                    </p>
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
                          setTokenSymbol(
                            e.target.value.toUpperCase().slice(0, 10),
                          )
                        }
                        className="w-full pl-7 pr-3 py-2 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg text-white text-sm font-mono uppercase placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50"
                        placeholder="AGENT"
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-semibold">
                      Description{" "}
                      <span className="text-white/20">(optional)</span>
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
                      Social Links{" "}
                      <span className="text-white/20">(optional)</span>
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
                              e.target.value
                                .replace(/^@/, "")
                                .replace(/\s/g, ""),
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
                      {walletBalance !== null &&
                        walletBalance < requiredBalance && (
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
                    href={EXTERNAL_APIS.bagsFm}
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
