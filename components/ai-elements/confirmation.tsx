"use client";

/**
 * Confirmation Component
 *
 * Displays tool approval requests and their outcomes in the chat UI.
 * Used with AI SDK's `requireApproval: true` for human-in-the-loop
 * confirmation of wallet operations (transfers, airdrops, etc.).
 *
 * States:
 * - approval-requested: Shows action details + Approve/Reject buttons
 * - approval-responded / output-available: Shows "Approved" badge
 * - output-denied: Shows "Rejected" badge
 */

import { cn } from "@/lib/utils";
import { Check, X, AlertTriangle, Wallet, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HTMLAttributes, ReactNode } from "react";

// ── Root container ──────────────────────────────────────────────────

export interface ConfirmationProps extends HTMLAttributes<HTMLDivElement> {
  /** Current approval state */
  state:
    | "approval-requested"
    | "approval-responded"
    | "output-available"
    | "output-denied";
}

export function Confirmation({
  state,
  className,
  children,
  ...props
}: ConfirmationProps) {
  const isApproved =
    state === "approval-responded" || state === "output-available";
  const isRejected = state === "output-denied";
  const isPending = state === "approval-requested";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 my-2",
        isPending && "border-amber-500/30 bg-amber-500/5",
        isApproved && "border-emerald-500/30 bg-emerald-500/5",
        isRejected && "border-red-500/30 bg-red-500/5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────

export function ConfirmationRequest({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      <div className="flex items-center gap-2 text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">Approval Required</span>
      </div>
      {children}
    </div>
  );
}

export function ConfirmationAccepted({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-2 text-emerald-400", className)}
      {...props}
    >
      <Check className="h-4 w-4" />
      <span className="text-sm font-medium">
        {children || "Approved — executing transaction..."}
      </span>
    </div>
  );
}

export function ConfirmationRejected({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-2 text-red-400", className)}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="text-sm font-medium">
        {children || "Rejected — transaction cancelled."}
      </span>
    </div>
  );
}

export function ConfirmationActions({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2 mt-3", className)} {...props}>
      {children}
    </div>
  );
}

export function ConfirmationAction({
  children,
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "destructive" | "outline";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button size="sm" variant={variant} className={cn(className)} {...props}>
      {children}
    </Button>
  );
}

// ── Wallet-specific confirmation card ───────────────────────────────

interface WalletTransferDetail {
  label: string;
  value: string;
}

export interface WalletConfirmationProps {
  /** The tool name (transferSol, transferToken, batchTransferTokens) */
  toolName: string;
  /** The tool's input arguments */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>;
  /** Current approval state */
  state: ConfirmationProps["state"];
  /** Called when user approves */
  onApprove: () => void;
  /** Called when user rejects */
  onReject: () => void;
}

/** Pre-built confirmation card for wallet transfer operations */
export function WalletConfirmation({
  toolName,
  args,
  state,
  onApprove,
  onReject,
}: WalletConfirmationProps) {
  const isPending = state === "approval-requested";
  const isApproved =
    state === "approval-responded" || state === "output-available";
  const isRejected = state === "output-denied";

  // Build details based on tool type
  const { icon, title, details } = getTransferDetails(toolName, args);

  return (
    <Confirmation state={state}>
      {isPending && (
        <ConfirmationRequest>
          <div className="flex items-center gap-2 mb-2">
            {icon}
            <span className="text-sm font-semibold text-white/90">{title}</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {details.map((d, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-white/50">{d.label}</span>
                <span className="text-white/80 font-mono">{d.value}</span>
              </div>
            ))}
          </div>
          <ConfirmationActions>
            <ConfirmationAction variant="outline" onClick={onReject}>
              <X className="h-3 w-3 mr-1" />
              Reject
            </ConfirmationAction>
            <ConfirmationAction onClick={onApprove}>
              <Check className="h-3 w-3 mr-1" />
              Approve
            </ConfirmationAction>
          </ConfirmationActions>
        </ConfirmationRequest>
      )}

      {isApproved && <ConfirmationAccepted />}
      {isRejected && <ConfirmationRejected />}
    </Confirmation>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

const WALLET_TOOL_NAMES = new Set([
  "transferSol",
  "transferToken",
  "batchTransferTokens",
]);

/** Check if a tool name is a wallet write tool that uses approval */
export function isWalletApprovalTool(toolName: string): boolean {
  return WALLET_TOOL_NAMES.has(toolName);
}

function getTransferDetails(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>,
): { icon: ReactNode; title: string; details: WalletTransferDetail[] } {
  switch (toolName) {
    case "transferSol":
      return {
        icon: <Send className="h-4 w-4 text-amber-400" />,
        title: "Send SOL",
        details: [
          { label: "Amount", value: `${args.amount} SOL` },
          {
            label: "To",
            value: truncateAddress(args.recipient || ""),
          },
        ],
      };

    case "transferToken":
      return {
        icon: <Wallet className="h-4 w-4 text-amber-400" />,
        title: "Send Tokens",
        details: [
          { label: "Amount", value: `${args.amount} tokens` },
          {
            label: "Token",
            value: truncateAddress(args.tokenMint || ""),
          },
          {
            label: "To",
            value: truncateAddress(args.recipient || ""),
          },
        ],
      };

    case "batchTransferTokens": {
      const recipientCount = Array.isArray(args.recipients)
        ? args.recipients.length
        : 0;
      const totalAmount =
        parseFloat(args.amountPerRecipient || "0") * recipientCount;
      return {
        icon: <Users className="h-4 w-4 text-amber-400" />,
        title: "Batch Airdrop",
        details: [
          {
            label: "Per Recipient",
            value: `${args.amountPerRecipient} tokens`,
          },
          { label: "Recipients", value: `${recipientCount}` },
          { label: "Total", value: `${totalAmount} tokens` },
          {
            label: "Token",
            value: truncateAddress(args.tokenMint || ""),
          },
        ],
      };
    }

    default:
      return {
        icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
        title: "Transaction Approval",
        details: Object.entries(args).map(([key, val]) => ({
          label: key,
          value: String(val),
        })),
      };
  }
}

function truncateAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
