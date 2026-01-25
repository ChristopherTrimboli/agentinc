"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";
import { Bot, Sparkles, ArrowLeft, Wand2 } from "lucide-react";
import Navigation from "../../components/Navigation";
import Link from "next/link";

export default function CreateAgentPage() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const { identityToken } = useIdentityToken();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identityToken) {
      setError("Please log in to create an agent");
      return;
    }

    if (!name.trim()) {
      setError("Agent name is required");
      return;
    }

    if (!systemPrompt.trim()) {
      setError("System prompt is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          systemPrompt: systemPrompt.trim(),
          isPublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create agent");
      }

      // Redirect to chat with the new agent
      router.push(`/chat?agent=${data.agent.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setIsLoading(false);
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
            <h1 className="text-3xl font-bold mb-4">Login Required</h1>
            <p className="text-gray-400 mb-8 max-w-md">
              You need to be logged in to create your own AI agent
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
        <div className="max-w-2xl mx-auto">
          {/* Back link */}
          <Link
            href="/agents"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Agents
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-4 backdrop-blur-sm">
              <Wand2 className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Create Agent</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Build Your <span className="gradient-text">AI Agent</span>
            </h1>
            <p className="text-gray-400">
              Configure your agent&apos;s personality and capabilities
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                {error}
              </div>
            )}

            {/* Agent Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Agent Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marketing Genius, Code Assistant"
                className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                disabled={isLoading}
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Description{" "}
                <span className="text-gray-500">(optional, visible to others)</span>
              </label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of what this agent does"
                className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                disabled={isLoading}
              />
            </div>

            {/* System Prompt */}
            <div>
              <label
                htmlFor="systemPrompt"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                System Prompt *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                This defines your agent&apos;s personality, behavior, and
                instructions. Be specific about how the agent should respond.
              </p>
              <textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder={`You are a helpful AI assistant specialized in...

Key behaviors:
- Always be concise and clear
- Use examples when explaining concepts
- Ask clarifying questions when needed

Your expertise includes:
- ...`}
                rows={10}
                className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none font-mono text-sm"
                disabled={isLoading}
              />
            </div>

            {/* Public toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isPublic ? "bg-purple-500" : "bg-gray-700"
                }`}
                disabled={isLoading}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    isPublic ? "left-7" : "left-1"
                  }`}
                />
              </button>
              <div>
                <span className="text-sm font-medium text-gray-300">
                  Make Public
                </span>
                <p className="text-xs text-gray-500">
                  Allow others to chat with your agent
                </p>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !systemPrompt.trim()}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Agent...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Agent & Start Chatting
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
