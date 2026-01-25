"use client";

import { useState, useEffect } from "react";
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";
import { Bot, Plus, MessageSquare, Trash2, Globe, Lock } from "lucide-react";
import Navigation from "../components/Navigation";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AgentsPage() {
  const { ready, authenticated, login } = usePrivy();
  const { identityToken } = useIdentityToken();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      if (!identityToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/agents", {
          headers: {
            "privy-id-token": identityToken,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch agents");
        }

        const data = await response.json();
        setAgents(data.agents);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agents");
      } finally {
        setIsLoading(false);
      }
    }

    if (ready && authenticated) {
      fetchAgents();
    } else if (ready) {
      setIsLoading(false);
    }
  }, [ready, authenticated, identityToken]);

  const handleDelete = async (agentId: string, agentName: string) => {
    if (!confirm(`Are you sure you want to delete "${agentName}"?`)) {
      return;
    }

    if (!identityToken) return;

    setDeletingId(agentId);

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "DELETE",
        headers: {
          "privy-id-token": identityToken,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete agent");
      }

      setAgents(agents.filter((a) => a.id !== agentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete agent");
    } finally {
      setDeletingId(null);
    }
  };

  // Show login prompt if not authenticated
  if (ready && !authenticated) {
    return (
      <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
        <div className="fixed inset-0 bg-grid opacity-50 pointer-events-none" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
        <Navigation />

        <main className="relative pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-purple-500/30">
              <Bot className="w-10 h-10 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Your AI Agents</h1>
            <p className="text-gray-400 mb-8 max-w-md">
              Log in to view and manage your AI agents
            </p>
            <button
              onClick={login}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Log In to Continue
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-50 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <Navigation />

      <main className="relative pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Your <span className="gradient-text">AI Agents</span>
              </h1>
              <p className="text-gray-400">
                Create and manage your custom AI assistants
              </p>
            </div>
            <Link
              href="/agents/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              Create Agent
            </Link>
          </div>

          {/* Error state */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 mb-6">
              {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && agents.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-purple-500/30">
                <Bot className="w-10 h-10 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No agents yet</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Create your first AI agent to get started. You can customize its
                personality, knowledge, and behavior.
              </p>
              <Link
                href="/agents/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-5 h-5" />
                Create Your First Agent
              </Link>
            </div>
          )}

          {/* Agents grid */}
          {!isLoading && agents.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="group p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-purple-500/30">
                        <Bot className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{agent.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {agent.isPublic ? (
                            <>
                              <Globe className="w-3 h-3" />
                              Public
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              Private
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(agent.id, agent.name)}
                      disabled={deletingId === agent.id}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete agent"
                    >
                      {deletingId === agent.id ? (
                        <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {agent.description && (
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {agent.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/chat?agent=${agent.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-medium hover:bg-purple-500/20 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Start Chat
                    </Link>
                  </div>

                  <p className="text-xs text-gray-600 mt-3">
                    Created{" "}
                    {new Date(agent.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
