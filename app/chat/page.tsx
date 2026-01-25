"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import Navigation from "../components/Navigation";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });
  const isLoading = status === "streaming" || status === "submitted";

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-50 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation */}
      <Navigation />

      {/* Main Chat Area */}
      <main className="relative pt-24 pb-32 px-4 min-h-screen">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-4 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-sm text-purple-300">AI Assistant</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Chat with <span className="gradient-text">Agent Inc.</span>
            </h1>
            <p className="text-gray-400">
              Ask questions about AI agents, blockchain, and the ERC-8041
              standard
            </p>
          </div>

          {/* Messages Container */}
          <div className="space-y-4 mb-4">
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
      </main>

      {/* Fixed Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#030712] via-[#030712] to-transparent pt-8 pb-6 px-4">
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
              className="w-full px-5 py-4 bg-gray-900/80 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all backdrop-blur-sm"
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
