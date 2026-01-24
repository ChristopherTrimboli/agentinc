"use client";

import { useState, useEffect } from "react";
import { Building2, Menu, X, Clock } from "lucide-react";

function SoonBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-amber-500/20 text-amber-400 rounded-full ${className}`}
    >
      <Clock className="w-2.5 h-2.5" />
      Soon
    </span>
  );
}

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#agents", label: "Agents" },
  { href: "#network", label: "Network" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "/tokenomics", label: "Tokenomics", highlight: true },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">Agent Inc.</span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={
                link.highlight
                  ? "text-purple-400 hover:text-purple-300 transition-colors font-medium"
                  : "text-gray-400 hover:text-white transition-colors"
              }
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <button
          disabled
          className="hidden md:flex px-6 py-2.5 bg-gray-700/50 rounded-full font-medium cursor-not-allowed items-center gap-2 opacity-60"
        >
          Launch App
          <SoonBadge />
        </button>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        style={{ top: "72px" }}
      />

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-[72px] left-0 right-0 bg-[#030712]/95 backdrop-blur-lg border-b border-gray-800 md:hidden transition-all duration-300 ${
          isOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Navigation Links */}
          <div className="flex flex-col gap-1">
            {navLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className={`py-3 px-4 rounded-lg text-lg font-medium transition-all duration-200 ${
                  link.highlight
                    ? "text-purple-400 hover:bg-purple-500/10"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Mobile CTA */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <button
              disabled
              className="w-full px-6 py-3 bg-gray-700/50 rounded-full font-medium cursor-not-allowed flex items-center justify-center gap-2 opacity-60"
            >
              Launch App
              <SoonBadge />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
