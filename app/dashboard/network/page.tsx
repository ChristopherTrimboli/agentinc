"use client";

import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NetworkDetails from "../../components/network/NetworkDetails";
import NetworkControls from "../../components/network/NetworkControls";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { usePublicFetch } from "@/lib/hooks/useFetch";
import type {
  NetworkData,
  NetworkCollection,
  NetworkAgent,
} from "@/lib/network/types";

const NetworkCanvas = lazy(
  () => import("../../components/network/NetworkCanvas"),
);

function MetricRow({
  dotColor,
  label,
  value,
  valueColor,
}: {
  dotColor?: string;
  label: string;
  value: number;
  valueColor: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {dotColor && <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
        <span className="text-[10px] text-gray-500">{label}</span>
      </div>
      <span className={`text-[10px] font-semibold tabular-nums ${valueColor}`}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

export default function NetworkPage() {
  const {
    data,
    error: fetchError,
    isLoading,
  } = usePublicFetch<NetworkData>("/api/8004/network");
  const error = fetchError?.message ?? null;

  const [selectedCollection, setSelectedCollection] =
    useState<NetworkCollection | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<NetworkAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
        <ErrorBoundary>
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
        </ErrorBoundary>
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
      <AnimatePresence>
        {data && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
            className="absolute top-4 right-4 lg:right-auto lg:left-4 z-30"
          >
            <div className="bg-[#0a1120]/90 backdrop-blur-2xl border border-white/[0.07] rounded-2xl px-4 py-3.5 min-w-0 sm:min-w-[210px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 mb-1">
                <div className="relative flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div className="absolute w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                </div>
                <span className="text-sm font-bold text-white tracking-tight">
                  8004-solana
                </span>
              </div>
              <p className="hidden sm:block text-[10px] text-gray-600 mb-3">
                Solana AI Agent Registry — Mainnet
              </p>

              {/* Metrics grid */}
              {networkMetrics && (
                <div className="hidden sm:block space-y-1.5 mb-3 pt-3 border-t border-white/[0.06]">
                  <MetricRow
                    dotColor="bg-emerald-400"
                    label="Verified"
                    value={networkMetrics.verified}
                    valueColor="text-emerald-400"
                  />
                  <MetricRow
                    dotColor="bg-yellow-400"
                    label="Partial"
                    value={networkMetrics.partial}
                    valueColor="text-yellow-400"
                  />
                  <MetricRow
                    dotColor="bg-red-400"
                    label="Unverified"
                    value={networkMetrics.unverified}
                    valueColor="text-red-400"
                  />
                  <div className="pt-2 mt-2 border-t border-white/[0.04] space-y-1.5">
                    <MetricRow
                      label="Total Agents"
                      value={totalAgents}
                      valueColor="text-white"
                    />
                    <MetricRow
                      label="Collections"
                      value={data.collections.length}
                      valueColor="text-white"
                    />
                    <MetricRow
                      label="With Feedback"
                      value={networkMetrics.withFeedback}
                      valueColor="text-white"
                    />
                    <MetricRow
                      label="ATOM Enabled"
                      value={networkMetrics.atomEnabled}
                      valueColor="text-violet-400"
                    />
                  </div>
                </div>
              )}

              {/* Verification rate bar */}
              {networkMetrics && totalAgents > 0 && (
                <div className="hidden sm:block mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-gray-600">
                      Slop-o-Meter
                    </span>
                    <span className="text-[10px] text-gray-500 tabular-nums">
                      {Math.round(
                        ((networkMetrics.verified + networkMetrics.partial) /
                          totalAgents) *
                          100,
                      )}
                      % active
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden flex">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(networkMetrics.verified / totalAgents) * 100}%`,
                      }}
                      transition={{
                        duration: 0.8,
                        ease: "easeOut",
                        delay: 0.3,
                      }}
                      className="h-full bg-emerald-500 rounded-l-full"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(networkMetrics.partial / totalAgents) * 100}%`,
                      }}
                      transition={{
                        duration: 0.8,
                        ease: "easeOut",
                        delay: 0.5,
                      }}
                      className="h-full bg-yellow-500"
                    />
                  </div>
                </div>
              )}

              <a
                href="https://8004market.io"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:block text-[10px] text-gray-700 hover:text-gray-400 transition-colors duration-200"
              >
                Powered by{" "}
                <span className="text-gray-500 font-medium">8004market.io</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
