"use client";

import { useState, useEffect } from "react";
import { Building2, Menu, X } from "lucide-react";
import LoginButton from "./LoginButton";

const navLinks = [
  { href: "/dashboard", label: "Launch App", highlight: true },
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6FEC06] to-[#120557] flex items-center justify-center">
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
                  ? "text-[#6FEC06] hover:text-[#9FF24A] transition-colors font-medium"
                  : "text-white/60 hover:text-white transition-colors"
              }
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <LoginButton />
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-[#000104]/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        style={{ top: "72px" }}
      />

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-[72px] left-0 right-0 bg-[#000028]/95 backdrop-blur-lg border-b border-white/10 md:hidden transition-all duration-300 ${
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
                    ? "text-[#6FEC06] hover:bg-[#6FEC06]/10"
                    : "text-white/70 hover:text-white hover:bg-white/5"
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
          <div className="mt-6 pt-6 border-t border-white/10">
            <LoginButton fullWidth />
          </div>
        </div>
      </div>
    </nav>
  );
}
