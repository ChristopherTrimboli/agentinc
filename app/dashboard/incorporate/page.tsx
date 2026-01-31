"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";
import { useWallets, useSignTransaction } from "@privy-io/react-auth/solana";
import {
  Building2,
  Rocket,
  Users,
  Check,
  ImageIcon,
  Loader2,
  ExternalLink,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Zap,
  Brain,
  Shield,
  TrendingUp,
  Star,
  Globe,
  Twitter,
  MessageCircle,
  Coins,
} from "lucide-react";

interface SwarmAgent {
  id: string;
  name: string;
  description: string | null;
  capabilities: string[];
  color: string | null;
  corporation: {
    id: string;
    name: string;
  } | null;
}

interface LaunchStep {
  id: string;
  label: string;
  status: "pending" | "loading" | "complete" | "error";
  error?: string;
}

const capabilityIcons: Record<string, React.ReactNode> = {
  coding: <Zap className="w-3 h-3" />,
  analysis: <Brain className="w-3 h-3" />,
  security: <Shield className="w-3 h-3" />,
  trading: <TrendingUp className="w-3 h-3" />,
  research: <Globe className="w-3 h-3" />,
  default: <Star className="w-3 h-3" />,
};

const getCapabilityIcon = (capability: string) => {
  const key = capability.toLowerCase();
  for (const [k, icon] of Object.entries(capabilityIcons)) {
    if (key.includes(k)) return icon;
  }
  return capabilityIcons.default;
};

const agentAvatars = [
  "🤖", "🦾", "🧠", "⚡", "🔮", "🎯", "🚀", "💎", "🌟", "🔥",
  "👾", "🦿", "🎭", "🌀", "💫", "🛸", "🔷", "🎪", "🌈", "⭐",
];

const agentPatterns = [
  "radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.4) 0%, transparent 50%)",
  "radial-gradient(circle at 70% 70%, rgba(6, 182, 212, 0.4) 0%, transparent 50%)",
  "radial-gradient(ellipse at top, rgba(236, 72, 153, 0.3) 0%, transparent 60%)",
  "radial-gradient(ellipse at bottom, rgba(34, 211, 238, 0.3) 0%, transparent 60%)",
  "conic-gradient(from 180deg, rgba(168, 85, 247, 0.2), transparent, rgba(6, 182, 212, 0.2))",
  "linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, transparent 50%)",
  "radial-gradient(circle at 20% 80%, rgba(74, 222, 128, 0.3) 0%, transparent 50%)",
  "radial-gradient(circle at 80% 20%, rgba(251, 191, 36, 0.3) 0%, transparent 50%)",
];

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const getAgentAvatar = (agentId: string, agentName: string): string => {
  const hash = hashString(agentId + agentName);
  return agentAvatars[hash % agentAvatars.length];
};

const getAgentPattern = (agentId: string): string => {
  const hash = hashString(agentId);
  return agentPatterns[hash % agentPatterns.length];
};

function AgentCard({
  agent,
  isSelected,
  isDisabled,
  selectionOrder,
  onToggle,
}: {
  agent: SwarmAgent;
  isSelected: boolean;
  isDisabled: boolean;
  selectionOrder: number;
  onToggle: () => void;
}) {
  const agentColor = agent.color || "#a855f7";
  const avatar = getAgentAvatar(agent.id, agent.name);
  const pattern = getAgentPattern(agent.id);
  const cardVariant = hashString(agent.id) % 4;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isDisabled}
      className={`group relative w-full h-full text-left transition-all duration-300 ${
        isDisabled && !isSelected ? "opacity-30 cursor-not-allowed" : ""
      }`}
    >
      <div
        className={`absolute -inset-1 rounded-2xl opacity-0 blur-xl transition-all duration-500 ${
          isSelected ? "opacity-50" : "group-hover:opacity-20"
        }`}
        style={{ backgroundColor: agentColor }}
      />

      <div
        className={`relative h-full overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300 ${
          isSelected
            ? "bg-gray-900/95 border-opacity-70 shadow-2xl scale-[1.02]"
            : "bg-gray-900/50 border-gray-800/50 hover:bg-gray-900/70 hover:border-gray-700/60 hover:scale-[1.01]"
        }`}
        style={{
          borderColor: isSelected ? agentColor : undefined,
          boxShadow: isSelected ? `0 0 30px ${agentColor}20, inset 0 1px 0 ${agentColor}20` : undefined,
        }}
      >
        <div 
          className={`absolute inset-0 opacity-30 transition-opacity duration-300 ${isSelected ? "opacity-50" : "group-hover:opacity-40"}`}
          style={{ background: pattern }}
        />

        {isSelected && (
          <div
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg ring-2 ring-gray-900 animate-in zoom-in duration-200"
            style={{ backgroundColor: agentColor, boxShadow: `0 0 12px ${agentColor}60` }}
          >
            {selectionOrder}
          </div>
        )}

        <div className="relative flex items-center gap-4 h-full p-4">
          <div
            className={`relative w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-all duration-300 ${
              isSelected ? "scale-110" : "group-hover:scale-105"
            }`}
            style={{ 
              backgroundColor: `${agentColor}20`,
              boxShadow: isSelected ? `0 0 24px ${agentColor}40` : undefined,
              border: `1px solid ${agentColor}30`,
            }}
          >
            <span className="relative z-10 drop-shadow-lg">{avatar}</span>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-white truncate">{agent.name}</h3>
              {isSelected && (
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${agentColor}30` }}>
                  <Check className="w-2.5 h-2.5" style={{ color: agentColor }} />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {agent.capabilities && agent.capabilities.length > 0 ? (
                <>
                  {agent.capabilities.slice(0, 2).map((cap, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border"
                      style={{
                        backgroundColor: isSelected ? `${agentColor}15` : "rgba(31, 41, 55, 0.8)",
                        borderColor: isSelected ? `${agentColor}30` : "rgba(55, 65, 81, 0.5)",
                        color: isSelected ? agentColor : "rgb(156, 163, 175)",
                      }}
                    >
                      {getCapabilityIcon(cap)}
                      <span className="capitalize">{cap}</span>
                    </span>
                  ))}
                  {agent.capabilities.length > 2 && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium border bg-gray-800/50 border-gray-700/30 text-gray-500">
                      +{agent.capabilities.length - 2}
                    </span>
                  )}
                </>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-800/50 text-gray-500">
                  AI Agent
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function Stepper({ currentStep, steps }: { currentStep: number; steps: { title: string; icon: React.ReactNode }[] }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isComplete = index < currentStep;
        return (
          <div key={index} className="flex items-center">
            <div
              className={`relative flex items-center gap-2.5 px-4 py-2 rounded-full transition-all duration-300 ${
                isComplete
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : isActive
                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10"
                    : "bg-gray-800/40 text-gray-500 border border-gray-700/50"
              }`}
            >
              {isActive && <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-lg -z-10" />}
              <div className={`w-5 h-5 flex items-center justify-center ${isActive ? "scale-110" : ""}`}>
                {isComplete ? <Check className="w-4 h-4" /> : step.icon}
              </div>
              <span className="text-xs font-semibold tracking-wide">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-12 h-[2px] mx-3 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ${isComplete ? "w-full" : "w-0"}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function IncorporatePage() {
  const router = useRouter();
  const { user } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();

  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [initialBuyAmount, setInitialBuyAmount] = useState("0.01");

  const [agents, setAgents] = useState<SwarmAgent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const [launchSteps, setLaunchSteps] = useState<LaunchStep[]>([]);
  const [launchResult, setLaunchResult] = useState<{
    tokenMint: string;
    signature: string;
    corporationId: string;
  } | null>(null);

  const embeddedWallet = useMemo(() => wallets.find((w) => w.standardWallet?.name === "Privy"), [wallets]);
  const walletAddress = useMemo(() => {
    const solanaWallet = user?.linkedAccounts?.find((account) => account.type === "wallet" && account.chainType === "solana");
    return solanaWallet && "address" in solanaWallet ? solanaWallet.address : null;
  }, [user?.linkedAccounts]);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch("/api/swarm/agents");
        if (!response.ok) throw new Error("Failed to fetch agents");
        const data = await response.json();
        setAgents(data.agents);
      } catch (err) {
        console.error("Failed to load agents:", err);
      } finally {
        setIsLoadingAgents(false);
      }
    }
    fetchAgents();
  }, []);

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) => {
      if (prev.includes(agentId)) return prev.filter((id) => id !== agentId);
      if (prev.length >= 5) return prev;
      return [...prev, agentId];
    });
  };

  const updateStep = (stepId: string, status: LaunchStep["status"], error?: string) => {
    setLaunchSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, status, error } : step)));
  };

  const canProceedToStep2 = selectedAgentIds.length > 0;
  const canLaunch = name.trim() && symbol.trim() && description.trim() && imageUrl.trim() && selectedAgentIds.length > 0;

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaunchError("");
    setLaunchResult(null);

    if (!identityToken || !embeddedWallet || !walletAddress || !canLaunch) {
      setLaunchError("Please fill in all required fields");
      return;
    }

    const initialBuy = parseFloat(initialBuyAmount);
    if (isNaN(initialBuy) || initialBuy < 0) {
      setLaunchError("Invalid initial buy amount");
      return;
    }

    setLaunchSteps([
      { id: "metadata", label: "Creating metadata", status: "pending" },
      { id: "feeShare", label: "Fee config", status: "pending" },
      { id: "sign", label: "Signing", status: "pending" },
      { id: "broadcast", label: "Broadcasting", status: "pending" },
      { id: "save", label: "Saving", status: "pending" },
    ]);

    setIsLaunching(true);

    try {
      updateStep("metadata", "loading");
      const metadataResponse = await fetch("/api/incorporate/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json", "privy-id-token": identityToken },
        body: JSON.stringify({
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          description: description.trim(),
          imageUrl: imageUrl.trim(),
          twitter: twitterUrl.trim() || undefined,
          website: websiteUrl.trim() || undefined,
          telegram: telegramUrl.trim() || undefined,
        }),
      });

      if (!metadataResponse.ok) throw new Error((await metadataResponse.json()).error || "Failed to create metadata");
      const metadataData = await metadataResponse.json();
      updateStep("metadata", "complete");

      updateStep("feeShare", "loading");
      const feeShareResponse = await fetch("/api/incorporate/fee-share", {
        method: "POST",
        headers: { "Content-Type": "application/json", "privy-id-token": identityToken },
        body: JSON.stringify({ wallet: walletAddress, tokenMint: metadataData.tokenMint }),
      });

      if (!feeShareResponse.ok) throw new Error((await feeShareResponse.json()).error || "Failed to create fee config");
      const feeShareData = await feeShareResponse.json();

      if (feeShareData.transactions?.length > 0) {
        for (const txData of feeShareData.transactions) {
          const txBytes = Uint8Array.from(atob(txData.transaction), (c) => c.charCodeAt(0));
          const signResult = await signTransaction({ transaction: txBytes, wallet: embeddedWallet });
          const signedTxBase64 = btoa(String.fromCharCode(...new Uint8Array(signResult.signedTransaction)));
          await fetch("/api/incorporate/send-transaction", {
            method: "POST",
            headers: { "Content-Type": "application/json", "privy-id-token": identityToken },
            body: JSON.stringify({ signedTransaction: signedTxBase64 }),
          });
        }
      }
      updateStep("feeShare", "complete");

      updateStep("sign", "loading");
      const launchTxResponse = await fetch("/api/incorporate/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json", "privy-id-token": identityToken },
        body: JSON.stringify({
          tokenMint: metadataData.tokenMint,
          metadataUrl: metadataData.tokenMetadata,
          wallet: walletAddress,
          initialBuyLamports: Math.floor(initialBuy * 1e9),
          configKey: feeShareData.meteoraConfigKey,
        }),
      });

      if (!launchTxResponse.ok) throw new Error((await launchTxResponse.json()).error || "Failed to create transaction");
      const launchTxData = await launchTxResponse.json();
      const launchTxBytes = Uint8Array.from(atob(launchTxData.transaction), (c) => c.charCodeAt(0));
      const signResult = await signTransaction({ transaction: launchTxBytes, wallet: embeddedWallet });
      const signedLaunchTxBase64 = btoa(String.fromCharCode(...new Uint8Array(signResult.signedTransaction)));
      updateStep("sign", "complete");

      updateStep("broadcast", "loading");
      const broadcastResponse = await fetch("/api/incorporate/send-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json", "privy-id-token": identityToken },
        body: JSON.stringify({ signedTransaction: signedLaunchTxBase64 }),
      });

      if (!broadcastResponse.ok) throw new Error((await broadcastResponse.json()).error || "Failed to broadcast");
      const broadcastData = await broadcastResponse.json();
      updateStep("broadcast", "complete");

      updateStep("save", "loading");
      const saveResponse = await fetch("/api/incorporate/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", "privy-id-token": identityToken },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          tokenMint: metadataData.tokenMint,
          tokenSymbol: symbol.trim().toUpperCase(),
          tokenMetadata: metadataData.tokenMetadata,
          launchWallet: walletAddress,
          launchSignature: broadcastData.signature,
          agentIds: selectedAgentIds,
          logo: imageUrl.trim(),
        }),
      });

      if (!saveResponse.ok) throw new Error((await saveResponse.json()).error || "Failed to save");
      const saveData = await saveResponse.json();
      updateStep("save", "complete");

      setLaunchResult({
        tokenMint: metadataData.tokenMint,
        signature: broadcastData.signature,
        corporationId: saveData.corporation.id,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Launch failed";
      setLaunchError(errorMessage);
      setLaunchSteps((prev) => prev.map((step) => (step.status === "loading" ? { ...step, status: "error", error: errorMessage } : step)));
    } finally {
      setIsLaunching(false);
    }
  };

  // Success screen
  if (launchResult) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center max-w-lg w-full">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/40 to-cyan-500/40 blur-2xl animate-pulse" />
            <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/40 backdrop-blur-sm">
              <Sparkles className="w-12 h-12 text-emerald-400 animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-3">Corporation Launched!</h1>
          <p className="text-gray-400 mb-8">
            <span className="text-white font-semibold">{name}</span> is now live with{" "}
            <span className="text-emerald-400 font-mono font-semibold">${symbol.toUpperCase()}</span>
          </p>

          <div className="bg-gray-900/60 rounded-2xl p-6 mb-8 text-left border border-gray-800/50">
            <div className="mb-5">
              <p className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold mb-2 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" /> Token Mint Address
              </p>
              <p className="font-mono text-sm text-gray-300 bg-gray-800/50 px-4 py-2.5 rounded-xl truncate border border-gray-700/50">
                {launchResult.tokenMint}
              </p>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold mb-2 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Transaction Signature
              </p>
              <p className="font-mono text-sm text-gray-300 bg-gray-800/50 px-4 py-2.5 rounded-xl truncate border border-gray-700/50">
                {launchResult.signature}
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <a
              href={`https://bags.fm/${launchResult.tokenMint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold transition-all hover:scale-105"
            >
              View on Bags <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={() => router.push("/dashboard/network")}
              className="px-6 py-3 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/60 rounded-xl font-semibold transition-all hover:scale-105"
            >
              View Network
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepperSteps = [
    { title: "Select Team", icon: <Users className="w-4 h-4" /> },
    { title: "Configure Token", icon: <Coins className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
          Incorporate Your <span className="gradient-text">AI Startup</span>
        </h1>
        <p className="text-gray-400 text-base md:text-lg mb-8 max-w-2xl mx-auto">
          Launch your AI Corporation with{" "}
          <a href="https://bags.fm" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 font-semibold">
            Bags.fm
          </a>
          {" "}&mdash; instant token launches powered by the Bags API
        </p>
        <Stepper currentStep={currentStep} steps={stepperSteps} />
      </div>

      {/* Error */}
      {launchError && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{launchError}</span>
        </div>
      )}

      {/* Launch Modal */}
      {isLaunching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-sm bg-gray-900/95 rounded-2xl p-8 border border-gray-800/60 shadow-2xl">
            <div className="text-center mb-8">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-2xl bg-purple-500/30 blur-xl animate-pulse" />
                <div className="relative w-full h-full rounded-2xl bg-purple-500/20 flex items-center justify-center">
                  <Rocket className="w-8 h-8 text-purple-400 animate-bounce" />
                </div>
              </div>
              <h3 className="font-bold text-xl">Launching Corporation</h3>
              <p className="text-gray-400 text-sm mt-1">Please wait and approve any wallet prompts</p>
            </div>
            <div className="space-y-3">
              {launchSteps.map((step, index) => (
                <div key={step.id} className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 ${
                  step.status === "loading" ? "bg-purple-500/10 border border-purple-500/30" :
                  step.status === "complete" ? "bg-emerald-500/5 border border-emerald-500/20" :
                  step.status === "error" ? "bg-red-500/10 border border-red-500/30" :
                  "bg-gray-800/30 border border-gray-700/30"
                }`}>
                  <div className="flex-shrink-0">
                    {step.status === "pending" && (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-700 flex items-center justify-center text-gray-600 text-xs font-medium">
                        {index + 1}
                      </div>
                    )}
                    {step.status === "loading" && <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />}
                    {step.status === "complete" && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    {step.status === "error" && (
                      <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                        <AlertCircle className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    step.status === "loading" ? "text-white" : 
                    step.status === "complete" ? "text-emerald-400" : 
                    step.status === "error" ? "text-red-400" : 
                    "text-gray-500"
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <form onSubmit={handleLaunch}>
        {/* Step 1: Agent Selection */}
        {currentStep === 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-purple-500/30">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Select Your Team</h2>
                  <p className="text-xs text-gray-500">Choose 1-5 AI agents to power your corporation</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {selectedAgentIds.length}
                </span>
                <span className="text-gray-500 text-sm font-medium">/5 selected</span>
              </div>
            </div>

            {/* Selected pills */}
            <div className="flex flex-wrap gap-2 mb-4 min-h-[40px] items-center p-3 rounded-xl bg-gray-900/40 border border-gray-800/50">
              {selectedAgentIds.length > 0 ? (
                selectedAgentIds.map((id, i) => {
                  const agent = agents.find((a) => a.id === id);
                  const agentColor = agent?.color || "#a855f7";
                  const avatar = agent ? getAgentAvatar(agent.id, agent.name) : "🤖";
                  return agent ? (
                    <div key={id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ backgroundColor: `${agentColor}15`, borderColor: `${agentColor}40` }}>
                      <span className="w-6 h-6 rounded-md text-sm flex items-center justify-center" style={{ backgroundColor: `${agentColor}30` }}>
                        {avatar}
                      </span>
                      <span className="text-sm font-medium text-white">{agent.name}</span>
                      <span className="w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold text-white" style={{ backgroundColor: agentColor }}>
                        {i + 1}
                      </span>
                      <button type="button" onClick={() => toggleAgent(id)} className="w-5 h-5 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10">
                        ×
                      </button>
                    </div>
                  ) : null;
                })
              ) : (
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Click agents below to build your team
                </span>
              )}
            </div>

            {/* Agents grid */}
            <div className="rounded-2xl bg-gray-900/30 border border-gray-800/40 p-4 max-h-[480px] overflow-y-auto">
              {isLoadingAgents ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  <span className="text-sm text-gray-500">Loading agents...</span>
                </div>
              ) : agents.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500">
                  <Users className="w-12 h-12 opacity-30" />
                  <span className="text-sm">No agents available</span>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {agents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      isSelected={selectedAgentIds.includes(agent.id)}
                      isDisabled={!selectedAgentIds.includes(agent.id) && selectedAgentIds.length >= 5}
                      selectionOrder={selectedAgentIds.indexOf(agent.id) + 1}
                      onToggle={() => toggleAgent(agent.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={!canProceedToStep2}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {currentStep === 1 && (
          <div>
            {/* Team summary */}
            <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">{selectedAgentIds.length} agent{selectedAgentIds.length !== 1 ? "s" : ""} selected</span>
              </div>
              <button type="button" onClick={() => setCurrentStep(0)} className="text-xs font-medium text-purple-400 hover:text-purple-300">
                Edit
              </button>
            </div>

            {/* Form */}
            <div className="rounded-xl bg-gray-900/30 border border-gray-800/40 p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                    Name<span className="text-purple-400 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="AI Ventures Corp"
                    maxLength={32}
                    className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                    Symbol<span className="text-purple-400 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">$</span>
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="AIVC"
                      maxLength={10}
                      className="w-full pl-7 pr-3 py-2.5 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white text-sm uppercase font-mono placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                    Initial Buy
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={initialBuyAmount}
                      onChange={(e) => setInitialBuyAmount(e.target.value)}
                      placeholder="0.01"
                      className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">SOL</span>
                  </div>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Description<span className="text-purple-400 ml-0.5">*</span>
                    </label>
                    <span className="text-[10px] text-gray-600">{description.length}/1000</span>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your AI startup..."
                    maxLength={1000}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                    Logo URL<span className="text-purple-400 ml-0.5">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-3 py-2.5 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                    />
                    <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                  </div>
                </div>
                {walletAddress && (
                  <div className="lg:col-span-1">
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                      Wallet
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-800/70 border border-gray-700/50 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="font-mono text-xs text-gray-400 truncate">
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Social links */}
              <div className="mt-4 pt-4 border-t border-gray-800/50">
                <label className="block text-[11px] font-medium text-gray-500 mb-2 uppercase tracking-wider">
                  Social Links <span className="text-gray-600 normal-case">(optional)</span>
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input type="url" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="Twitter URL" className="w-full pl-9 pr-3 py-2 bg-gray-800/50 border border-gray-700/40 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
                  </div>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="Website URL" className="w-full pl-9 pr-3 py-2 bg-gray-800/50 border border-gray-700/40 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
                  </div>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input type="url" value={telegramUrl} onChange={(e) => setTelegramUrl(e.target.value)} placeholder="Telegram URL" className="w-full pl-9 pr-3 py-2 bg-gray-800/50 border border-gray-700/40 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button type="button" onClick={() => setCurrentStep(0)} className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/60 rounded-lg text-sm font-medium">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                disabled={isLaunching || !canLaunch}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              >
                <Rocket className="w-4 h-4" /> Launch Corporation
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
