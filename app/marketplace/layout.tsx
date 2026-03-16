import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-abyss overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-30" />
      <div className="pointer-events-none fixed -top-40 -right-40 size-[600px] rounded-full bg-coral/5 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-60 -left-40 size-[500px] rounded-full bg-indigo/30 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-coral"
          >
            <Store className="size-4" />
            Marketplace
          </Link>
        </nav>
        {children}
      </div>
    </div>
  );
}
