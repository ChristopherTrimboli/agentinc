"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  totalRequests: number;
  revokedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface NewKeyResponse extends ApiKey {
  key: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ApiKeysPage() {
  const { authFetch, identityToken } = useAuth();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Newly created key reveal state
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke confirmation state
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!identityToken) return;
    try {
      const res = await authFetch("/api/api-keys");
      if (!res.ok) throw new Error("Failed to load API keys");
      const data = await res.json();
      setKeys(data.keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, identityToken]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setIsCreating(true);
    setError("");
    try {
      const res = await authFetch("/api/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create key");
      }
      const data: NewKeyResponse = await res.json();
      setRevealedKey(data.key);
      setCreateOpen(false);
      setNewKeyName("");
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try {
      const res = await authFetch(`/api/api-keys/${revokeTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke key");
      }
      setRevokeTarget(null);
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setIsRevoking(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (insecure context / denied permission)
    }
  };

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="px-3 py-1 rounded-full bg-[#6FEC06]/10 text-[#6FEC06] text-xs font-medium border border-[#6FEC06]/20">
            API Keys
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          API Keys
        </h1>
        <p className="text-white/50 text-sm max-w-2xl">
          Create and manage API keys for the{" "}
          <code className="text-[#6FEC06]/80 bg-white/5 px-1.5 py-0.5 rounded text-xs">
            @agent-inc/ai-sdk-provider
          </code>{" "}
          SDK. Keys authenticate requests to the{" "}
          <code className="text-white/60 bg-white/5 px-1.5 py-0.5 rounded text-xs">
            /api/v1/chat/completions
          </code>{" "}
          endpoint.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-400/60 hover:text-red-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create button */}
      <div className="mb-6">
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#6FEC06] text-black hover:bg-[#6FEC06]/90 font-medium"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && keys.length === 0 && (
        <div className="text-center py-20 rounded-2xl bg-white/[0.02] border border-white/10">
          <Key className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white/60 mb-2">
            No API keys yet
          </h3>
          <p className="text-white/40 text-sm mb-6 max-w-md mx-auto">
            Create an API key to start using the AgentInc AI SDK provider in
            your applications.
          </p>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#6FEC06] text-black hover:bg-[#6FEC06]/90 font-medium"
          >
            <Plus className="w-4 h-4" />
            Create your first key
          </Button>
        </div>
      )}

      {/* Active keys */}
      {!isLoading && activeKeys.length > 0 && (
        <div className="space-y-3 mb-8">
          {activeKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="group rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#6FEC06]/10 flex items-center justify-center shrink-0">
                    <Key className="w-5 h-5 text-[#6FEC06]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-white truncate">
                      {apiKey.name}
                    </h3>
                    <button
                      onClick={() => copyToClipboard(apiKey.prefix + "...")}
                      className="text-white/40 text-xs font-mono mt-0.5 hover:text-white/60 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Copy key prefix"
                    >
                      {apiKey.prefix}...
                      <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                  <div className="flex flex-col items-end text-xs">
                    <span className="text-white/40">
                      {apiKey.totalRequests.toLocaleString()} req
                    </span>
                    <span className="text-white/30 hidden sm:block">
                      {apiKey.lastUsedAt
                        ? `Used ${timeAgo(apiKey.lastUsedAt)}`
                        : "Never used"}
                    </span>
                  </div>
                  <div className="text-xs text-white/30 hidden sm:block">
                    {timeAgo(apiKey.createdAt)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setRevokeTarget(apiKey)}
                    className="text-white/30 hover:text-red-400 hover:bg-red-500/10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    aria-label={`Revoke ${apiKey.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revoked keys */}
      {!isLoading && revokedKeys.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-white/30 mb-3 uppercase tracking-wider">
            Revoked
          </h2>
          <div className="space-y-2">
            {revokedKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="rounded-xl bg-white/[0.01] border border-white/5 p-4 opacity-50"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <Key className="w-5 h-5 text-white/20" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-white/50 truncate line-through">
                        {apiKey.name}
                      </h3>
                      <p className="text-white/20 text-xs font-mono mt-0.5">
                        {apiKey.prefix}...
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-red-400/60">
                    Revoked {apiKey.revokedAt ? timeAgo(apiKey.revokedAt) : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create key dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#0a0520] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription className="text-white/50">
              Give your key a name so you can identify it later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. My App — Production"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              onKeyDown={(e) =>
                e.key === "Enter" && !isCreating && handleCreate()
              }
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              className="text-white/60"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newKeyName.trim() || isCreating}
              className="bg-[#6FEC06] text-black hover:bg-[#6FEC06]/90 font-medium"
            >
              {isCreating ? "Creating..." : "Create Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key reveal dialog */}
      <Dialog
        open={!!revealedKey}
        onOpenChange={(open) => {
          if (!open) {
            setRevealedKey(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="bg-[#0a0520] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#6FEC06]" />
              API Key Created
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Copy your key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-black/50 border border-[#6FEC06]/20">
              <code className="flex-1 text-sm text-[#6FEC06] break-all font-mono">
                {revealedKey}
              </code>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => revealedKey && copyToClipboard(revealedKey)}
                className="text-white/40 hover:text-[#6FEC06] shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[#6FEC06]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-amber-400/70 mt-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              Store this key securely. It cannot be recovered.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setRevealedKey(null);
                setCopied(false);
              }}
              className="bg-white/10 text-white hover:bg-white/20"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <DialogContent className="bg-[#0a0520] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Revoke API Key</DialogTitle>
            <DialogDescription className="text-white/50">
              Are you sure you want to revoke{" "}
              <span className="text-white font-medium">
                {revokeTarget?.name}
              </span>
              ? Any applications using this key will immediately lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRevokeTarget(null)}
              className="text-white/60"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20"
            >
              {isRevoking ? "Revoking..." : "Revoke Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick start section */}
      {!isLoading && activeKeys.length > 0 && (
        <div className="mt-10 p-6 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white/60">Quick Start</h2>
            <a
              href="https://www.npmjs.com/package/@agent-inc/ai-sdk-provider"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#6FEC06]/60 hover:text-[#6FEC06] transition-colors"
            >
              npm package &rarr;
            </a>
          </div>
          <div className="mb-3">
            <p className="text-xs text-white/30 mb-1.5">Install</p>
            <pre className="text-xs text-white/70 bg-black/30 p-3 rounded-lg overflow-x-auto font-mono">
              <code>npm install @agent-inc/ai-sdk-provider ai</code>
            </pre>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1.5">Usage</p>
            <pre className="text-xs text-white/70 bg-black/30 p-3 rounded-lg overflow-x-auto font-mono leading-relaxed">
              <code>{`import { createAgentInc } from "@agent-inc/ai-sdk-provider";
import { generateText } from "ai";

const agentinc = createAgentInc({
  apiKey: process.env.AGENTINC_API_KEY,
});

const { text } = await generateText({
  model: agentinc("anthropic/claude-haiku-4.6"),
  prompt: "Hello!",
});`}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
