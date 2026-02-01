"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateAgentPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the mint agent page
    router.replace("/dashboard/mint");
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-4 border-2 border-[#6FEC06]/30 border-t-[#6FEC06] rounded-full animate-spin" />
        <p className="text-white/50 text-sm">Redirecting to Mint Agent...</p>
      </div>
    </div>
  );
}
