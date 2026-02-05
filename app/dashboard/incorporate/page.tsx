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
  Star,
  Globe,
  Twitter,
  MessageCircle,
  Coins,
  Plus,
} from "lucide-react";
import { RARITIES } from "@/lib/agentTraits";
import { getBagsFmUrl, EXTERNAL_APIS } from "@/lib/constants/urls";

interface UserAgent {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  rarity: string | null;
  personality: string | null;
  traits: string[];
  isMinted: boolean;
  tokenSymbol: string | null;
}

interface LaunchStep {
  id: string;
  label: string;
  status: "pending" | "loading" | "complete" | "error";
  error?: string;
}

import { RARITY_INCORPORATE_STYLES } from "@/lib/utils/rarity";

const rarityColors = RARITY_INCORPORATE_STYLES as Record<
  string,
  { bg: string; border: string; text: string; glow: string }
>;

function AgentCard({
  agent,
  isSelected,
  isDisabled,
  selectionOrder,
  onToggle,
}: {
  agent: UserAgent;
  isSelected: boolean;
  isDisabled: boolean;
  selectionOrder: number;
  onToggle: () => void;
}) {
  const rarity = agent.rarity || "common";
  const rarityStyle = rarityColors[rarity] || rarityColors.common;
  const rarityConfig =
    RARITIES[rarity as keyof typeof RARITIES] || RARITIES.common;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isDisabled}
      className={`group relative w-full text-left transition-all duration-300 ${
        isDisabled && !isSelected ? "opacity-40 cursor-not-allowed" : ""
      }`}
    >
      {/* Glow effect */}
      <div
        className={`absolute -inset-1 rounded-2xl transition-all duration-500 ${
          isSelected
            ? "opacity-60 blur-xl"
            : "opacity-0 group-hover:opacity-20 blur-lg"
        }`}
        style={{ backgroundColor: rarityConfig.color }}
      />

      {/* Selection badge - outside overflow-hidden container */}
      {isSelected && (
        <div
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black shadow-lg ring-2 ring-[#000028] z-20 animate-in zoom-in duration-200"
          style={{
            backgroundColor: rarityConfig.color,
            boxShadow: `0 0 12px ${rarityConfig.color}60`,
          }}
        >
          {selectionOrder}
        </div>
      )}

      <div
        className={`relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300 ${
          isSelected
            ? "bg-[#0a0520]/95 scale-[1.02] shadow-2xl"
            : "bg-[#0a0520]/50 border-white/10 hover:bg-[#0a0520]/70 hover:border-white/20 hover:scale-[1.01]"
        }`}
        style={{
          borderColor: isSelected ? `${rarityConfig.color}60` : undefined,
          boxShadow: isSelected
            ? `0 0 30px ${rarityConfig.color}20`
            : undefined,
        }}
      >
        <div className="relative p-4">
          <div className="flex items-start gap-3">
            {/* Agent image */}
            <div
              className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border transition-all duration-300 ${
                isSelected ? "scale-105" : "group-hover:scale-105"
              }`}
              style={{
                borderColor: isSelected
                  ? `${rarityConfig.color}40`
                  : "rgba(255,255,255,0.1)",
              }}
            >
              {agent.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agent.imageUrl}
                  alt={agent.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#120557]/50 flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
              )}
            </div>

            {/* Agent info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm text-white truncate">
                  {agent.name}
                </h3>
                {isSelected && (
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${rarityConfig.color}30` }}
                  >
                    <Check
                      className="w-2.5 h-2.5"
                      style={{ color: rarityConfig.color }}
                    />
                  </div>
                )}
              </div>

              {/* Rarity & token */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${rarityStyle.bg} ${rarityStyle.text}`}
                >
                  <Star className="w-2.5 h-2.5" />
                  {rarity}
                </span>
                {agent.tokenSymbol && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#6FEC06]/20 text-[#6FEC06] border border-[#6FEC06]/30">
                    ${agent.tokenSymbol}
                  </span>
                )}
              </div>

              {/* Traits preview */}
              {agent.traits && agent.traits.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {agent.traits.slice(0, 2).map((trait, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#120557]/50 text-white/60 border border-white/10"
                    >
                      {trait}
                    </span>
                  ))}
                  {agent.traits.length > 2 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white/30">
                      +{agent.traits.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function Stepper({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: { title: string; icon: React.ReactNode }[];
}) {
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
                  ? "bg-[#6FEC06]/15 text-[#6FEC06] border border-[#6FEC06]/30"
                  : isActive
                    ? "bg-[#6FEC06]/10 text-[#6FEC06] border border-[#6FEC06]/40 shadow-lg shadow-[#6FEC06]/10"
                    : "bg-[#120557]/30 text-white/40 border border-white/10"
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-[#6FEC06]/20 blur-lg -z-10" />
              )}
              <div
                className={`w-5 h-5 flex items-center justify-center ${isActive ? "scale-110" : ""}`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : step.icon}
              </div>
              <span className="text-xs font-semibold tracking-wide">
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-12 h-[2px] mx-3 bg-[#120557] rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] transition-all duration-500 ${isComplete ? "w-full" : "w-0"}`}
                />
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
  const { user, ready, authenticated } = usePrivy();
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

  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const [launchSteps, setLaunchSteps] = useState<LaunchStep[]>([]);
  const [launchResult, setLaunchResult] = useState<{
    tokenMint: string;
    signature: string;
    corporationId: string;
  } | null>(null);

  const embeddedWallet = useMemo(
    () => wallets.find((w) => w.standardWallet?.name === "Privy"),
    [wallets],
  );
  const walletAddress = useMemo(() => {
    const solanaWallet = user?.linkedAccounts?.find(
      (account) => account.type === "wallet" && account.chainType === "solana",
    );
    return solanaWallet && "address" in solanaWallet
      ? solanaWallet.address
      : null;
  }, [user?.linkedAccounts]);

  // Fetch user's real agents
  useEffect(() => {
    async function fetchAgents() {
      // Wait for Privy to be ready
      if (!ready) return;

      // If not authenticated, stop loading and show empty
      if (!authenticated || !identityToken) {
        setIsLoadingAgents(false);
        setAgents([]);
        return;
      }

      setIsLoadingAgents(true);
      setFetchError("");
      try {
        const response = await fetch("/api/agents", {
          headers: { "privy-id-token": identityToken },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch agents");
        }
        const data = await response.json();
        setAgents(data.agents || []);
      } catch (err) {
        console.error("Failed to load agents:", err);
        setFetchError(
          err instanceof Error ? err.message : "Failed to load agents",
        );
        setAgents([]);
      } finally {
        setIsLoadingAgents(false);
      }
    }
    fetchAgents();
  }, [ready, authenticated, identityToken]);

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) => {
      if (prev.includes(agentId)) return prev.filter((id) => id !== agentId);
      if (prev.length >= 5) return prev;
      return [...prev, agentId];
    });
  };

  const updateStep = (
    stepId: string,
    status: LaunchStep["status"],
    error?: string,
  ) => {
    setLaunchSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, error } : step,
      ),
    );
  };

  const canProceedToStep2 = selectedAgentIds.length >= 2; // Need at least 2 agents for a corporation
  const canLaunch =
    name.trim() &&
    symbol.trim() &&
    description.trim() &&
    imageUrl.trim() &&
    selectedAgentIds.length >= 2;

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaunchError("");
    setLaunchResult(null);

    if (!identityToken || !embeddedWallet || !walletAddress || !canLaunch) {
      setLaunchError(
        "Please fill in all required fields and select at least 2 agents",
      );
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
      { id: "save", label: "Saving corporation", status: "pending" },
    ]);

    setIsLaunching(true);

    try {
      updateStep("metadata", "loading");
      const metadataResponse = await fetch("/api/incorporate/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
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

      if (!metadataResponse.ok)
        throw new Error(
          (await metadataResponse.json()).error || "Failed to create metadata",
        );
      const metadataData = await metadataResponse.json();
      updateStep("metadata", "complete");

      updateStep("feeShare", "loading");
      const feeShareResponse = await fetch("/api/incorporate/fee-share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({
          wallet: walletAddress,
          tokenMint: metadataData.tokenMint,
        }),
      });

      if (!feeShareResponse.ok)
        throw new Error(
          (await feeShareResponse.json()).error ||
            "Failed to create fee config",
        );
      const feeShareData = await feeShareResponse.json();

      // Process regular transactions
      if (feeShareData.transactions?.length > 0) {
        for (let i = 0; i < feeShareData.transactions.length; i++) {
          try {
            const txData = feeShareData.transactions[i];
            let txBytes: Uint8Array;
            try {
              txBytes = Uint8Array.from(atob(txData.transaction), (c) =>
                c.charCodeAt(0),
              );
            } catch {
              throw new Error(
                `Invalid transaction data for fee config ${i + 1}`,
              );
            }
            const signResult = await signTransaction({
              transaction: txBytes,
              wallet: embeddedWallet,
            });
            const signedTxBase64 = btoa(
              String.fromCharCode(
                ...new Uint8Array(signResult.signedTransaction),
              ),
            );

            const sendResponse = await fetch(
              "/api/incorporate/send-transaction",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "privy-id-token": identityToken,
                },
                body: JSON.stringify({ signedTransaction: signedTxBase64 }),
              },
            );

            if (!sendResponse.ok) {
              const errorData = await sendResponse.json().catch(() => ({}));
              throw new Error(
                errorData.error ||
                  `Failed to send fee config transaction ${i + 1}`,
              );
            }
          } catch (error) {
            throw new Error(
              `Fee config transaction ${i + 1} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }
      }

      // Process bundles (if any) - sign all transactions then send as bundle via Jito
      if (feeShareData.bundles?.length > 0) {
        for (
          let bundleIdx = 0;
          bundleIdx < feeShareData.bundles.length;
          bundleIdx++
        ) {
          const bundle = feeShareData.bundles[bundleIdx];
          const signedTransactions: string[] = [];

          // Sign each transaction in the bundle
          for (let txIdx = 0; txIdx < bundle.length; txIdx++) {
            const txData = bundle[txIdx];
            let txBytes: Uint8Array;
            try {
              txBytes = Uint8Array.from(atob(txData.transaction), (c) =>
                c.charCodeAt(0),
              );
            } catch {
              throw new Error(
                `Invalid bundle ${bundleIdx + 1} transaction ${txIdx + 1} data`,
              );
            }
            const signResult = await signTransaction({
              transaction: txBytes,
              wallet: embeddedWallet,
            });
            const signedTxBase64 = btoa(
              String.fromCharCode(
                ...new Uint8Array(signResult.signedTransaction),
              ),
            );
            signedTransactions.push(signedTxBase64);
          }

          // Send the signed bundle via Jito
          const bundleResponse = await fetch("/api/incorporate/send-bundle", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "privy-id-token": identityToken,
            },
            body: JSON.stringify({ signedTransactions }),
          });

          if (!bundleResponse.ok) {
            const errorData = await bundleResponse.json().catch(() => ({}));
            throw new Error(
              errorData.error || `Failed to send bundle ${bundleIdx + 1}`,
            );
          }
        }
      }
      updateStep("feeShare", "complete");

      updateStep("sign", "loading");
      const launchTxResponse = await fetch("/api/incorporate/launch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({
          tokenMint: metadataData.tokenMint,
          metadataUrl: metadataData.tokenMetadata,
          wallet: walletAddress,
          initialBuyLamports: Math.floor(initialBuy * 1e9),
          configKey: feeShareData.meteoraConfigKey,
        }),
      });

      if (!launchTxResponse.ok)
        throw new Error(
          (await launchTxResponse.json()).error ||
            "Failed to create transaction",
        );
      const launchTxData = await launchTxResponse.json();
      const launchTxBytes = Uint8Array.from(
        atob(launchTxData.transaction),
        (c) => c.charCodeAt(0),
      );
      const signResult = await signTransaction({
        transaction: launchTxBytes,
        wallet: embeddedWallet,
      });
      const signedLaunchTxBase64 = btoa(
        String.fromCharCode(...new Uint8Array(signResult.signedTransaction)),
      );
      updateStep("sign", "complete");

      updateStep("broadcast", "loading");
      const broadcastResponse = await fetch(
        "/api/incorporate/send-transaction",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "privy-id-token": identityToken,
          },
          body: JSON.stringify({ signedTransaction: signedLaunchTxBase64 }),
        },
      );

      if (!broadcastResponse.ok)
        throw new Error(
          (await broadcastResponse.json()).error || "Failed to broadcast",
        );
      const broadcastData = await broadcastResponse.json();
      updateStep("broadcast", "complete");

      updateStep("save", "loading");
      const saveResponse = await fetch("/api/incorporate/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
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

      if (!saveResponse.ok)
        throw new Error((await saveResponse.json()).error || "Failed to save");
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
      setLaunchSteps((prev) =>
        prev.map((step) =>
          step.status === "loading"
            ? { ...step, status: "error", error: errorMessage }
            : step,
        ),
      );
    } finally {
      setIsLaunching(false);
    }
  };

  // Success screen
  if (launchResult) {
    const selectedAgents = agents.filter((a) =>
      selectedAgentIds.includes(a.id),
    );
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center max-w-lg w-full">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#6FEC06]/40 to-[#120557]/40 blur-2xl animate-pulse" />
            <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-[#6FEC06]/20 to-[#120557]/20 flex items-center justify-center border border-[#6FEC06]/40 backdrop-blur-sm">
              <Building2 className="w-12 h-12 text-[#6FEC06] animate-pulse" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3 font-display">
            Corporation Launched!
          </h1>
          <p className="text-white/50 mb-6">
            <span className="text-white font-semibold">{name}</span> is now live
            with{" "}
            <span className="text-[#6FEC06] font-mono font-semibold">
              ${symbol.toUpperCase()}
            </span>
          </p>

          {/* Team display */}
          <div className="flex justify-center gap-2 mb-6">
            {selectedAgents.map((agent) => (
              <div
                key={agent.id}
                className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-[#6FEC06]/30"
              >
                {agent.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={agent.imageUrl}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#120557] flex items-center justify-center text-lg">
                    🤖
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-[#0a0520]/60 rounded-2xl p-6 mb-8 text-left border border-white/10">
            <div className="mb-5">
              <p className="text-white/40 uppercase tracking-wider text-[10px] font-semibold mb-2 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" /> Token Mint Address
              </p>
              <p className="font-mono text-sm text-white/70 bg-[#120557]/50 px-4 py-2.5 rounded-xl truncate border border-[#6FEC06]/20">
                {launchResult.tokenMint}
              </p>
            </div>
            <div>
              <p className="text-white/40 uppercase tracking-wider text-[10px] font-semibold mb-2 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Transaction Signature
              </p>
              <p className="font-mono text-sm text-white/70 bg-[#120557]/50 px-4 py-2.5 rounded-xl truncate border border-[#6FEC06]/20">
                {launchResult.signature}
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <a
              href={getBagsFmUrl(launchResult.tokenMint)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-xl text-black font-semibold transition-all hover:scale-105 shadow-lg shadow-[#6FEC06]/20"
            >
              View on Bags <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={() => router.push("/dashboard/network")}
              className="px-6 py-3 bg-[#120557]/50 hover:bg-[#120557]/70 border border-white/10 rounded-xl font-semibold transition-all hover:scale-105"
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
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight font-display">
          Incorporate Your{" "}
          <span className="gradient-text-shimmer">AI Corporation</span>
        </h1>
        <p className="text-white/50 text-sm md:text-base mb-6 max-w-2xl mx-auto">
          Combine your minted AI agents into a corporation and launch a token on{" "}
          <a
            href={EXTERNAL_APIS.bagsFm}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6FEC06] hover:underline font-semibold"
          >
            Bags.fm
          </a>
        </p>
        <Stepper currentStep={currentStep} steps={stepperSteps} />
      </div>

      {/* Error */}
      {launchError && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3 backdrop-blur-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{launchError}</span>
          <button
            onClick={() => setLaunchError("")}
            className="ml-auto text-red-400/60 hover:text-red-400"
          >
            ×
          </button>
        </div>
      )}

      {/* Launch Modal */}
      {isLaunching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000028]/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0a0520]/95 rounded-2xl p-8 border border-[#6FEC06]/20 shadow-2xl shadow-[#6FEC06]/10">
            <div className="text-center mb-8">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-2xl bg-[#6FEC06]/30 blur-xl animate-pulse" />
                <div className="relative w-full h-full rounded-2xl bg-[#6FEC06]/20 flex items-center justify-center border border-[#6FEC06]/30">
                  <Rocket className="w-8 h-8 text-[#6FEC06] animate-bounce" />
                </div>
              </div>
              <h3 className="font-bold text-xl font-display">
                Launching Corporation
              </h3>
              <p className="text-white/50 text-sm mt-1">
                Please approve any wallet prompts
              </p>
            </div>
            <div className="space-y-3">
              {launchSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 ${
                    step.status === "loading"
                      ? "bg-[#6FEC06]/10 border border-[#6FEC06]/30"
                      : step.status === "complete"
                        ? "bg-[#6FEC06]/5 border border-[#6FEC06]/20"
                        : step.status === "error"
                          ? "bg-red-500/10 border border-red-500/30"
                          : "bg-[#120557]/30 border border-white/10"
                  }`}
                >
                  <div className="flex-shrink-0">
                    {step.status === "pending" && (
                      <div className="w-6 h-6 rounded-full border-2 border-white/20 flex items-center justify-center text-white/40 text-xs font-medium">
                        {index + 1}
                      </div>
                    )}
                    {step.status === "loading" && (
                      <Loader2 className="w-6 h-6 text-[#6FEC06] animate-spin" />
                    )}
                    {step.status === "complete" && (
                      <div className="w-6 h-6 rounded-full bg-[#6FEC06] flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-black" />
                      </div>
                    )}
                    {step.status === "error" && (
                      <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                        <AlertCircle className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      step.status === "loading"
                        ? "text-white"
                        : step.status === "complete"
                          ? "text-[#6FEC06]"
                          : step.status === "error"
                            ? "text-red-400"
                            : "text-white/40"
                    }`}
                  >
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
                <div className="w-10 h-10 rounded-xl bg-[#6FEC06]/20 flex items-center justify-center border border-[#6FEC06]/30">
                  <Users className="w-5 h-5 text-[#6FEC06]" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">
                    Select Your Executive Team
                  </h2>
                  <p className="text-xs text-white/40">
                    Choose 2-5 minted AI agents to form your corporation
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#120557]/50 border border-[#6FEC06]/20">
                <span className="text-2xl font-bold text-[#6FEC06]">
                  {selectedAgentIds.length}
                </span>
                <span className="text-white/40 text-sm font-medium">
                  /5 selected
                </span>
              </div>
            </div>

            {/* Selected pills */}
            <div className="flex flex-wrap gap-2 mb-4 min-h-[48px] items-center p-3 rounded-xl bg-[#0a0520]/50 border border-white/10">
              {selectedAgentIds.length > 0 ? (
                selectedAgentIds.map((id, i) => {
                  const agent = agents.find((a) => a.id === id);
                  const rarity = agent?.rarity || "common";
                  const rarityConfig =
                    RARITIES[rarity as keyof typeof RARITIES] ||
                    RARITIES.common;
                  return agent ? (
                    <div
                      key={id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                      style={{
                        backgroundColor: `${rarityConfig.color}15`,
                        borderColor: `${rarityConfig.color}40`,
                      }}
                    >
                      <div className="w-6 h-6 rounded-md overflow-hidden">
                        {agent.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={agent.imageUrl}
                            alt={agent.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm">🤖</span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-white">
                        {agent.name}
                      </span>
                      <span
                        className="w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold text-black"
                        style={{ backgroundColor: rarityConfig.color }}
                      >
                        {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleAgent(id)}
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10"
                      >
                        ×
                      </button>
                    </div>
                  ) : null;
                })
              ) : (
                <span className="text-sm text-white/40 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Select at least 2 agents to form your corporation
                </span>
              )}
            </div>

            {/* Agents grid */}
            <div className="rounded-2xl bg-[#0a0520]/30 border border-white/10 p-4 pt-6 max-h-[480px] overflow-y-auto">
              {isLoadingAgents ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-[#6FEC06] animate-spin" />
                  <span className="text-sm text-white/40">
                    Loading your agents...
                  </span>
                </div>
              ) : fetchError ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-red-400">
                  <AlertCircle className="w-8 h-8" />
                  <div className="text-center">
                    <p className="font-medium mb-1">Failed to load agents</p>
                    <p className="text-sm text-red-400/70">{fetchError}</p>
                  </div>
                </div>
              ) : !authenticated ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-white/40">
                  <Users className="w-8 h-8" />
                  <p className="text-sm">Please sign in to view your agents</p>
                </div>
              ) : agents.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-white/40">
                  <div className="w-16 h-16 rounded-2xl bg-[#120557]/50 flex items-center justify-center border border-white/10">
                    <Users className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-white/60 mb-1">
                      No agents yet
                    </p>
                    <p className="text-sm text-white/40 mb-4">
                      Create agents before forming a corporation
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard/mint")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-lg text-black text-sm font-semibold hover:opacity-90"
                    >
                      <Plus className="w-4 h-4" /> Create Your First Agent
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Need more agents message */}
                  {agents.length < 2 && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        <p className="text-sm text-amber-200">
                          You need at least{" "}
                          <span className="font-semibold">2 agents</span> to
                          form a corporation. Create {2 - agents.length} more!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/dashboard/mint")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-200 text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" /> Mint Agent
                      </button>
                    </div>
                  )}

                  {/* Agents grid - extra padding for selection badges */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-1 pr-1">
                    {agents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        isSelected={selectedAgentIds.includes(agent.id)}
                        isDisabled={
                          !selectedAgentIds.includes(agent.id) &&
                          selectedAgentIds.length >= 5
                        }
                        selectionOrder={selectedAgentIds.indexOf(agent.id) + 1}
                        onToggle={() => toggleAgent(agent.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={!canProceedToStep2}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-lg text-black text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 shadow-lg shadow-[#6FEC06]/20"
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
            <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl bg-[#6FEC06]/10 border border-[#6FEC06]/30">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {selectedAgentIds.slice(0, 4).map((id) => {
                    const agent = agents.find((a) => a.id === id);
                    return agent ? (
                      <div
                        key={id}
                        className="w-8 h-8 rounded-lg overflow-hidden border-2 border-[#000028]"
                      >
                        {agent.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={agent.imageUrl}
                            alt={agent.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#120557] flex items-center justify-center text-sm">
                            🤖
                          </div>
                        )}
                      </div>
                    ) : null;
                  })}
                  {selectedAgentIds.length > 4 && (
                    <div className="w-8 h-8 rounded-lg bg-[#120557] border-2 border-[#000028] flex items-center justify-center text-xs text-white/60">
                      +{selectedAgentIds.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-[#6FEC06]">
                  {selectedAgentIds.length} agents selected
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="text-xs font-medium text-[#6FEC06] hover:underline"
              >
                Edit Team
              </button>
            </div>

            {/* Form */}
            <div className="rounded-xl bg-[#0a0520]/50 border border-white/10 p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">
                    Corporation Name
                    <span className="text-[#6FEC06] ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="AI Ventures Corp"
                    maxLength={32}
                    className="w-full px-3 py-2.5 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">
                    Token Symbol<span className="text-[#6FEC06] ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium">
                      $
                    </span>
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="AIVC"
                      maxLength={10}
                      className="w-full pl-7 pr-3 py-2.5 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg text-white text-sm uppercase font-mono placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">
                    Initial Buy
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={initialBuyAmount}
                      onChange={(e) => setInitialBuyAmount(e.target.value)}
                      placeholder="0.01"
                      className="w-full px-3 py-2.5 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs font-medium">
                      SOL
                    </span>
                  </div>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                      Description
                      <span className="text-[#6FEC06] ml-0.5">*</span>
                    </label>
                    <span className="text-[10px] text-white/30">
                      {description.length}/1000
                    </span>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your AI corporation..."
                    maxLength={1000}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50 resize-none"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">
                    Logo URL<span className="text-[#6FEC06] ml-0.5">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-3 py-2.5 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50"
                    />
                    <div className="w-10 h-10 rounded-lg bg-[#120557]/80 border border-[#6FEC06]/20 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-white/30" />
                      )}
                    </div>
                  </div>
                </div>
                {walletAddress && (
                  <div className="lg:col-span-1">
                    <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">
                      Wallet
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-[#120557]/50 border border-[#6FEC06]/20 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6FEC06] animate-pulse" />
                      <span className="font-mono text-xs text-white/60 truncate">
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Social links */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <label className="block text-[11px] font-medium text-white/40 mb-2 uppercase tracking-wider">
                  Social Links{" "}
                  <span className="text-white/20 normal-case">(optional)</span>
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <input
                      type="url"
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="Twitter URL"
                      className="w-full pl-9 pr-3 py-2 bg-[#120557]/30 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50"
                    />
                  </div>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="Website URL"
                      className="w-full pl-9 pr-3 py-2 bg-[#120557]/30 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50"
                    />
                  </div>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <input
                      type="url"
                      value={telegramUrl}
                      onChange={(e) => setTelegramUrl(e.target.value)}
                      placeholder="Telegram URL"
                      className="w-full pl-9 pr-3 py-2 bg-[#120557]/30 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#120557]/50 hover:bg-[#120557]/70 border border-white/10 rounded-lg text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                disabled={isLaunching || !canLaunch}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-lg text-black text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 shadow-lg shadow-[#6FEC06]/20"
              >
                <Building2 className="w-4 h-4" /> Launch Corporation
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
