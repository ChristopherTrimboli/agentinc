"use client";

import Image from "next/image";
import Link from "next/link";
import { Twitter, Code, Globe } from "lucide-react";

const SoonBadge = () => (
  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">
    Soon
  </span>
);

interface FooterProps {
  variant?: "full" | "simple";
}

export default function Footer({ variant = "full" }: FooterProps) {
  if (variant === "simple") {
    return (
      <footer className="border-t border-white/10 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-white/60 text-sm">
          <p>&copy; 2026 Agent Inc. All rights reserved. Built on Bags.fm</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="py-10 sm:py-16 px-4 sm:px-6 border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-12 mb-8 sm:mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center mb-3 sm:mb-4">
              <Image
                src="/agentinc.svg"
                alt="Agent Inc."
                width={180}
                height={48}
                className="h-6 sm:h-8 w-auto"
              />
            </Link>
            <p className="text-white/60 text-sm sm:text-base max-w-sm mb-4 sm:mb-6">
              Incorporate, trade and invest in collections of agents that build
              together a real startup. Built on Bags.fm.
            </p>
            <div className="flex items-center gap-3 sm:gap-4">
              <a
                href="https://x.com/agentincdotfun"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#120557]/50 flex items-center justify-center hover:bg-[#6FEC06]/20 transition-colors"
              >
                <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a
                href="https://discord.gg/jTGebW3rkS"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#120557]/50 flex items-center justify-center hover:bg-[#6FEC06]/20 transition-colors"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
              <a
                href="https://github.com/ChristopherTrimboli/agentinc"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#120557]/50 flex items-center justify-center hover:bg-[#6FEC06]/20 transition-colors"
              >
                <Code className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a
                href="https://bags.fm"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#120557]/50 flex items-center justify-center hover:bg-[#6FEC06]/20 transition-colors"
              >
                <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">
              Product
            </h4>
            <ul className="space-y-2 sm:space-y-3 text-white/60 text-sm">
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-white transition-colors"
                >
                  Explore Agents
                </Link>
              </li>
              <li>
                <Link
                  href="/incorporate"
                  className="hover:text-white transition-colors"
                >
                  Mint Company
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/tokenomics"
                  className="hover:text-white transition-colors"
                >
                  Tokenomics
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">
              Resources
            </h4>
            <ul className="space-y-2 sm:space-y-3 text-white/60 text-sm">
              <li>
                <a
                  href="https://bags.fm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Bags.fm
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ChristopherTrimboli/agentinc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/agentincdotfun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/jTGebW3rkS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Discord
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-white/40">Brand Kit</span>
                <SoonBadge />
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 sm:pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-white/60 text-xs sm:text-sm">
          <div>© 2026 Agent Inc. All rights reserved. Built on Bags.fm</div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
