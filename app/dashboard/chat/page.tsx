"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Bot, User, Sparkles, ArrowLeft } from "lucide-react";
import { useRef, useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useIdentityToken } from "@privy-io/react-auth";
import Link from "next/link";

interface AgentInfo {
  id: string;
  name: string;
  description: string | null;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agent");

  const { identityToken } = useIdentityToken();

  const [input, setInput] = useState("");
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [agentLoading, setAgentLoading] = useState(!!agentId);

  // Create transport with agentId and auth headers
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: agentId ? { agentId } : undefined,
        headers: identityToken
          ? { "privy-id-token": identityToken }
          : undefined,
      }),
    [agentId, identityToken],
  );

  const { messages, sendMessage, status } = useChat({
    transport,
  });
  const isLoading = status === "streaming" || status === "submitted";

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch agent info if agentId is provided
  useEffect(() => {
    async function fetchAgentInfo() {
      if (!agentId) {
        setAgentLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/agents/${agentId}`, {
          headers: identityToken
            ? { "privy-id-token": identityToken }
            : undefined,
        });
        if (response.ok) {
          const data = await response.json();
          setAgentInfo(data.agent);
        }
      } catch {
        // Agent not found or error - continue with default
      } finally {
        setAgentLoading(false);
      }
    }

    fetchAgentInfo();
  }, [agentId, identityToken]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const displayName = agentInfo?.name || "Agent Inc.";
  const displayDescription =
    agentInfo?.description ||
    "Ask questions about AI agents, blockchain, and the ERC-8041 standard";

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] lg:h-screen">
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-gray-800/50">
        <div className="max-w-3xl mx-auto">
          {/* Back to agents link if viewing custom agent */}
          {agentId && (
            <Link
              href="/dashboard/agents"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Agents
            </Link>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              {agentLoading ? (
                <div className="h-5 w-32 bg-gray-800/50 rounded animate-pulse" />
              ) : (
                <h1 className="font-semibold">{displayName}</h1>
              )}
              <p className="text-sm text-gray-400 line-clamp-1">{displayDescription}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-purple-500/30">
                <Bot className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-gray-400 mb-6">
                Start a conversation with our AI assistant
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "What is ERC-8041?",
                  "How do AI agents work?",
                  "Explain tokenomics",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 rounded-full border border-gray-700 text-sm text-gray-300 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-purple-500/20 border border-purple-500/30"
                    : "bg-gray-800/50 border border-gray-700/50"
                }`}
              >
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <p
                        key={index}
                        className="text-sm md:text-base whitespace-pre-wrap"
                      >
                        {part.text}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-gray-300" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 lg:p-6 border-t border-gray-800/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            sendMessage({ text: input });
            setInput("");
          }}
          className="max-w-3xl mx-auto flex gap-3 items-center"
        >
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-5 py-4 bg-gray-900/80 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-4 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-center text-xs text-gray-500 mt-3">
          Powered by AI Gateway
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
