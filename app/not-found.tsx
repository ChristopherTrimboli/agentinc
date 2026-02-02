import { FileQuestion, Home, Search } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#000028] to-[#120557] p-4">
      <div className="max-w-md w-full text-center">
        {/* 404 icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#6FEC06]/10 border border-[#6FEC06]/30 flex items-center justify-center">
          <FileQuestion className="w-10 h-10 text-[#6FEC06]" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <h2 className="text-xl text-white/80 mb-4">Page Not Found</h2>

        {/* Description */}
        <p className="text-white/60 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#6FEC06] text-black font-semibold rounded-xl hover:bg-[#6FEC06]/90 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
          >
            <Search className="w-4 h-4" />
            Explore Agents
          </Link>
        </div>
      </div>
    </div>
  );
}
