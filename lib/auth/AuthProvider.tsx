"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
} from "react";
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";

export interface AuthFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  /** Skip auto-refresh on 401 (useful for public endpoints) */
  skipAuthRefresh?: boolean;
}

export interface AuthContextValue {
  /** Authenticated fetch that auto-refreshes tokens on 401 */
  authFetch: (url: string, options?: AuthFetchOptions) => Promise<Response>;
  /** Current identity token (may be null) */
  identityToken: string | null;
  /** Whether a token refresh is in progress */
  isRefreshing: boolean;
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
 * - authFetch: Authenticated fetch with automatic token refresh on 401
 * - Session expiration handling
 *
 * Place this inside PrivyProvider in your app layout.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { authenticated, logout } = usePrivy();
  const { identityToken, refreshIdentityToken } = useIdentityToken();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

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

      // Build headers with the given token
      const buildHeaders = (token: string | null): Record<string, string> => {
        const newHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...headers,
        };
        if (token) {
          newHeaders["privy-id-token"] = token;
        }
        return newHeaders;
      };

      // Make the initial request
      const response = await fetch(url, {
        ...restOptions,
        headers: buildHeaders(identityToken),
      });

      // If not 401, or skip auth refresh, or no refresh function, return as-is
      if (
        response.status !== 401 ||
        skipAuthRefresh ||
        !refreshIdentityToken ||
        !authenticated
      ) {
        return response;
      }

      // Handle 401 - attempt to refresh token and retry
      try {
        let newToken: string | null = null;

        // Prevent multiple simultaneous refreshes using a shared promise
        if (refreshPromiseRef.current) {
          // Wait for the existing refresh to complete
          newToken = await refreshPromiseRef.current;
        } else {
          // Start a new refresh
          setIsRefreshing(true);
          refreshPromiseRef.current = refreshIdentityToken()
            .then((result) => result ?? null)
            .catch((error) => {
              console.error("[Auth] Token refresh failed:", error);
              return null;
            })
            .finally(() => {
              setIsRefreshing(false);
              refreshPromiseRef.current = null;
            });

          newToken = await refreshPromiseRef.current;
        }

        // If we got a new token, retry the request
        if (newToken) {
          console.log("[Auth] Token refreshed, retrying request");
          const retryResponse = await fetch(url, {
            ...restOptions,
            headers: buildHeaders(newToken),
          });

          // If retry also fails with 401, session is truly expired
          if (retryResponse.status === 401) {
            console.warn("[Auth] Retry failed with 401, session expired");
            setSessionExpired(true);
          }

          return retryResponse;
        }

        // Refresh returned null - session expired
        console.warn("[Auth] Token refresh returned null, session expired");
        setSessionExpired(true);
        return response;
      } catch (refreshError) {
        console.error("[Auth] Token refresh error:", refreshError);
        setSessionExpired(true);
        return response;
      }
    },
    [identityToken, refreshIdentityToken, authenticated],
  );

  const value: AuthContextValue = {
    authFetch,
    identityToken,
    isRefreshing,
    sessionExpired,
    clearSessionExpired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
