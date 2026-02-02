"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  balance: number | null;
  onSendTransaction?: (
    to: string,
    amount: number,
  ) => Promise<{ signature: string }>;
  isLoadingBalance?: boolean;
  onRefreshBalance?: () => void;
  initialTab?: "deposit" | "withdraw";
}

type Tab = "deposit" | "withdraw";

export default function WalletModal({
  isOpen,
  onClose,
  walletAddress,
  balance,
  onSendTransaction,
  isLoadingBalance,
  onRefreshBalance,
  initialTab = "deposit",
}: WalletModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Update active tab when initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [copied, setCopied] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setWithdrawAddress("");
      setWithdrawAmount("");
      setSendError(null);
      setSendSuccess(null);
    }
  }, [isOpen]);

  // Copy address to clipboard
  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [walletAddress]);

  // Format address for display
  const formatAddress = (address: string, chars = 8) => {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  };

  // Format balance
  const formatBalance = (bal: number) => {
    if (bal === 0) return "0";
    if (bal < 0.0001) return "<0.0001";
    if (bal < 1) return bal.toFixed(4);
    if (bal < 100) return bal.toFixed(3);
    return bal.toFixed(2);
  };

  // Handle send transaction
  const handleSend = async () => {
    if (!onSendTransaction) return;

    setSendError(null);
    setSendSuccess(null);

    // Validate address
    if (!withdrawAddress || withdrawAddress.length < 32) {
      setSendError("Please enter a valid Solana address");
      return;
    }

    // Validate amount
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setSendError("Please enter a valid amount");
      return;
    }

    if (balance !== null && amount > balance) {
      setSendError("Insufficient balance");
      return;
    }

    setIsSending(true);
    try {
      const result = await onSendTransaction(withdrawAddress, amount);
      setSendSuccess(result.signature);
      setWithdrawAddress("");
      setWithdrawAmount("");
      onRefreshBalance?.();
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Transaction failed",
      );
    } finally {
      setIsSending(false);
    }
  };

  // Set max amount
  const setMaxAmount = () => {
    if (balance !== null && balance > 0) {
      // Leave a small amount for fees
      const maxAmount = Math.max(0, balance - 0.001);
      setWithdrawAmount(maxAmount.toFixed(6));
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-md bg-[#000028] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <Dialog.Title className="text-lg font-semibold text-white">
              Wallet
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </Dialog.Close>
          </div>

          {/* Balance Display */}
          <div className="p-4 bg-gradient-to-br from-[#120557]/50 to-[#120557]/20 border-b border-white/10">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                Available Balance
              </p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-3xl font-bold text-white tabular-nums">
                  {isLoadingBalance ? (
                    <Loader2 className="w-6 h-6 animate-spin inline" />
                  ) : balance !== null ? (
                    formatBalance(balance)
                  ) : (
                    "—"
                  )}
                </span>
                <span className="text-lg text-white/60 font-medium">SOL</span>
              </div>
              {balance !== null && (
                <p className="text-sm text-white/40 mt-1">
                  ≈ ${(balance * 150).toFixed(2)} USD
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex p-2 gap-2 border-b border-white/10">
            <button
              onClick={() => setActiveTab("deposit")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 ${
                activeTab === "deposit"
                  ? "bg-[#6FEC06]/20 text-[#6FEC06] border border-[#6FEC06]/30"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              Deposit
            </button>
            <button
              onClick={() => setActiveTab("withdraw")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 ${
                activeTab === "withdraw"
                  ? "bg-[#6FEC06]/20 text-[#6FEC06] border border-[#6FEC06]/30"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Withdraw
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === "deposit" ? (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-2xl shadow-lg">
                    <QRCodeSVG
                      value={walletAddress}
                      size={180}
                      level="H"
                      includeMargin={false}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                </div>

                {/* Info Text */}
                <p className="text-center text-sm text-white/50">
                  Scan QR code or copy address below to deposit SOL
                </p>

                {/* Address Box */}
                <div className="bg-[#120557]/30 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">
                        Your Solana Address
                      </p>
                      <p className="font-mono text-sm text-white/80 truncate">
                        {walletAddress}
                      </p>
                    </div>
                    <button
                      onClick={copyAddress}
                      className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-all duration-150 active:scale-95"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-[#10b981]" />
                      ) : (
                        <Copy className="w-5 h-5 text-white/60 hover:text-white" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Full Address (Selectable) */}
                <div className="bg-[#120557]/20 rounded-lg p-3">
                  <p className="font-mono text-xs text-white/60 break-all select-all">
                    {walletAddress}
                  </p>
                </div>

                {/* View on Explorer */}
                <a
                  href={`https://solscan.io/account/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 text-sm text-white/60 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Solscan
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Success Message */}
                {sendSuccess && (
                  <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#10b981]">
                          Transaction sent!
                        </p>
                        <a
                          href={`https://solscan.io/tx/${sendSuccess}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#10b981]/80 hover:text-[#10b981] underline break-all"
                        >
                          View transaction
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {sendError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-400">{sendError}</p>
                    </div>
                  </div>
                )}

                {/* Recipient Address */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full bg-[#120557]/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50 focus:ring-1 focus:ring-[#6FEC06]/50 font-mono text-sm transition-all"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
                    Amount (SOL)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.001"
                      min="0"
                      className="w-full bg-[#120557]/30 border border-white/10 rounded-xl px-4 py-3 pr-16 text-white placeholder-white/30 focus:outline-none focus:border-[#6FEC06]/50 focus:ring-1 focus:ring-[#6FEC06]/50 text-lg font-medium transition-all"
                    />
                    <button
                      onClick={setMaxAmount}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-[#6FEC06] hover:bg-[#6FEC06]/10 rounded-md transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  {balance !== null && (
                    <p className="text-xs text-white/40 mt-1.5">
                      Available: {formatBalance(balance)} SOL
                    </p>
                  )}
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={isSending || !withdrawAddress || !withdrawAmount}
                  className="w-full py-3 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] hover:from-[#9FF24A] hover:to-[#6FEC06] disabled:from-gray-600 disabled:to-gray-700 rounded-xl font-medium text-black disabled:text-white/50 transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      Send SOL
                    </>
                  )}
                </button>

                {/* Warning */}
                <p className="text-center text-xs text-white/40">
                  Make sure you&apos;re sending to a valid Solana address.
                  Transactions cannot be reversed.
                </p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
