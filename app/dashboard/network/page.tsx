"use client";

import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import NetworkDetails from "../../components/network/NetworkDetails";
import NetworkControls from "../../components/network/NetworkControls";
import type {
  NetworkData,
  NetworkCollection,
  NetworkAgent,
} from "@/lib/network/types";

const NetworkCanvas = lazy(
  () => import("../../components/network/NetworkCanvas"),
);

export default function NetworkPage() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCollection, setSelectedCollection] =
    useState<NetworkCollection | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<NetworkAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/8004/network");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        setData(await res.json());
      } catch (err) {
        console.error("[8004 Network] Fetch failed:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load network data",
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSelectCollection = useCallback((c: NetworkCollection | null) => {
    setSelectedCollection(c);
    setSelectedAgent(null);
  }, []);

  const handleSelectAgent = useCallback((a: NetworkAgent | null) => {
    setSelectedAgent(a);
    setSelectedCollection(null);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedCollection(null);
    setSelectedAgent(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const loadedAgents = data
    ? data.collections.reduce((s, c) => s + c.agents.length, 0)
    : 0;
  const totalAgents = data
    ? Math.max(data.stats?.totalAgents ?? 0, loadedAgents)
    : 0;

  const networkMetrics = data
    ? (() => {
        const agents = data.collections.flatMap((c) => c.agents);
        const verified = agents.filter(
          (a) => a.verification?.status === "verified",
        ).length;
        const partial = agents.filter(
          (a) => a.verification?.status === "partial",
        ).length;
        const unverified = agents.filter(
          (a) => !a.verification || a.verification.status === "unverified",
        ).length;
        const withFeedback = agents.filter((a) => a.feedbackCount > 0).length;
        const atomEnabled = agents.filter((a) => a.atomEnabled).length;
        return { verified, partial, unverified, withFeedback, atomEnabled };
      })()
    : null;

  return (
    <div className="fixed inset-0 lg:left-64 bg-[#030712] text-white overflow-hidden">
      {/* Ambient effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-violet-500/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* Canvas */}
      {data && !isLoading && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full text-zinc-500">
              Initializing visualization...
            </div>
          }
        >
          <NetworkCanvas
            data={data}
            searchQuery={searchQuery}
            onSelectCollection={handleSelectCollection}
            onSelectAgent={handleSelectAgent}
            selectedCollectionId={selectedCollection?.id ?? null}
            selectedAgentAsset={selectedAgent?.asset ?? null}
          />
        </Suspense>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading 8004 network...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Network Unavailable
            </h3>
            <p className="text-gray-400 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Details panel */}
      <NetworkDetails
        collection={selectedCollection}
        agent={selectedAgent}
        onClose={handleClose}
      />

      {/* Controls bar */}
      {data && !error && (
        <NetworkControls
          stats={data.stats}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onReset={() => window.location.reload()}
          totalAgentsLoaded={totalAgents}
          totalCollectionsLoaded={data.collections.length}
        />
      )}

      {/* Title badge + network metrics */}
      {data && !isLoading && (
        <div className="absolute top-4 left-4 z-30">
          <div className="bg-gray-900/90 backdrop-blur-lg border border-gray-700 rounded-xl px-4 py-3 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-white">8004 Network</span>
            </div>
            <p className="text-[10px] text-gray-500 mb-2.5">
              Solana AI Agent Registry — Mainnet
            </p>

            {/* Metrics grid */}
            {networkMetrics && (
              <div className="space-y-1.5 mb-2.5 pt-2.5 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-gray-400">Verified</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400">
                    {networkMetrics.verified}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="text-[10px] text-gray-400">Partial</span>
                  </div>
                  <span className="text-[10px] font-semibold text-yellow-400">
                    {networkMetrics.partial}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="text-[10px] text-gray-400">
                      Unverified
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-red-400">
                    {networkMetrics.unverified}
                  </span>
                </div>
                <div className="pt-1.5 mt-1.5 border-t border-gray-800/50 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">
                    Total Agents
                  </span>
                  <span className="text-[10px] font-semibold text-white">
                    {totalAgents}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Collections</span>
                  <span className="text-[10px] font-semibold text-white">
                    {data.collections.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">
                    With Feedback
                  </span>
                  <span className="text-[10px] font-semibold text-white">
                    {networkMetrics.withFeedback}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">
                    ATOM Enabled
                  </span>
                  <span className="text-[10px] font-semibold text-violet-400">
                    {networkMetrics.atomEnabled}
                  </span>
                </div>
              </div>
            )}

            {/* Verification rate bar */}
            {networkMetrics && totalAgents > 0 && (
              <div className="mb-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500">
                    Slop-o-Meter
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {Math.round(
                      ((networkMetrics.verified + networkMetrics.partial) /
                        totalAgents) *
                        100,
                    )}
                    % active
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 rounded-l-full"
                    style={{
                      width: `${(networkMetrics.verified / totalAgents) * 100}%`,
                    }}
                  />
                  <div
                    className="h-full bg-yellow-500"
                    style={{
                      width: `${(networkMetrics.partial / totalAgents) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <a
              href="https://8004market.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              Powered by{" "}
              <span className="text-gray-400 font-medium">8004market.io</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
