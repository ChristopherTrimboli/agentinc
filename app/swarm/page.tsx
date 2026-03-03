"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import Navigation from "../components/Navigation";
import NetworkDetails from "../components/network/NetworkDetails";
import NetworkControls from "../components/network/NetworkControls";
import type {
  NetworkData,
  NetworkCollection,
  NetworkAgent,
} from "@/lib/network/types";

const NetworkCanvas = lazy(() => import("../components/network/NetworkCanvas"));

export default function SwarmPage() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCollection, setSelectedCollection] =
    useState<NetworkCollection | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<NetworkAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canvasResetRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/8004/network");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const json: NetworkData = await res.json();
        setData(json);
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

  // Escape to deselect
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const totalAgents = data
    ? data.collections.reduce((s, c) => s + c.agents.length, 0)
    : 0;

  return (
    <div className="h-screen w-screen bg-[#030712] text-white overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-violet-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-cyan-500/[0.02] rounded-full blur-[100px]" />
      </div>

      <Navigation />

      {/* Canvas */}
      <div className="fixed inset-0 top-[72px]">
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
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading 8004 network...</p>
            <p className="text-gray-600 text-xs mt-1">
              Fetching collections &amp; agents from the indexer
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-20">
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

      {/* Empty state */}
      {data && data.collections.length === 0 && !isLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-20">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No Collections Found
            </h3>
            <p className="text-gray-400 text-sm">
              The 8004 network has no registered collections yet.
            </p>
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
          onReset={() => canvasResetRef.current?.()}
          totalAgentsLoaded={totalAgents}
          totalCollectionsLoaded={data.collections.length}
        />
      )}

      {/* Title badge (top-left) */}
      {data && !isLoading && (
        <div className="fixed top-[88px] left-4 z-30">
          <div className="bg-gray-900/90 backdrop-blur-lg border border-gray-700 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-white">8004 Network</span>
            </div>
            <p className="text-[10px] text-gray-500 mb-1.5">
              Solana AI Agent Registry — Mainnet
            </p>
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
