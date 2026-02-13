"use client";

import { useState } from "react";
import { Check, Wallet, ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useUserWallets } from "@/lib/hooks/useUserWallets";

interface WalletSwitcherProps {
  onWalletChange?: (walletAddress: string) => void;
}

export default function WalletSwitcher({
  onWalletChange,
}: WalletSwitcherProps) {
  const { wallets, activeWallet, setActiveWallet, isLoading } =
    useUserWallets();
  const [isOpen, setIsOpen] = useState(false);

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Handle wallet selection
  const handleSelectWallet = async (walletId: string, address: string) => {
    const success = await setActiveWallet(walletId);
    if (success) {
      onWalletChange?.(address);
      setIsOpen(false);
    }
  };

  // Don't show if no wallets or only one wallet
  if (isLoading || wallets.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#120557]/40 rounded-lg transition-all duration-150 group outline-none cursor-pointer">
          <Wallet className="w-4 h-4 text-white/40 group-hover:text-white/70" />
          <div className="flex-1 text-left min-w-0">
            <span className="text-sm text-white/70 group-hover:text-white">
              Switch Wallet
            </span>
            {activeWallet && (
              <p className="text-xs text-white/40 font-mono">
                {formatAddress(activeWallet.address)}
              </p>
            )}
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[280px] bg-[#000028]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-[9999] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          sideOffset={8}
          align="end"
        >
          <div className="p-2">
            <div className="px-3 py-2 mb-1">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                Your Wallets
              </p>
            </div>

            {wallets.map((wallet) => {
              const isActive = wallet.id === activeWallet?.id;
              return (
                <DropdownMenu.Item key={wallet.id} asChild>
                  <button
                    onClick={() =>
                      handleSelectWallet(wallet.id, wallet.address)
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 outline-none cursor-pointer ${
                      isActive
                        ? "bg-[#6FEC06]/20 border border-[#6FEC06]/30"
                        : "hover:bg-[#120557]/40"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive
                          ? "bg-[#6FEC06]/30"
                          : "bg-gradient-to-br from-[#6FEC06]/20 to-[#120557]/20"
                      }`}
                    >
                      {isActive ? (
                        <Check className="w-4 h-4 text-[#6FEC06]" />
                      ) : (
                        <Wallet className="w-4 h-4 text-white/60" />
                      )}
                    </div>

                    {/* Wallet Info */}
                    <div className="flex-1 text-left min-w-0">
                      {wallet.label && (
                        <p
                          className={`text-sm font-medium mb-0.5 ${
                            isActive ? "text-[#6FEC06]" : "text-white/80"
                          }`}
                        >
                          {wallet.label}
                        </p>
                      )}
                      <p
                        className={`text-xs font-mono ${
                          isActive ? "text-[#6FEC06]/80" : "text-white/50"
                        }`}
                      >
                        {formatAddress(wallet.address)}
                      </p>
                      {wallet.importedFrom && (
                        <p className="text-[10px] text-white/30 mt-0.5">
                          From {wallet.importedFrom}
                        </p>
                      )}
                    </div>
                  </button>
                </DropdownMenu.Item>
              );
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
