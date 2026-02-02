"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  Bot,
  ArrowLeft,
  MessageSquare,
  RefreshCcw,
  Copy,
  Brain,
  ChevronDown,
  Wrench,
} from "lucide-react";
import { useState, useMemo, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";
import Navigation from "../components/Navigation";
import Link from "next/link";

// AI Elements imports
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
} from "@/components/ai-elements/attachments";
import { Loader } from "@/components/ai-elements/loader";
import {
  Sources,
  SourcesContent,
  SourcesTrigger,
  Source,
} from "@/components/ai-elements/sources";

interface AgentInfo {
  id: string;
  name: string;
  description: string | null;
}

// Component to display attachment previews within PromptInput context
function AttachmentsPreview() {
  const { files, remove } = usePromptInputAttachments();

  if (files.length === 0) return null;

  return (
    <PromptInputHeader>
      <Attachments variant="grid" className="gap-2">
        {files.map((file) => (
          <Attachment
            key={file.id}
            data={file}
            onRemove={() => remove(file.id)}
            className="size-20 rounded-lg border border-coral/30 bg-surface overflow-hidden"
          >
            <AttachmentPreview className="size-full" />
            <AttachmentRemove className="bg-surface/90 hover:bg-surface border border-coral/30" />
          </Attachment>
        ))}
      </Attachments>
    </PromptInputHeader>
  );
}

// Streaming cursor indicator
function StreamingCursor() {
  return (
    <span className="inline-flex ml-1">
      <span className="w-2 h-4 bg-coral animate-pulse rounded-sm" />
    </span>
  );
}

// Collapsible reasoning block
function ReasoningBlock({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-lg bg-indigo/20 border border-indigo/30 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo/10 transition-colors"
      >
        <Brain
          className={`w-4 h-4 text-coral ${isStreaming ? "animate-pulse" : ""}`}
        />
        <span className="text-xs uppercase tracking-wider text-coral/70 font-medium">
          {isStreaming ? "Thinking..." : "Reasoning"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground ml-auto transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 text-sm text-muted-foreground italic border-t border-indigo/20 pt-2">
          {text}
          {isStreaming && <StreamingCursor />}
        </div>
      )}
    </div>
  );
}

// Tool call display
function ToolCallBlock({
  toolName,
  args,
  result,
  state,
}: {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  state: "call" | "result" | "partial-call";
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRunning = state === "call" || state === "partial-call";

  return (
    <div className="rounded-lg bg-surface-light border border-border overflow-hidden text-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-lighter transition-colors"
      >
        <Wrench
          className={`w-4 h-4 text-coral ${isRunning ? "animate-spin" : ""}`}
        />
        <span className="font-medium text-foreground">{toolName}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
            isRunning
              ? "bg-coral/20 text-coral"
              : "bg-green-500/20 text-green-400"
          }`}
        >
          {isRunning ? "Running..." : "Complete"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border pt-2 space-y-2">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">
              Input:
            </span>
            <pre className="text-xs bg-surface p-2 rounded overflow-x-auto">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
          {result !== undefined && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1">
                Output:
              </span>
              <pre className="text-xs bg-surface p-2 rounded overflow-x-auto">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agent");

  const { ready, authenticated, login } = usePrivy();
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

  const { messages, sendMessage, status, regenerate, stop } = useChat({
    transport,
  });

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

  // Show login prompt if not authenticated
  if (ready && !authenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <div className="fixed inset-0 bg-grid opacity-50 pointer-events-none" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-coral/10 rounded-full blur-[120px] pointer-events-none" />
        <Navigation />

        <main className="relative pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo to-coral/20 flex items-center justify-center border border-coral/30">
              <Bot className="w-10 h-10 text-coral" />
            </div>
            <h1 className="text-3xl font-bold mb-4 font-display">
              Login Required
            </h1>
            <p className="text-muted-foreground mb-8 max-w-md">
              You need to be logged in to chat with AI agents
            </p>
            <button
              onClick={login}
              className="px-8 py-3 bg-gradient-to-r from-coral to-secondary-light rounded-xl text-black font-semibold hover:opacity-90 transition-opacity"
            >
              Log In to Continue
            </button>
          </div>
        </main>
      </div>
    );
  }

  const displayName = agentInfo?.name || "Agent Inc.";
  const displayDescription =
    agentInfo?.description ||
    "Ask questions about AI agents, blockchain, and the ERC-8041 standard";

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim() && !message.files?.length) return;

    sendMessage({
      text: message.text || "Sent with attachments",
      files: message.files,
    });
    setInput("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-50 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-coral/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-indigo/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation */}
      <Navigation />

      {/* Main Chat Area */}
      <main className="relative flex-1 flex flex-col pt-20">
        <div className="max-w-3xl mx-auto w-full px-4 flex flex-col flex-1">
          {/* Back to agents link if viewing custom agent */}
          {agentId && (
            <Link
              href="/agents"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-coral transition-colors mb-4 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Agents
            </Link>
          )}

          {/* Header */}
          <div className="text-center mb-6 shrink-0">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-coral/30 bg-coral/10 mb-4 backdrop-blur-sm">
              <Bot className="w-4 h-4 text-coral" />
              <span className="text-sm text-coral">
                {agentInfo ? "Custom Agent" : "AI Assistant"}
              </span>
            </div>
            {agentLoading ? (
              <div className="h-10 w-64 mx-auto bg-surface-light rounded-lg animate-pulse mb-2" />
            ) : (
              <h1 className="text-3xl md:text-4xl font-bold mb-2 font-display">
                Chat with <span className="gradient-text">{displayName}</span>
              </h1>
            )}
            <p className="text-muted-foreground">{displayDescription}</p>
          </div>

          {/* Chat Container */}
          <div className="flex-1 flex flex-col min-h-0 mb-4">
            <Conversation className="flex-1 overflow-hidden rounded-2xl border border-border bg-surface/30 backdrop-blur-sm">
              <ConversationContent className="py-6 px-4 gap-6">
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    icon={
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo to-coral/20 flex items-center justify-center border border-coral/30">
                        <MessageSquare className="w-8 h-8 text-coral" />
                      </div>
                    }
                    title="Start a conversation"
                    description="Ask our AI assistant anything"
                  >
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                      {[
                        "What is ERC-8041?",
                        "How do AI agents work?",
                        "Explain tokenomics",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setInput(suggestion)}
                          className="px-4 py-2 rounded-full border border-coral/30 text-sm text-muted-foreground hover:border-coral/60 hover:bg-coral/10 hover:text-coral transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </ConversationEmptyState>
                ) : (
                  messages.map((message, messageIndex) => {
                    const isLastMessage = messageIndex === messages.length - 1;
                    const sourceParts = message.parts.filter(
                      (part) => part.type === "source-url",
                    );

                    return (
                      <div key={message.id}>
                        {/* Sources display for assistant messages */}
                        {message.role === "assistant" &&
                          sourceParts.length > 0 && (
                            <Sources className="mb-2">
                              <SourcesTrigger
                                count={sourceParts.length}
                                className="text-coral"
                              />
                              {sourceParts.map((part, i) => (
                                <SourcesContent
                                  key={`${message.id}-source-${i}`}
                                >
                                  {part.type === "source-url" && (
                                    <Source
                                      href={part.url}
                                      title={part.url}
                                      className="text-coral/80 hover:text-coral"
                                    />
                                  )}
                                </SourcesContent>
                              ))}
                            </Sources>
                          )}

                        <Message
                          from={message.role}
                          className={
                            message.role === "user"
                              ? "[&_.is-user]:bg-indigo/80 [&_.is-user]:border [&_.is-user]:border-coral/30"
                              : ""
                          }
                        >
                          {/* Agent avatar for assistant messages */}
                          {message.role === "assistant" && (
                            <div className="flex items-start gap-3 mb-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral to-secondary-light flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-black" />
                              </div>
                              <span className="text-sm font-medium text-muted-foreground pt-1">
                                {displayName}
                              </span>
                            </div>
                          )}

                          <MessageContent>
                            {message.parts.map((part, i) => {
                              const isLastPart = i === message.parts.length - 1;
                              const isActivelyStreaming =
                                isLastMessage && status === "streaming";

                              switch (part.type) {
                                case "text":
                                  return (
                                    <div
                                      key={`${message.id}-${i}`}
                                      className="relative"
                                    >
                                      <MessageResponse>
                                        {part.text}
                                      </MessageResponse>
                                      {isLastPart && isActivelyStreaming && (
                                        <StreamingCursor />
                                      )}
                                    </div>
                                  );
                                case "reasoning":
                                  return (
                                    <ReasoningBlock
                                      key={`${message.id}-${i}`}
                                      text={part.text}
                                      isStreaming={
                                        isLastPart && isActivelyStreaming
                                      }
                                    />
                                  );
                                default:
                                  // Handle tool calls - type starts with "tool-"
                                  if (part.type.startsWith("tool-")) {
                                    const toolPart = part as {
                                      type: string;
                                      toolCallId: string;
                                      title?: string;
                                      state: string;
                                      input?: unknown;
                                      output?: unknown;
                                    };
                                    return (
                                      <ToolCallBlock
                                        key={`${message.id}-${i}`}
                                        toolName={
                                          toolPart.title ||
                                          toolPart.type.replace("tool-", "")
                                        }
                                        args={
                                          (toolPart.input as Record<
                                            string,
                                            unknown
                                          >) || {}
                                        }
                                        result={toolPart.output}
                                        state={
                                          toolPart.state as
                                            | "call"
                                            | "result"
                                            | "partial-call"
                                        }
                                      />
                                    );
                                  }
                                  return null;
                              }
                            })}
                          </MessageContent>

                          {/* Message actions for last assistant message */}
                          {message.role === "assistant" &&
                            isLastMessage &&
                            status === "ready" && (
                              <MessageActions className="mt-2">
                                <MessageAction
                                  onClick={() => regenerate()}
                                  label="Regenerate"
                                  tooltip="Regenerate response"
                                  className="text-muted-foreground hover:text-coral hover:bg-coral/10"
                                >
                                  <RefreshCcw className="size-3" />
                                </MessageAction>
                                <MessageAction
                                  onClick={() => {
                                    const textPart = message.parts.find(
                                      (p) => p.type === "text",
                                    );
                                    if (textPart && textPart.type === "text") {
                                      copyToClipboard(textPart.text);
                                    }
                                  }}
                                  label="Copy"
                                  tooltip="Copy to clipboard"
                                  className="text-muted-foreground hover:text-coral hover:bg-coral/10"
                                >
                                  <Copy className="size-3" />
                                </MessageAction>
                              </MessageActions>
                            )}
                        </Message>
                      </div>
                    );
                  })
                )}

                {/* Loading state - shows before first content arrives */}
                {status === "submitted" && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral to-secondary-light flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-black" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {displayName}
                      </span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader size={16} className="text-coral" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </ConversationContent>
              <ConversationScrollButton className="bg-surface border-coral/30 text-coral hover:bg-coral/10" />
            </Conversation>
          </div>

          {/* Input Area */}
          <div className="shrink-0 pb-6">
            <PromptInput
              onSubmit={handleSubmit}
              accept="image/*"
              multiple
              globalDrop
            >
              <AttachmentsPreview />
              <PromptInputBody>
                <PromptInputTextarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="bg-surface/80 border-border focus:border-coral/50 focus:ring-coral/20 text-foreground placeholder:text-muted-foreground backdrop-blur-sm"
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger className="text-muted-foreground hover:text-coral hover:bg-coral/10" />
                    <PromptInputActionMenuContent className="bg-popover border-border">
                      <PromptInputActionAddAttachments className="hover:bg-coral/10 hover:text-coral" />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                </PromptInputTools>
                <PromptInputSubmit
                  status={status}
                  onStop={stop}
                  disabled={!input.trim() && status === "ready"}
                  className="bg-coral text-black hover:bg-coral/90 disabled:opacity-50"
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <Loader size={32} className="text-coral" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
