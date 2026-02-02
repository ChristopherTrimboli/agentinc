// Auth utilities - centralized authentication with auto token refresh

export { AuthProvider, useAuth } from "./AuthProvider";
export type { AuthContextValue, AuthFetchOptions } from "./AuthProvider";

export { useAuthFetch } from "../hooks/useAuthFetch";
export type { UseAuthFetchReturn } from "../hooks/useAuthFetch";

// Re-export server-side utilities
export {
  getPrivyClient,
  verifyAuth,
  requireAuth,
  isAuthResult,
} from "./verifyRequest";
export type { AuthResult } from "./verifyRequest";
