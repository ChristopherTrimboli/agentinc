"use client";

import { useState } from "react";
import { ShieldCheck, ExternalLink, Copy, Check, Loader2 } from "lucide-react";

interface Erc8004CardProps {
  agentId: string;
  isMinted: boolean;
  erc8004Asset: string | null;
  erc8004Uri: string | null;
  erc8004RegisteredAt: string | null;
  erc8004AtomEnabled: boolean;
  onRegistered?: () => void;
}

const COLLECTION_PAGE =
  "https://8004market.io/collection/solana/mainnet-beta/bafkreihvfphhye3jom6ewfrlvy4wx7itxmkjc6bjtzrlgfnmfs7dwxc7km";

export default function Erc8004Card({
  agentId,
  isMinted,
  erc8004Asset,
  erc8004Uri,
  erc8004RegisteredAt,
  erc8004AtomEnabled,
  onRegistered,
}: Erc8004CardProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const copyToClipboard = async (text: string, itemId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItem(itemId);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleRegister = async () => {
    setIsRegistering(true);
    setRegisterError(null);
    try {
      const res = await fetch("/api/agents/register-8004", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Registration failed");
      }
      onRegistered?.();
    } catch (err) {
      setRegisterError(
        err instanceof Error ? err.message : "Registration failed",
      );
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isMinted && !erc8004Asset) return null;

  const isRegistered = !!erc8004Asset;

  return (
    <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-[#0a0520] border border-white/10">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <ShieldCheck
          className={`w-4 h-4 sm:w-5 sm:h-5 ${isRegistered ? "text-[#6FEC06]" : "text-white/60"}`}
        />
        <h2 className="text-base sm:text-lg font-semibold font-display">
          8004 Identity
        </h2>
        {isRegistered && erc8004AtomEnabled && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-[#6FEC06]/10 border border-[#6FEC06]/30 text-[10px] sm:text-xs font-semibold text-[#6FEC06]">
            ATOM
          </span>
        )}
      </div>

      {isRegistered ? (
        <div className="space-y-3">
          {/* Asset address */}
          <div>
            <div className="text-[10px] sm:text-xs text-white/40 mb-1">
              Asset Address
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <code className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#120557]/30 rounded-lg text-xs sm:text-sm text-white/80 font-mono truncate overflow-hidden">
                {erc8004Asset}
              </code>
              <button
                onClick={() => copyToClipboard(erc8004Asset!, "8004-asset")}
                className="p-1.5 sm:p-2 rounded-lg bg-[#120557]/30 text-white/60 hover:text-white hover:bg-[#120557]/50 transition-colors shrink-0"
                title="Copy asset address"
              >
                {copiedItem === "8004-asset" ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6FEC06]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Registered date */}
          {erc8004RegisteredAt && (
            <div className="text-xs text-white/50">
              Registered{" "}
              {new Date(erc8004RegisteredAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-2 sm:gap-3 pt-1">
            <a
              href={COLLECTION_PAGE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6FEC06]/10 border border-[#6FEC06]/30 rounded-xl text-[#6FEC06] text-sm font-semibold hover:bg-[#6FEC06]/20 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              8004market
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`https://solscan.io/account/${erc8004Asset}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-semibold hover:bg-white/10 transition-all"
            >
              Solscan
              <ExternalLink className="w-3 h-3" />
            </a>
            {erc8004Uri && (
              <a
                href={erc8004Uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-semibold hover:bg-white/10 transition-all"
              >
                Metadata
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs sm:text-sm text-white/50">
            This agent is not yet registered on the ERC-8004 Solana agent
            registry. Registration gives it on-chain identity and reputation
            tracking.
          </p>
          <button
            onClick={handleRegister}
            disabled={isRegistering}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6FEC06]/10 border border-[#6FEC06]/30 rounded-xl text-[#6FEC06] text-sm font-semibold hover:bg-[#6FEC06]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Register on 8004
              </>
            )}
          </button>
          {registerError && (
            <p className="text-xs text-red-400">{registerError}</p>
          )}
        </div>
      )}
    </div>
  );
}
