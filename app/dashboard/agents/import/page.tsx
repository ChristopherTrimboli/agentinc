"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  ExternalLink,
  ArrowRight,
  Bot,
  Key,
  Wallet,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface ImportStep {
  id: "input" | "importing" | "success" | "error";
  label: string;
}

const steps: ImportStep[] = [
  { id: "input", label: "Enter Details" },
  { id: "importing", label: "Importing" },
  { id: "success", label: "Complete" },
];

export default function ImportAgentPage() {
  const { authFetch, identityToken } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<ImportStep["id"]>("input");
  const [tokenMint, setTokenMint] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [importedAgent, setImportedAgent] = useState<{
    id: string;
    name: string;
    tokenMint: string;
    tokenSymbol: string;
    rarity: string;
    personality: string;
    imageUrl: string | null;
  } | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identityToken) {
      setError("Please log in to import an agent");
      return;
    }

    setError("");
    setIsImporting(true);
    setCurrentStep("importing");

    try {
      const response = await authFetch("/api/agents/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tokenMint: tokenMint.trim(),
          privateKey: privateKey.trim(),
          walletAddress: walletAddress.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import agent");
      }

      setImportedAgent(data.agent);
      setCurrentStep("success");

      // Clear sensitive data
      setPrivateKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import agent");
      setCurrentStep("error");
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setCurrentStep("input");
    setTokenMint("");
    setPrivateKey("");
    setWalletAddress("");
    setError("");
    setImportedAgent(null);
    setShowPrivateKey(false);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center justify-between mb-6 gap-4">
            <Link
              href="/dashboard/agents"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6FEC06]/50 focus:ring-offset-2 focus:ring-offset-[#000028] rounded-md px-2 py-1 -ml-2"
              aria-label="Return to agents dashboard"
            >
              ← Back to Agents
            </Link>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#6FEC06]/30 bg-[#6FEC06]/10">
              <Download
                className="w-3.5 h-3.5 text-[#6FEC06]"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-[#6FEC06]">
                Import from Bags.fm
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 font-display">
            Import <span className="gradient-text-shimmer">Bags Agent</span>
          </h1>
          <p className="text-white/70 text-base sm:text-lg">
            Import an existing agent token minted on Bags.fm into Agent Inc.
          </p>
        </div>

        {/* Progress Steps */}
        <nav
          className="flex items-center justify-between mb-8 sm:mb-10 gap-2"
          aria-label="Import progress"
          role="progressbar"
          aria-valuenow={
            currentStep === "input" ? 1 : currentStep === "importing" ? 2 : 3
          }
          aria-valuemin={1}
          aria-valuemax={3}
        >
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isComplete =
              steps.findIndex((s) => s.id === currentStep) > index ||
              currentStep === "success";

            return (
              <div key={step.id} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center mb-2 transition-all ${
                      isComplete
                        ? "border-[#6FEC06] bg-[#6FEC06] text-black"
                        : isActive
                          ? "border-[#6FEC06] bg-[#6FEC06]/20 text-[#6FEC06]"
                          : "border-white/20 bg-white/5 text-white/40"
                    }`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {isComplete ? (
                      <CheckCircle2
                        className="w-4 h-4 sm:w-5 sm:h-5"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-medium text-center ${
                      isActive || isComplete ? "text-white" : "text-white/40"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 -mt-7 ${
                      isComplete ? "bg-[#6FEC06]" : "bg-white/10"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </nav>

        {/* Input Form */}
        {currentStep === "input" && (
          <form onSubmit={handleImport} className="space-y-6" noValidate>
            {/* Info Banner */}
            <div
              className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 backdrop-blur-sm"
              role="note"
              aria-live="polite"
            >
              <div className="flex gap-3">
                <Info
                  className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="text-sm text-blue-200 space-y-2">
                  <p className="font-medium text-blue-100">
                    Import your Bags.fm agent
                  </p>
                  <ul className="space-y-1 text-blue-200/90">
                    <li>
                      • You&apos;ll need your token mint address and wallet
                      private key
                    </li>
                    <li>
                      • Your private key is securely imported into Privy and
                      never stored in plain text
                    </li>
                    <li>
                      • The agent will be linked to your Agent Inc. account
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Token Mint Input */}
            <div>
              <label
                htmlFor="token-mint"
                className="block text-sm font-medium text-white/90 mb-2"
              >
                <Bot className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Token Mint Address
              </label>
              <input
                id="token-mint"
                type="text"
                value={tokenMint}
                onChange={(e) => setTokenMint(e.target.value)}
                placeholder="e.g., 6WBynoJreWH4dfayG1Qzrq5PBUstDMUkR1c7mSemBAGS"
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-[#6FEC06]/50 focus:bg-white/10 transition-all font-mono text-sm hover:border-white/20"
                required
                aria-required="true"
                aria-invalid={error && !tokenMint ? "true" : "false"}
                aria-describedby="token-mint-hint"
                autoComplete="off"
              />
              <p id="token-mint-hint" className="text-xs text-white/50 mt-2">
                The Solana token mint address of your Bags agent
              </p>
            </div>

            {/* Wallet Address Input */}
            <div>
              <label
                htmlFor="wallet-address"
                className="block text-sm font-medium text-white/90 mb-2"
              >
                <Wallet className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Wallet Address
              </label>
              <input
                id="wallet-address"
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="e.g., YOUR_WALLET_PUBLIC_ADDRESS"
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-[#6FEC06]/50 focus:bg-white/10 transition-all font-mono text-sm hover:border-white/20"
                required
                aria-required="true"
                aria-invalid={error && !walletAddress ? "true" : "false"}
                aria-describedby="wallet-address-hint"
                autoComplete="off"
              />
              <p
                id="wallet-address-hint"
                className="text-xs text-white/50 mt-2"
              >
                The wallet address that minted the token
              </p>
            </div>

            {/* Private Key Input */}
            <div>
              <label
                htmlFor="private-key"
                className="block text-sm font-medium text-white/90 mb-2"
              >
                <Key className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Private Key (Base58)
              </label>
              <div className="relative">
                <input
                  id="private-key"
                  type={showPrivateKey ? "text" : "password"}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Paste your base58-encoded private key here..."
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/5 border-2 border-red-500/20 text-white placeholder:text-white/40 focus:outline-none focus:border-[#6FEC06]/50 focus:bg-white/10 transition-all font-mono text-sm hover:border-red-500/30"
                  required
                  aria-required="true"
                  aria-invalid={error && !privateKey ? "true" : "false"}
                  aria-describedby="private-key-hint private-key-security"
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6FEC06]/50"
                  aria-label={
                    showPrivateKey ? "Hide private key" : "Show private key"
                  }
                >
                  {showPrivateKey ? (
                    <EyeOff
                      className="w-4 h-4 text-white/60"
                      aria-hidden="true"
                    />
                  ) : (
                    <Eye className="w-4 h-4 text-white/60" aria-hidden="true" />
                  )}
                </button>
              </div>
              <div className="mt-2 space-y-1">
                <p id="private-key-hint" className="text-xs text-white/50">
                  Your private key will be securely stored in Privy&apos;s
                  encrypted wallet infrastructure
                </p>
                <p
                  id="private-key-security"
                  className="text-xs text-red-400/80 font-medium"
                >
                  ⚠️ Never share your private key with anyone
                </p>
              </div>
            </div>

            {/* Error Display */}
            {error && currentStep === "input" && (
              <div
                className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 text-red-300 backdrop-blur-sm"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex gap-3">
                  <AlertCircle
                    className="w-5 h-5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                isImporting || !tokenMint || !privateKey || !walletAddress
              }
              className="w-full px-6 py-4 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-full text-black font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#6FEC06]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#6FEC06] focus:ring-offset-2 focus:ring-offset-[#000028]"
              aria-busy={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2
                    className="w-5 h-5 animate-spin"
                    aria-hidden="true"
                  />
                  Importing...
                </>
              ) : (
                <>
                  Import Agent
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </>
              )}
            </button>

            {/* Help Link */}
            <div className="text-center">
              <a
                href="https://bags.fm"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white/90 transition-colors focus:outline-none focus:underline"
              >
                Don&apos;t have a Bags agent? Create one
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="sr-only">(opens in new tab)</span>
              </a>
            </div>
          </form>
        )}

        {/* Importing State */}
        {currentStep === "importing" && (
          <div
            className="text-center py-16 sm:py-20"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#120557] to-[#6FEC06]/20 flex items-center justify-center border border-[#6FEC06]/30 shadow-lg shadow-[#6FEC06]/20 animate-pulse">
              <Download
                className="w-10 h-10 text-[#6FEC06]"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-2xl font-bold mb-3 font-display">
              Importing your agent...
            </h2>
            <div className="max-w-md mx-auto space-y-3 text-white/70">
              <div className="flex items-center gap-3 justify-center">
                <Loader2
                  className="w-4 h-4 animate-spin text-[#6FEC06]"
                  aria-hidden="true"
                />
                <p>Fetching on-chain metadata</p>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <Loader2
                  className="w-4 h-4 animate-spin text-[#6FEC06]"
                  aria-hidden="true"
                />
                <p>Importing wallet into Privy</p>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <Loader2
                  className="w-4 h-4 animate-spin text-[#6FEC06]"
                  aria-hidden="true"
                />
                <p>Creating agent profile</p>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {currentStep === "success" && importedAgent && (
          <div className="text-center py-12" role="status" aria-live="polite">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#6FEC06] to-[#4a9f10] flex items-center justify-center shadow-lg shadow-[#6FEC06]/40 animate-scale-up">
              <CheckCircle2
                className="w-10 h-10 text-black"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 font-display">
              Agent Imported Successfully!
            </h2>
            <p className="text-white/70 mb-8">
              Your Bags agent has been imported into Agent Inc.
            </p>

            {/* Agent Preview Card */}
            <div className="max-w-md mx-auto mb-8 rounded-2xl bg-[#0a0520] border-2 border-[#6FEC06]/30 overflow-hidden shadow-xl shadow-[#6FEC06]/10 hover:shadow-2xl hover:shadow-[#6FEC06]/20 transition-all">
              {importedAgent.imageUrl && (
                <div className="relative aspect-square bg-gradient-to-br from-[#120557]/50 to-[#000028]">
                  <Image
                    src={importedAgent.imageUrl}
                    alt={`${importedAgent.name} avatar`}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 font-display">
                  {importedAgent.name}
                </h3>
                <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-[#6FEC06]/20 text-[#6FEC06] text-xs font-semibold border border-[#6FEC06]/30">
                    {importedAgent.tokenSymbol}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30 uppercase">
                    {importedAgent.rarity}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                    {importedAgent.personality}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <Link
                href={`/agent/${importedAgent.tokenMint}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-full text-black font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#6FEC06]/25 focus:outline-none focus:ring-2 focus:ring-[#6FEC06] focus:ring-offset-2 focus:ring-offset-[#000028]"
              >
                View Agent Profile
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard/agents"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 border-2 border-white/10 rounded-full text-white hover:bg-white/10 hover:border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-[#6FEC06]/50 focus:ring-offset-2 focus:ring-offset-[#000028]"
              >
                Back to Agents
              </Link>
            </div>

            <button
              onClick={reset}
              className="mt-6 text-sm text-white/60 hover:text-white/90 transition-colors underline focus:outline-none focus:ring-2 focus:ring-[#6FEC06]/50 rounded px-2 py-1"
            >
              Import another agent
            </button>
          </div>
        )}

        {/* Error State */}
        {currentStep === "error" && (
          <div className="text-center py-12" role="alert" aria-live="assertive">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center border-2 border-red-500/30 shadow-lg shadow-red-500/10">
              <AlertCircle
                className="w-10 h-10 text-red-400"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-2xl font-bold mb-3 font-display">
              Import Failed
            </h2>
            <p className="text-red-300 mb-8 max-w-md mx-auto font-medium">
              {error}
            </p>

            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/5 border-2 border-white/10 rounded-full text-white hover:bg-white/10 hover:border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-[#6FEC06]/50 focus:ring-offset-2 focus:ring-offset-[#000028]"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
