"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Bot,
  Sparkles,
  Network,
  MessageSquare,
  Menu,
  X,
  ChevronLeft,
  Home,
} from "lucide-react";
import LoginButton from "./LoginButton";

const navItems = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: Home,
    exact: true,
  },
  {
    href: "/dashboard/agents",
    label: "My Agents",
    icon: Bot,
  },
  {
    href: "/dashboard/mint",
    label: "Mint Agent",
    icon: Sparkles,
    highlight: true,
  },
  {
    href: "/dashboard/incorporate",
    label: "Incorporate",
    icon: Building2,
  },
  {
    href: "/dashboard/network",
    label: "Network",
    icon: Network,
  },
  {
    href: "/dashboard/chat",
    label: "Chat",
    icon: MessageSquare,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact || href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-[#000028]/90 border border-white/10 backdrop-blur-sm hover:bg-[#120557]/50 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#000104]/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-[#000028]/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col
          ${isCollapsed ? "w-20" : "w-64"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f48f8e] to-[#120557] flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-bold whitespace-nowrap">Agent Inc.</span>
            )}
          </Link>
          
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 hover:bg-[#120557]/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href, 'exact' in item ? item.exact : false);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                  active
                    ? "bg-[#f48f8e]/15 text-white"
                    : item.highlight
                      ? "text-[#f48f8e] hover:bg-[#f48f8e]/10 hover:text-[#f7a8a7]"
                      : "text-white/60 hover:bg-[#120557]/30 hover:text-white"
                }`}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#f48f8e] to-[#120557] rounded-r-full" />
                )}
                
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-[#f48f8e]" : ""}`} />
                
                {!isCollapsed && (
                  <span className={`font-medium text-sm ${item.highlight && !active ? "text-[#f48f8e]" : ""}`}>
                    {item.label}
                  </span>
                )}
                
                {item.highlight && !isCollapsed && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#f48f8e]/20 text-[#f48f8e] rounded">
                    New
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle - desktop only */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center p-2 mx-3 mb-2 rounded-lg hover:bg-[#120557]/30 text-white/40 hover:text-white transition-colors"
        >
          <ChevronLeft className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} />
        </button>

        {/* User section */}
        <div className="p-3 border-t border-white/10">
          {isCollapsed ? (
            <div className="flex justify-center">
              <LoginButton className="!p-2 !px-2" />
            </div>
          ) : (
            <LoginButton fullWidth />
          )}
        </div>
      </aside>

      {/* Spacer for main content */}
      <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`} />
    </>
  );
}
