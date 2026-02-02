"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { usePrivy } from "@privy-io/react-auth";

/**
 * Modal that appears when the user's session has expired.
 * Prompts them to log in again.
 */
export default function SessionExpiredModal() {
  const { sessionExpired, clearSessionExpired } = useAuth();
  const { login, logout } = usePrivy();

  if (!sessionExpired) return null;

  const handleLogin = async () => {
    // Clear expired state first
    clearSessionExpired();
    // Log out to clear any stale state
    await logout();
    // Then trigger login
    login();
  };

  const handleDismiss = () => {
    clearSessionExpired();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-purple-500/30 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
            <svg
              className="h-5 w-5 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-10V4m0 0h.01M12 4a1 1 0 110 2 1 1 0 010-2zm0 14a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white">Session Expired</h2>
        </div>

        <p className="mb-6 text-sm text-gray-400">
          Your session has expired. Please log in again to continue using the
          app.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
          >
            Dismiss
          </button>
          <button
            onClick={handleLogin}
            className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
