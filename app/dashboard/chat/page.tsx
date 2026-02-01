"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Bot, User, ArrowLeft, Sparkles } from "lucide-react";
import { useRef, useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useIdentityToken } from "@privy-io/react-auth";
import Link from "next/link";
import Image from "next/image";

interface AgentInfo {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  personality: string | null;
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
      <div className="p-4 lg:p-6 border-b border-white/10 bg-[#0a0520]/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          {/* Back to agents link if viewing custom agent */}
          {agentId && (
            <Link
              href="/dashboard/agents"
              className="inline-flex items-center gap-2 text-white/40 hover:text-[#6FEC06] transition-colors mb-3 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Agents
            </Link>
          )}

          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-[#6FEC06]/20 to-[#120557]/50 flex items-center justify-center border border-[#6FEC06]/30">
              {agentInfo?.imageUrl ? (
                <Image
                  src={agentInfo.imageUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                />
              ) : (
                <Bot className="w-6 h-6 text-[#6FEC06]" />
              )}
            </div>
            <div>
              {agentLoading ? (
                <div className="h-5 w-32 bg-[#120557]/50 rounded animate-pulse" />
              ) : (
                <h1 className="font-semibold font-display text-lg">{displayName}</h1>
              )}
              <p className="text-sm text-white/50 line-clamp-1">{displayDescription}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#120557] to-[#6FEC06]/20 flex items-center justify-center border border-[#6FEC06]/30 shadow-lg shadow-[#6FEC06]/10">
                {agentInfo?.imageUrl ? (
                  <Image
                    src={agentInfo.imageUrl}
                    alt={displayName}
                    width={80}
                    height={80}
                    className="rounded-2xl object-cover"
                  />
                ) : (
                  <Bot className="w-10 h-10 text-[#6FEC06]" />
                )}
              </div>
              <h2 className="text-xl font-bold mb-2 font-display">Start a conversation</h2>
              <p className="text-white/50 mb-6">
                Chat with {displayName} and explore their capabilities
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
                    className="px-4 py-2 rounded-full border border-[#6FEC06]/30 text-sm text-white/70 hover:border-[#6FEC06]/60 hover:bg-[#6FEC06]/10 hover:text-[#6FEC06] transition-all"
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
                <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-[#6FEC06]/20 to-[#120557]/50 flex items-center justify-center shrink-0 border border-[#6FEC06]/30">
                  {agentInfo?.imageUrl ? (
                    <Image
                      src={agentInfo.imageUrl}
                      alt={displayName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <Bot className="w-4 h-4 text-[#6FEC06]" />
                  )}
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-[#6FEC06]/15 border border-[#6FEC06]/30"
                    : "bg-[#0a0520]/80 border border-white/10"
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
                <div className="w-8 h-8 rounded-lg bg-[#120557]/50 border border-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-white/60" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-[#6FEC06]/20 to-[#120557]/50 flex items-center justify-center shrink-0 border border-[#6FEC06]/30">
                {agentInfo?.imageUrl ? (
                  <Image
                    src={agentInfo.imageUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Bot className="w-4 h-4 text-[#6FEC06]" />
                )}
              </div>
              <div className="bg-[#0a0520]/80 border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#6FEC06] rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-[#6FEC06] rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="w-2 h-2 bg-[#6FEC06] rounded-full animate-bounce"
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
      <div className="p-4 lg:p-6 border-t border-white/10 bg-[#0a0520]/50 backdrop-blur-sm">
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
              className="w-full px-5 py-4 bg-[#0a0520] border border-white/10 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50 focus:ring-2 focus:ring-[#6FEC06]/20 transition-all"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-4 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-2xl text-black font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#6FEC06]/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-center text-xs text-white/30 mt-3 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
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
          <div className="w-8 h-8 border-2 border-[#6FEC06]/30 border-t-[#6FEC06] rounded-full animate-spin" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
