"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
          <Link href="/" className="group flex items-center relative h-10 overflow-hidden">
            {/* Square icon - shown when collapsed */}
            <Image
              src="/agentinc-square.png"
              alt="Agent Inc."
              width={40}
              height={40}
              className={`h-10 w-10 flex-shrink-0 transition-all duration-300 group-hover:scale-[1.02] ${
                isCollapsed 
                  ? "opacity-100 scale-100" 
                  : "opacity-0 scale-90 absolute"
              }`}
            />
            {/* Full logo - shown when expanded */}
            <Image
              src="/agentinc.svg"
              alt="Agent Inc."
              width={240}
              height={64}
              className={`h-10 w-auto flex-shrink-0 transition-all duration-300 group-hover:scale-[1.02] ${
                isCollapsed 
                  ? "opacity-0 scale-90 absolute" 
                  : "opacity-100 scale-100"
              }`}
            />
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
        <nav className={`flex-1 overflow-y-auto ${isCollapsed ? "px-2 py-3" : "p-3"} space-y-1`}>
          {navItems.map((item) => {
            const active = isActive(item.href, 'exact' in item ? item.exact : false);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`group flex items-center relative rounded-xl transition-all duration-300 ${
                  isCollapsed 
                    ? "justify-center p-3" 
                    : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-gradient-to-r from-[#6FEC06]/20 to-[#6FEC06]/5 text-white shadow-[inset_0_0_20px_rgba(111,236,6,0.1)]"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                {/* Active glow bar */}
                {active && (
                  <div className={`absolute ${isCollapsed ? "left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full" : "left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"} bg-[#6FEC06] shadow-[0_0_12px_rgba(111,236,6,0.8)]`} />
                )}
                
                <div className={`relative ${active ? "text-[#6FEC06]" : "group-hover:text-white/80"} transition-colors duration-200`}>
                  <Icon className="w-5 h-5" />
                  {active && (
                    <div className="absolute inset-0 blur-md bg-[#6FEC06]/40 -z-10" />
                  )}
                </div>
                
                {!isCollapsed && (
                  <span className={`font-medium text-sm ${active ? "text-white" : ""}`}>
                    {item.label}
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
              <LoginButton compact />
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
