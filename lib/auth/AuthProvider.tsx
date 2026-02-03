"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from "react";
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";

export interface AuthFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  /** Skip auth handling on 401 (useful for public endpoints) */
  skipAuthRefresh?: boolean;
}

export interface AuthContextValue {
  /** Authenticated fetch that handles 401 errors */
  authFetch: (url: string, options?: AuthFetchOptions) => Promise<Response>;
  /** Current identity token (may be null) */
  identityToken: string | null;
  /** Whether the session has expired and user needs to re-login */
  sessionExpired: boolean;
  /** Clear the session expired state (after user acknowledges) */
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Hook to access the auth context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider wraps the app and provides:
 * - authFetch: Authenticated fetch with session expiration handling
 *
 * Place this inside PrivyProvider in your app layout.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { authenticated } = usePrivy();
  const { identityToken } = useIdentityToken();

  const [sessionExpired, setSessionExpired] = useState(false);

  // Reset session expired state when user logs in
  useEffect(() => {
    if (authenticated) {
      setSessionExpired(false);
    }
  }, [authenticated]);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const authFetch = useCallback(
    async (url: string, options: AuthFetchOptions = {}): Promise<Response> => {
      const { headers = {}, skipAuthRefresh = false, ...restOptions } = options;

      // Build headers with the current token
      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...headers,
      };
      if (identityToken) {
        requestHeaders["privy-id-token"] = identityToken;
      }

      // Make the request
      const response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
      });

      // Handle 401 - session expired
      if (response.status === 401 && !skipAuthRefresh && authenticated) {
        console.warn("[Auth] Received 401, session expired");
        setSessionExpired(true);
      }

      return response;
    },
    [identityToken, authenticated],
  );

  const value: AuthContextValue = {
    authFetch,
    identityToken,
    sessionExpired,
    clearSessionExpired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
