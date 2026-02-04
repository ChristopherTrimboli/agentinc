"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  MoreHorizontal,
  Clock,
  Bot,
  ChevronLeft,
  Loader2,
  History,
  X,
} from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface ChatHistoryItem {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  agentId: string | null;
  agent: {
    id: string;
    name: string;
    imageUrl: string | null;
    rarity: string | null;
    tokenSymbol: string | null;
  } | null;
  lastMessage: {
    content: string;
    role: string;
    createdAt: string;
  } | null;
  messageCount: number;
}

interface ChatHistorySidebarProps {
  currentChatId?: string;
  currentAgentId?: string;
  onNewChat: () => void;
  identityToken?: string | null;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  refreshTrigger?: number; // Increment this to trigger a refresh
}

const rarityColors: Record<string, string> = {
  legendary: "ring-[#FFD700]",
  epic: "ring-[#A855F7]",
  rare: "ring-[#3B82F6]",
  uncommon: "ring-[#6FEC06]",
  common: "ring-white/20",
};

export function ChatHistorySidebar({
  currentChatId,
  currentAgentId,
  onNewChat,
  identityToken,
  collapsed = false,
  onCollapsedChange,
  mobileOpen = false,
  onMobileClose,
  refreshTrigger = 0,
}: ChatHistorySidebarProps) {
  const router = useRouter();
  const [chats, setChats] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch chat history
  const fetchChats = useCallback(async () => {
    if (!identityToken) {
      setLoading(false);
      return;
    }

    try {
      // Show all chats, not filtered by agent - users can see their full history
      const params = new URLSearchParams();
      params.set("limit", "50");

      const response = await fetch(`/api/chats?${params.toString()}`, {
        headers: { "privy-id-token": identityToken },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[ChatHistory] Fetched chats:", data.chats?.length || 0);
        setChats(data.chats || []);
      } else {
        console.error("[ChatHistory] Failed to fetch:", response.status);
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    } finally {
      setLoading(false);
    }
  }, [identityToken]);

  // Fetch on mount and when refreshTrigger changes
  useEffect(() => {
    fetchChats();
  }, [fetchChats, refreshTrigger]);

  // Filter chats by search
  const filteredChats = chats.filter((chat) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      chat.title?.toLowerCase().includes(searchLower) ||
      chat.agent?.name.toLowerCase().includes(searchLower) ||
      chat.lastMessage?.content.toLowerCase().includes(searchLower)
    );
  });

  // Group chats by time periods
  const groupedChats = filteredChats.reduce(
    (acc, chat) => {
      const date = new Date(chat.updatedAt);
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
      );

      let group: string;
      if (diffDays === 0) {
        group = "Today";
      } else if (diffDays === 1) {
        group = "Yesterday";
      } else if (diffDays < 7) {
        group = "This Week";
      } else if (diffDays < 30) {
        group = "This Month";
      } else {
        group = "Older";
      }

      if (!acc[group]) acc[group] = [];
      acc[group].push(chat);
      return acc;
    },
    {} as Record<string, ChatHistoryItem[]>,
  );

  const handleSelectChat = (chatId: string, agentId?: string | null) => {
    const url = `/dashboard/chat?agent=${agentId}&chatId=${chatId}`;
    router.push(url);
    onMobileClose?.();
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!identityToken) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
        headers: { "privy-id-token": identityToken },
      });

      if (response.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (currentChatId === chatId) {
          onNewChat();
        }
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  // Collapsed view (desktop)
  if (collapsed && !mobileOpen) {
    return (
      <div className="hidden lg:flex w-14 shrink-0 flex-col border-r border-white/[0.06] bg-[#000020]/60">
        <div className="p-2 space-y-2">
          <button
            onClick={() => onCollapsedChange?.(false)}
            className="w-full p-2.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all"
            title="Show chat history"
          >
            <History className="w-5 h-5 mx-auto" />
          </button>
          <button
            onClick={onNewChat}
            className="w-full p-2.5 rounded-lg bg-[#6FEC06]/10 hover:bg-[#6FEC06]/20 text-[#6FEC06] transition-all"
            title="New chat"
          >
            <Plus className="w-5 h-5 mx-auto" />
          </button>
        </div>
      </div>
    );
  }

  // Full sidebar content
  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <History className="w-4 h-4" />
            Chat History
          </h2>
          <div className="flex items-center gap-1">
            {/* Mobile close */}
            <button
              onClick={onMobileClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Desktop collapse */}
            <button
              onClick={() => onCollapsedChange?.(true)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all"
              title="Collapse"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New chat button */}
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#6FEC06]/10 hover:bg-[#6FEC06]/20 text-[#6FEC06] text-sm font-medium transition-all border border-[#6FEC06]/20"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>

        {/* Search */}
        {chats.length > 5 && (
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:border-[#6FEC06]/30 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-8 px-2">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-white/20" />
            <p className="text-xs text-white/40">
              {search ? "No chats match your search" : "No chat history yet"}
            </p>
            {!search && (
              <p className="text-[10px] text-white/30 mt-1">
                Start a conversation to see it here
              </p>
            )}
          </div>
        ) : (
          Object.entries(groupedChats).map(([group, groupChats]) => (
            <div key={group}>
              <h3 className="text-[10px] font-medium text-white/30 uppercase tracking-wider px-2 mb-1.5">
                {group}
              </h3>
              <div className="space-y-0.5">
                {groupChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group relative rounded-lg transition-all ${
                      currentChatId === chat.id
                        ? "bg-[#6FEC06]/10 ring-1 ring-[#6FEC06]/30"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <button
                      onClick={() => handleSelectChat(chat.id, chat.agentId)}
                      className="w-full text-left p-2 pr-8"
                    >
                      {/* Agent avatar */}
                      <div className="flex items-start gap-2">
                        <div
                          className={`relative w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 ring-1 ${
                            rarityColors[chat.agent?.rarity || "common"]
                          } bg-[#0a0520]`}
                        >
                          {chat.agent?.imageUrl ? (
                            <Image
                              src={chat.agent.imageUrl}
                              alt={chat.agent.name}
                              fill
                              sizes="28px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Bot className="w-3.5 h-3.5 text-[#6FEC06]/50" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <p
                            className={`text-xs font-medium truncate ${
                              currentChatId === chat.id
                                ? "text-white"
                                : "text-white/70"
                            }`}
                          >
                            {chat.title || chat.agent?.name || "New Chat"}
                          </p>

                          {/* Last message preview */}
                          {chat.lastMessage && (
                            <p className="text-[10px] text-white/40 truncate mt-0.5">
                              {chat.lastMessage.role === "user" ? "You: " : ""}
                              {chat.lastMessage.content}
                            </p>
                          )}

                          {/* Time */}
                          <p className="text-[10px] text-white/30 mt-0.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDistanceToNow(new Date(chat.updatedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Delete button */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {deleteConfirm === chat.id ? (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleDeleteChat(chat.id)}
                            disabled={deleting}
                            className="p-1 rounded text-red-400 hover:bg-red-500/20 text-[10px]"
                          >
                            {deleting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Delete"
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="p-1 rounded text-white/40 hover:bg-white/10 text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(chat.id);
                          }}
                          className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#000020]/60">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col bg-[#000020] border-r border-white/10">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
