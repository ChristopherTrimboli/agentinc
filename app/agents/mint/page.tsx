"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";
import { useWallets, useSignTransaction } from "@privy-io/react-auth/solana";
import {
  Sparkles,
  Shuffle,
  Wand2,
  Rocket,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Brain,
  Zap,
  Shield,
  Star,
  Coins,
  Image as ImageIcon,
  RefreshCw,
  Lock,
  Unlock,
} from "lucide-react";
import Navigation from "../../components/Navigation";
import {
  generateRandomAgent,
  generateAgentName,
  PERSONALITIES,
  TRAITS,
  SKILLS,
  TOOLS,
  SPECIAL_ABILITIES,
  RARITIES,
  getPersonalityById,
  getTraitById,
  getSkillById,
  getToolById,
  getSpecialAbilityById,
  AgentTraitData,
} from "@/lib/agentTraits";

interface LaunchStep {
  id: string;
  label: string;
  status: "pending" | "loading" | "complete" | "error";
  error?: string;
}

// Estimated transaction fees (in SOL) for minting process
const ESTIMATED_TX_FEES = 0.02; // ~0.02 SOL for multiple transactions

// Animated trait pill component
function TraitPill({
  icon,
  name,
  color,
  isAnimating,
  size = "md",
}: {
  icon: string;
  name: string;
  color?: string;
  isAnimating?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border transition-all duration-300 ${sizeClasses[size]} ${
        isAnimating
          ? "animate-pulse bg-purple-500/20 border-purple-500/50"
          : "bg-gray-800/60 border-gray-700/50"
      }`}
      style={{
        borderColor: color ? `${color}40` : undefined,
        backgroundColor: color ? `${color}15` : undefined,
      }}
    >
      <span className="text-base">{icon}</span>
      <span className="font-medium text-gray-200">{name}</span>
    </div>
  );
}

// Rarity badge component
function RarityBadge({ rarity }: { rarity: keyof typeof RARITIES }) {
  const config = RARITIES[rarity];

  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        boxShadow: `0 0 12px ${config.color}20`,
      }}
    >
      <Star className="w-3 h-3" />
      {config.name}
    </div>
  );
}

// Agent preview card
function AgentPreviewCard({
  name,
  traits,
  imageUrl,
  isGeneratingImage,
}: {
  name: string;
  traits: AgentTraitData;
  imageUrl?: string;
  isGeneratingImage?: boolean;
}) {
  const personality = getPersonalityById(traits.personality);
  const specialAbility = getSpecialAbilityById(traits.specialAbility);
  const rarityConfig = RARITIES[traits.rarity];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 transition-all duration-500"
      style={{
        borderColor: `${rarityConfig.color}50`,
        boxShadow: `0 0 40px ${rarityConfig.color}15, inset 0 0 40px ${rarityConfig.color}05`,
      }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at top, ${rarityConfig.color}15 0%, transparent 50%), radial-gradient(ellipse at bottom, ${personality?.color}10 0%, transparent 50%)`,
        }}
      />

      <div className="relative p-4 bg-gray-900/80 backdrop-blur-xl">
        {/* Header with rarity and personality */}
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

        {/* Agent image - more compact */}
        <div className="relative mb-4">
          <div
            className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border"
            style={{ borderColor: `${rarityConfig.color}30` }}
          >
            {isGeneratingImage ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
                  <Wand2 className="absolute inset-0 m-auto w-6 h-6 text-purple-400" />
                </div>
                <p className="mt-3 text-xs text-gray-400 animate-pulse">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl mb-2"
                  style={{ backgroundColor: `${personality?.color}20` }}
                >
                  {personality?.icon}
                </div>
                <p className="text-xs text-gray-500">No image yet</p>
              </div>
            )}
          </div>

          {/* Special ability badge */}
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

        {/* Name */}
        <h2 className="text-xl font-bold text-center mb-4 mt-2">{name}</h2>

        {/* Traits - more compact */}
        <div className="space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">
              Traits
            </p>
            <div className="flex flex-wrap gap-1.5">
              {traits.traits.map((id) => {
                const trait = getTraitById(id);
                return trait ? (
                  <TraitPill
                    key={id}
                    icon={trait.icon}
                    name={trait.name}
                    size="sm"
                  />
                ) : null;
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {traits.skills.map((id) => {
                const skill = getSkillById(id);
                return skill ? (
                  <TraitPill
                    key={id}
                    icon={skill.icon}
                    name={skill.name}
                    size="sm"
                  />
                ) : null;
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">
              Tools
            </p>
            <div className="flex flex-wrap gap-1.5">
              {traits.tools.map((id) => {
                const tool = getToolById(id);
                return tool ? (
                  <TraitPill
                    key={id}
                    icon={tool.icon}
                    name={tool.name}
                    size="sm"
                  />
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Randomization slot machine animation
function SlotMachine({
  items,
  selectedId,
  isSpinning,
  renderItem,
}: {
  items: readonly { id: string; name: string; icon: string }[];
  selectedId: string;
  isSpinning: boolean;
  renderItem: (item: {
    id: string;
    name: string;
    icon: string;
  }) => React.ReactNode;
}) {
  const [displayItems, setDisplayItems] = useState<(typeof items)[number][]>(
    [],
  );

  useEffect(() => {
    if (isSpinning) {
      // Rapid cycling animation
      const interval = setInterval(() => {
        const randomItems = Array(3)
          .fill(null)
          .map(() => items[Math.floor(Math.random() * items.length)]);
        setDisplayItems(randomItems);
      }, 100);

      return () => clearInterval(interval);
    } else {
      const selected = items.find((i) => i.id === selectedId);
      if (selected) setDisplayItems([selected]);
    }
  }, [isSpinning, selectedId, items]);

  return (
    <div className="relative overflow-hidden h-12">
      <div
        className={`transition-transform duration-300 ${
          isSpinning ? "animate-bounce" : ""
        }`}
      >
        {displayItems.map((item, i) => (
          <div key={`${item.id}-${i}`}>{renderItem(item)}</div>
        ))}
      </div>
    </div>
  );
}

// Step indicator component
function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: { title: string; icon: React.ReactNode }[];
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isComplete = index < currentStep;

        return (
          <div key={index} className="flex items-center">
            <div
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                isComplete
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : isActive
                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10"
                    : "bg-gray-800/40 text-gray-500 border border-gray-700/50"
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-lg -z-10" />
              )}
              <div
                className={`w-5 h-5 flex items-center justify-center ${isActive ? "scale-110" : ""}`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : step.icon}
              </div>
              <span className="text-xs font-semibold tracking-wide hidden sm:inline">
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-8 h-[2px] mx-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ${
                    isComplete ? "w-full" : "w-0"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MintAgentPage() {
  const router = useRouter();
  const { ready, authenticated, login, user } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [agentName, setAgentName] = useState("");
  const [agentTraits, setAgentTraits] = useState<AgentTraitData | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [lockedTraits, setLockedTraits] = useState<Set<string>>(new Set());

  // Token config
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [initialBuyAmount, setInitialBuyAmount] = useState("0.01");

  // Launch state
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const [launchSteps, setLaunchSteps] = useState<LaunchStep[]>([]);
  const [launchResult, setLaunchResult] = useState<{
    tokenMint: string;
    signature: string;
    agentId: string;
  } | null>(null);

  // Wallet
  const embeddedWallet = useMemo(() => {
    return wallets.find((w) => w.standardWallet?.name === "Privy");
  }, [wallets]);

  const walletAddress = useMemo(() => {
    const solanaWallet = user?.linkedAccounts?.find(
      (account) => account.type === "wallet" && account.chainType === "solana",
    );
    return solanaWallet && "address" in solanaWallet
      ? solanaWallet.address
      : null;
  }, [user?.linkedAccounts]);

  // Initialize with random agent
  useEffect(() => {
    if (!agentTraits) {
      setAgentName(generateAgentName());
      setAgentTraits(generateRandomAgent());
    }
  }, [agentTraits]);

  // Generate token symbol from name
  useEffect(() => {
    if (agentName && !tokenSymbol) {
      const symbol = agentName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 5);
      setTokenSymbol(symbol);
    }
  }, [agentName, tokenSymbol]);

  // Randomize agent
  const randomizeAgent = useCallback(() => {
    setIsRandomizing(true);

    // Animate for a bit before settling
    setTimeout(() => {
      const newTraits = generateRandomAgent();

      // Keep locked traits
      if (agentTraits) {
        if (lockedTraits.has("personality"))
          newTraits.personality = agentTraits.personality;
        if (lockedTraits.has("specialAbility"))
          newTraits.specialAbility = agentTraits.specialAbility;
        // For arrays, keep locked items
        if (lockedTraits.has("traits")) newTraits.traits = agentTraits.traits;
        if (lockedTraits.has("skills")) newTraits.skills = agentTraits.skills;
        if (lockedTraits.has("tools")) newTraits.tools = agentTraits.tools;
      }

      if (!lockedTraits.has("name")) {
        setAgentName(generateAgentName());
        setTokenSymbol(""); // Reset symbol to regenerate
      }

      setAgentTraits(newTraits);
      setIsRandomizing(false);
    }, 800);
  }, [agentTraits, lockedTraits]);

  // Toggle lock on a trait category
  const toggleLock = (category: string) => {
    setLockedTraits((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Generate AI image
  const generateImage = async () => {
    if (!identityToken || !agentTraits) return;

    setIsGeneratingImage(true);
    try {
      const response = await fetch("/api/agents/mint/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({
          name: agentName,
          traits: agentTraits,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      setImageUrl(data.imageUrl);
    } catch (error) {
      console.error("Image generation error:", error);
      setLaunchError(
        error instanceof Error ? error.message : "Failed to generate image",
      );
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Update launch step
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

  // Launch agent token
  const handleLaunch = async () => {
    setLaunchError("");
    setLaunchResult(null);

    if (
      !identityToken ||
      !embeddedWallet ||
      !walletAddress ||
      !agentTraits ||
      !imageUrl
    ) {
      setLaunchError("Please complete all steps before launching");
      return;
    }

    const initialBuy = parseFloat(initialBuyAmount);
    if (isNaN(initialBuy) || initialBuy < 0) {
      setLaunchError("Invalid initial buy amount");
      return;
    }

    const requiredSol = initialBuy + ESTIMATED_TX_FEES;

    setLaunchSteps([
      {
        id: "balance",
        label: `Verifying ${requiredSol.toFixed(3)} SOL`,
        status: "pending",
      },
      { id: "metadata", label: "Creating metadata", status: "pending" },
      { id: "feeShare", label: "Fee config", status: "pending" },
      { id: "sign", label: "Signing", status: "pending" },
      { id: "broadcast", label: "Broadcasting", status: "pending" },
      { id: "save", label: "Saving agent", status: "pending" },
    ]);

    setIsLaunching(true);

    try {
      // Step 0: Check wallet balance before proceeding
      updateStep("balance", "loading");

      // Fetch balance via backend API (avoids CORS issues)
      const balanceResponse = await fetch("/api/agents/mint/balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({ wallet: walletAddress }),
      });

      if (!balanceResponse.ok) {
        throw new Error("Failed to check wallet balance");
      }

      const balanceData = await balanceResponse.json();
      const balanceSol = balanceData.balanceSol || 0;

      if (balanceSol < requiredSol) {
        throw new Error(
          `Insufficient balance. You have ${balanceSol.toFixed(4)} SOL but need at least ${requiredSol.toFixed(4)} SOL (${initialBuy} SOL initial buy + ~${ESTIMATED_TX_FEES} SOL for fees)`,
        );
      }

      updateStep("balance", "complete");

      // Step 1: Create metadata
      updateStep("metadata", "loading");
      const metadataResponse = await fetch("/api/agents/mint/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({
          name: agentName.trim(),
          symbol: tokenSymbol.trim().toUpperCase(),
          description:
            description.trim() ||
            `${agentName} - A ${agentTraits.rarity} AI Agent`,
          imageUrl: imageUrl,
        }),
      });

      if (!metadataResponse.ok) {
        throw new Error(
          (await metadataResponse.json()).error || "Failed to create metadata",
        );
      }
      const metadataData = await metadataResponse.json();
      updateStep("metadata", "complete");

      // Step 2: Fee share config
      updateStep("feeShare", "loading");
      const feeShareResponse = await fetch("/api/agents/mint/fee-share", {
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

      if (!feeShareResponse.ok) {
        throw new Error(
          (await feeShareResponse.json()).error ||
            "Failed to create fee config",
        );
      }
      const feeShareData = await feeShareResponse.json();

      // Handle LUT transactions if needed (for >15 fee claimers)
      if (feeShareData.lutTransactions?.length > 0) {
        console.log(
          `[Mint] Processing ${feeShareData.lutTransactions.length} LUT transactions...`,
        );

        for (const lutTx of feeShareData.lutTransactions) {
          const txBytes = Uint8Array.from(atob(lutTx.transaction), (c) =>
            c.charCodeAt(0),
          );
          const signResult = await signTransaction({
            transaction: txBytes,
            wallet: embeddedWallet,
          });
          const signedTxBase64 = btoa(
            String.fromCharCode(
              ...new Uint8Array(signResult.signedTransaction),
            ),
          );

          await fetch("/api/agents/mint/send-transaction", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "privy-id-token": identityToken,
            },
            body: JSON.stringify({ signedTransaction: signedTxBase64 }),
          });

          // Wait between LUT creation and extend transactions (Solana requires 1 slot)
          if (lutTx.type === "lut_creation") {
            console.log("[Mint] Waiting for slot after LUT creation...");
            await new Promise((resolve) => setTimeout(resolve, 2000)); // ~2 seconds for 1 slot
          }
        }
      }

      // Sign any fee share transactions
      if (feeShareData.transactions?.length > 0) {
        for (const txData of feeShareData.transactions) {
          const txBytes = Uint8Array.from(atob(txData.transaction), (c) =>
            c.charCodeAt(0),
          );
          const signResult = await signTransaction({
            transaction: txBytes,
            wallet: embeddedWallet,
          });
          const signedTxBase64 = btoa(
            String.fromCharCode(
              ...new Uint8Array(signResult.signedTransaction),
            ),
          );
          await fetch("/api/agents/mint/send-transaction", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "privy-id-token": identityToken,
            },
            body: JSON.stringify({ signedTransaction: signedTxBase64 }),
          });
        }
      }

      // Sign and send any fee share bundles with Jito tips (tip included in bundle from backend)
      if (feeShareData.bundles?.length > 0) {
        for (const bundle of feeShareData.bundles) {
          // Sign all bundle transactions (tip transaction is first if present)
          const signedBundleTxs: string[] = [];

          for (const txData of bundle) {
            const txBytes = Uint8Array.from(atob(txData.transaction), (c) =>
              c.charCodeAt(0),
            );
            const signResult = await signTransaction({
              transaction: txBytes,
              wallet: embeddedWallet,
            });
            signedBundleTxs.push(
              btoa(
                String.fromCharCode(
                  ...new Uint8Array(signResult.signedTransaction),
                ),
              ),
            );
          }

          // Send bundle via Jito
          const bundleResponse = await fetch("/api/agents/mint/send-bundle", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "privy-id-token": identityToken,
            },
            body: JSON.stringify({ signedTransactions: signedBundleTxs }),
          });

          if (!bundleResponse.ok) {
            // Fallback to sending individually if bundle fails (skip tip transaction)
            console.log(
              "[Mint] Bundle submission failed, falling back to individual transactions...",
            );
            for (let i = 0; i < bundle.length; i++) {
              // Skip tip transaction in fallback mode
              if (bundle[i].isTip) continue;

              await fetch("/api/agents/mint/send-transaction", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "privy-id-token": identityToken,
                },
                body: JSON.stringify({ signedTransaction: signedBundleTxs[i] }),
              });
            }
          }
        }
      }
      updateStep("feeShare", "complete");

      // Step 3: Create and sign launch transaction
      updateStep("sign", "loading");
      const launchTxResponse = await fetch("/api/agents/mint/launch", {
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

      if (!launchTxResponse.ok) {
        throw new Error(
          (await launchTxResponse.json()).error ||
            "Failed to create transaction",
        );
      }
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

      // Step 4: Broadcast
      updateStep("broadcast", "loading");
      const broadcastResponse = await fetch(
        "/api/agents/mint/send-transaction",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "privy-id-token": identityToken,
          },
          body: JSON.stringify({ signedTransaction: signedLaunchTxBase64 }),
        },
      );

      if (!broadcastResponse.ok) {
        throw new Error(
          (await broadcastResponse.json()).error || "Failed to broadcast",
        );
      }
      const broadcastData = await broadcastResponse.json();
      updateStep("broadcast", "complete");

      // Step 5: Save to database
      updateStep("save", "loading");
      const saveResponse = await fetch("/api/agents/mint/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({
          name: agentName.trim(),
          description: description.trim() || null,
          imageUrl: imageUrl,
          traits: agentTraits,
          tokenMint: metadataData.tokenMint,
          tokenSymbol: tokenSymbol.trim().toUpperCase(),
          tokenMetadata: metadataData.tokenMetadata,
          launchWallet: walletAddress,
          launchSignature: broadcastData.signature,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error(
          (await saveResponse.json()).error || "Failed to save agent",
        );
      }
      const saveData = await saveResponse.json();
      updateStep("save", "complete");

      setLaunchResult({
        tokenMint: metadataData.tokenMint,
        signature: broadcastData.signature,
        agentId: saveData.agent.id,
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

  // Validation
  const canProceedToStep1 = agentTraits !== null && agentName.trim().length > 0;
  const canProceedToStep2 = canProceedToStep1 && imageUrl.length > 0;
  const canLaunch =
    canProceedToStep2 && tokenSymbol.trim().length > 0 && walletAddress;

  // Steps config
  const steps = [
    { title: "Randomize", icon: <Shuffle className="w-4 h-4" /> },
    { title: "Generate Image", icon: <Wand2 className="w-4 h-4" /> },
    { title: "Configure", icon: <Coins className="w-4 h-4" /> },
    { title: "Launch", icon: <Rocket className="w-4 h-4" /> },
  ];

  // Login screen
  if (ready && !authenticated) {
    return (
      <div className="h-screen bg-[#030712] text-white overflow-hidden">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-500/8 rounded-full blur-[120px] pointer-events-none" />
        <Navigation />
        <main className="h-[calc(100vh-72px)] mt-[72px] flex items-center justify-center px-4">
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/30 to-cyan-500/30 blur-xl animate-pulse" />
              <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-purple-500/30 backdrop-blur-sm">
                <Sparkles className="w-12 h-12 text-purple-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight">
              Mint Your Agent
            </h1>
            <p className="text-gray-400 mb-8 text-base max-w-md mx-auto">
              Create a unique AI agent with randomized traits and launch its
              token on Solana
            </p>
            <button
              onClick={login}
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
            >
              Log In to Start
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Success screen
  if (launchResult) {
    return (
      <div className="h-screen bg-[#030712] text-white overflow-hidden">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/8 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <Navigation />
        <main className="h-[calc(100vh-72px)] mt-[72px] flex items-center justify-center px-4 overflow-y-auto">
          <div className="text-center max-w-2xl w-full">
            {/* Success animation */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/40 to-cyan-500/40 blur-2xl animate-pulse" />
              <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/40 backdrop-blur-sm">
                <Check className="w-16 h-16 text-emerald-400" />
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-3">Agent Minted!</h1>
            <p className="text-gray-400 mb-8 text-lg">
              <span className="text-white font-semibold">{agentName}</span> is
              now live on Solana with{" "}
              <span className="text-emerald-400 font-mono font-semibold">
                ${tokenSymbol.toUpperCase()}
              </span>
            </p>

            {/* Agent card */}
            {agentTraits && (
              <div className="max-w-sm mx-auto mb-8">
                <AgentPreviewCard
                  name={agentName}
                  traits={agentTraits}
                  imageUrl={imageUrl}
                />
              </div>
            )}

            {/* Details */}
            <div className="bg-gray-900/60 rounded-2xl p-6 mb-8 text-left border border-gray-800/50 backdrop-blur-sm max-w-lg mx-auto">
              <div className="mb-4">
                <p className="text-gray-500 uppercase tracking-wider text-xs font-semibold mb-2">
                  Token Mint
                </p>
                <p className="font-mono text-sm text-gray-300 bg-gray-800/50 px-3 py-2 rounded-lg truncate">
                  {launchResult.tokenMint}
                </p>
              </div>
              <div>
                <p className="text-gray-500 uppercase tracking-wider text-xs font-semibold mb-2">
                  Transaction
                </p>
                <p className="font-mono text-sm text-gray-300 bg-gray-800/50 px-3 py-2 rounded-lg truncate">
                  {launchResult.signature}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href={`https://bags.fm/${launchResult.tokenMint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold transition-all hover:scale-105"
              >
                View on Bags <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() =>
                  router.push(`/chat?agent=${launchResult.agentId}`)
                }
                className="px-6 py-3 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/60 rounded-xl font-semibold transition-all hover:scale-105"
              >
                Chat with Agent
              </button>
              <button
                onClick={() => {
                  setLaunchResult(null);
                  setCurrentStep(0);
                  setAgentName(generateAgentName());
                  setAgentTraits(generateRandomAgent());
                  setImageUrl("");
                  setTokenSymbol("");
                  setDescription("");
                }}
                className="px-6 py-3 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/60 rounded-xl font-semibold transition-all hover:scale-105"
              >
                Mint Another
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#030712] text-white overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-500/6 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[400px] bg-cyan-500/4 rounded-full blur-[120px] pointer-events-none" />

      <Navigation />

      <main className="h-[calc(100vh-72px)] mt-[72px] px-4 overflow-y-auto">
        <div className="max-w-7xl mx-auto pb-8">
          {/* Header */}
          <div className="text-center pt-6 pb-4">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">
              Mint Your <span className="gradient-text">AI Agent</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base mb-4 max-w-2xl mx-auto">
              Randomize traits, generate a unique AI image, and launch your
              agent&apos;s token on Solana
            </p>
            <StepIndicator currentStep={currentStep} steps={steps} />
          </div>

          {/* Error */}
          {launchError && (
            <div className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
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
                  <h3 className="font-bold text-xl">Minting Agent</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Please approve any wallet prompts
                  </p>
                </div>
                <div className="space-y-3">
                  {launchSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 ${
                        step.status === "loading"
                          ? "bg-purple-500/10 border border-purple-500/30"
                          : step.status === "complete"
                            ? "bg-emerald-500/5 border border-emerald-500/20"
                            : step.status === "error"
                              ? "bg-red-500/10 border border-red-500/30"
                              : "bg-gray-800/30 border border-gray-700/30"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {step.status === "pending" && (
                          <div className="w-6 h-6 rounded-full border-2 border-gray-700 flex items-center justify-center text-gray-600 text-xs font-medium">
                            {index + 1}
                          </div>
                        )}
                        {step.status === "loading" && (
                          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                        )}
                        {step.status === "complete" && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {step.status === "error" && (
                          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          step.status === "loading"
                            ? "text-white"
                            : step.status === "complete"
                              ? "text-emerald-400"
                              : step.status === "error"
                                ? "text-red-400"
                                : "text-gray-500"
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

          {/* Main content grid */}
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Left: Agent preview */}
            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto">
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
            <div className="space-y-4 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-2">
              {/* Step 0: Randomize */}
              {currentStep === 0 && (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="rounded-xl bg-gray-900/50 border border-gray-800/50 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Shuffle className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <h2 className="font-semibold text-sm">
                            Randomize Traits
                          </h2>
                          <p className="text-[10px] text-gray-500">
                            Roll for unique attributes
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={randomizeAgent}
                        disabled={isRandomizing}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg text-white text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50"
                      >
                        {isRandomizing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Shuffle className="w-3.5 h-3.5" />
                        )}
                        Randomize
                      </button>
                    </div>

                    {/* Name input */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                          Agent Name
                        </label>
                        <button
                          onClick={() => toggleLock("name")}
                          className={`p-0.5 rounded transition-colors ${
                            lockedTraits.has("name")
                              ? "text-amber-400"
                              : "text-gray-600 hover:text-gray-400"
                          }`}
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
                          setTokenSymbol(""); // Reset symbol
                        }}
                        className="w-full px-3 py-2 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white font-semibold placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                        placeholder="Enter agent name"
                      />
                    </div>

                    {/* Trait categories */}
                    {agentTraits && (
                      <div className="space-y-3">
                        {/* Personality */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                              Personality
                            </span>
                            <button
                              onClick={() => toggleLock("personality")}
                              className={`p-0.5 rounded transition-colors ${
                                lockedTraits.has("personality")
                                  ? "text-amber-400"
                                  : "text-gray-600 hover:text-gray-400"
                              }`}
                            >
                              {lockedTraits.has("personality") ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div
                            className={`transition-all duration-300 ${
                              isRandomizing && !lockedTraits.has("personality")
                                ? "opacity-50 blur-sm"
                                : ""
                            }`}
                          >
                            {(() => {
                              const p = getPersonalityById(
                                agentTraits.personality,
                              );
                              return p ? (
                                <div
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg border"
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
                                    <p className="text-[10px] text-gray-400">
                                      {p.description}
                                    </p>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>

                        {/* Traits */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                              Traits ({agentTraits.traits.length})
                            </span>
                            <button
                              onClick={() => toggleLock("traits")}
                              className={`p-0.5 rounded transition-colors ${
                                lockedTraits.has("traits")
                                  ? "text-amber-400"
                                  : "text-gray-600 hover:text-gray-400"
                              }`}
                            >
                              {lockedTraits.has("traits") ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div
                            className={`flex flex-wrap gap-1.5 transition-all duration-300 ${
                              isRandomizing && !lockedTraits.has("traits")
                                ? "opacity-50 blur-sm"
                                : ""
                            }`}
                          >
                            {agentTraits.traits.map((id) => {
                              const t = getTraitById(id);
                              return t ? (
                                <TraitPill
                                  key={id}
                                  icon={t.icon}
                                  name={t.name}
                                  size="sm"
                                />
                              ) : null;
                            })}
                          </div>
                        </div>

                        {/* Skills */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                              Skills ({agentTraits.skills.length})
                            </span>
                            <button
                              onClick={() => toggleLock("skills")}
                              className={`p-0.5 rounded transition-colors ${
                                lockedTraits.has("skills")
                                  ? "text-amber-400"
                                  : "text-gray-600 hover:text-gray-400"
                              }`}
                            >
                              {lockedTraits.has("skills") ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div
                            className={`flex flex-wrap gap-1.5 transition-all duration-300 ${
                              isRandomizing && !lockedTraits.has("skills")
                                ? "opacity-50 blur-sm"
                                : ""
                            }`}
                          >
                            {agentTraits.skills.map((id) => {
                              const s = getSkillById(id);
                              return s ? (
                                <TraitPill
                                  key={id}
                                  icon={s.icon}
                                  name={s.name}
                                  size="sm"
                                />
                              ) : null;
                            })}
                          </div>
                        </div>

                        {/* Tools */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                              Tools ({agentTraits.tools.length})
                            </span>
                            <button
                              onClick={() => toggleLock("tools")}
                              className={`p-0.5 rounded transition-colors ${
                                lockedTraits.has("tools")
                                  ? "text-amber-400"
                                  : "text-gray-600 hover:text-gray-400"
                              }`}
                            >
                              {lockedTraits.has("tools") ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div
                            className={`flex flex-wrap gap-1.5 transition-all duration-300 ${
                              isRandomizing && !lockedTraits.has("tools")
                                ? "opacity-50 blur-sm"
                                : ""
                            }`}
                          >
                            {agentTraits.tools.map((id) => {
                              const t = getToolById(id);
                              return t ? (
                                <TraitPill
                                  key={id}
                                  icon={t.icon}
                                  name={t.name}
                                  size="sm"
                                />
                              ) : null;
                            })}
                          </div>
                        </div>

                        {/* Special Ability */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                              Special Ability
                            </span>
                            <button
                              onClick={() => toggleLock("specialAbility")}
                              className={`p-0.5 rounded transition-colors ${
                                lockedTraits.has("specialAbility")
                                  ? "text-amber-400"
                                  : "text-gray-600 hover:text-gray-400"
                              }`}
                            >
                              {lockedTraits.has("specialAbility") ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div
                            className={`transition-all duration-300 ${
                              isRandomizing &&
                              !lockedTraits.has("specialAbility")
                                ? "opacity-50 blur-sm"
                                : ""
                            }`}
                          >
                            {(() => {
                              const a = getSpecialAbilityById(
                                agentTraits.specialAbility,
                              );
                              const rarity = RARITIES[agentTraits.rarity];
                              return a ? (
                                <div
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg border"
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
                                    <p className="text-[10px] text-gray-400">
                                      {a.description}
                                    </p>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => setCurrentStep(1)}
                      disabled={!canProceedToStep1}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
                    >
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 1: Generate Image */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="rounded-xl bg-gray-900/50 border border-gray-800/50 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Wand2 className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-sm">
                          Generate AI Image
                        </h2>
                        <p className="text-[10px] text-gray-500">
                          Create a unique profile picture
                        </p>
                      </div>
                    </div>

                    <div className="text-center py-4">
                      {imageUrl ? (
                        <div className="space-y-3">
                          <div className="relative w-40 h-40 mx-auto rounded-xl overflow-hidden border-2 border-purple-500/30">
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
                            className="flex items-center gap-1.5 px-3 py-1.5 mx-auto bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/60 rounded-lg text-xs font-medium transition-all"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${isGeneratingImage ? "animate-spin" : ""}`}
                            />
                            Regenerate
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-40 h-40 mx-auto rounded-xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center">
                            {isGeneratingImage ? (
                              <div className="text-center">
                                <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-2" />
                                <p className="text-xs text-gray-400">
                                  Generating...
                                </p>
                              </div>
                            ) : (
                              <ImageIcon className="w-12 h-12 text-gray-600" />
                            )}
                          </div>
                          <button
                            onClick={generateImage}
                            disabled={isGeneratingImage}
                            className="flex items-center gap-2 px-5 py-2.5 mx-auto bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-all hover:scale-105"
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

                  {/* Navigation */}
                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep(0)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/60 rounded-lg text-xs font-medium transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(2)}
                      disabled={!canProceedToStep2}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
                    >
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Configure Token */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="rounded-xl bg-gray-900/50 border border-gray-800/50 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-sm">
                          Configure Token
                        </h2>
                        <p className="text-[10px] text-gray-500">
                          Set up token details
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Token Symbol */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">
                          Token Symbol{" "}
                          <span className="text-purple-400">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
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
                            className="w-full pl-7 pr-3 py-2 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white text-sm font-mono uppercase placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                            placeholder="AGENT"
                            maxLength={10}
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">
                          Description{" "}
                          <span className="text-gray-600">(optional)</span>
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
                          placeholder="Describe your agent..."
                          rows={2}
                          maxLength={1000}
                        />
                      </div>

                      {/* Initial Buy */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">
                          Initial Buy Amount
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={initialBuyAmount}
                            onChange={(e) =>
                              setInitialBuyAmount(e.target.value)
                            }
                            className="w-full px-3 py-2 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                            placeholder="0.01"
                            min="0"
                            step="0.01"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">
                            SOL
                          </span>
                        </div>
                      </div>

                      {/* Wallet */}
                      {walletAddress && (
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">
                            Launch Wallet
                          </label>
                          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/70 border border-gray-700/50 rounded-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-mono text-xs text-gray-300">
                              {walletAddress.slice(0, 6)}...
                              {walletAddress.slice(-6)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/60 rounded-lg text-xs font-medium transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      disabled={!tokenSymbol.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
                    >
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Launch */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="rounded-xl bg-gray-900/50 border border-gray-800/50 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Rocket className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-sm">Launch Agent</h2>
                        <p className="text-[10px] text-gray-500">
                          Review and mint on Solana
                        </p>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                        <span className="text-gray-400 text-xs">
                          Agent Name
                        </span>
                        <span className="font-semibold text-sm">
                          {agentName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                        <span className="text-gray-400 text-xs">
                          Token Symbol
                        </span>
                        <span className="font-mono font-semibold text-sm text-purple-400">
                          ${tokenSymbol}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                        <span className="text-gray-400 text-xs">Rarity</span>
                        {agentTraits && (
                          <RarityBadge rarity={agentTraits.rarity} />
                        )}
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                        <span className="text-gray-400 text-xs">
                          Initial Buy
                        </span>
                        <span className="font-semibold text-sm">
                          {parseFloat(initialBuyAmount) > 0
                            ? `${initialBuyAmount} SOL`
                            : "None"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-400 text-xs">Network</span>
                        <span className="flex items-center gap-1.5 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Solana Mainnet
                        </span>
                      </div>
                    </div>

                    {/* Launch button */}
                    <button
                      onClick={handleLaunch}
                      disabled={!canLaunch || isLaunching}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25"
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

                    <p className="text-[10px] text-gray-500 text-center mt-3">
                      Token launched on{" "}
                      <a
                        href="https://bags.fm"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:underline"
                      >
                        Bags.fm
                      </a>
                    </p>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-start">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/60 rounded-lg text-xs font-medium transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
