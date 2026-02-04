"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";

export interface AuthFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  /** Skip auth handling on 401 (useful for public endpoints) */
  skipAuthRefresh?: boolean;
  /** Disable automatic retry on 401 (default: false) */
  disableRetry?: boolean;
}

export interface AuthContextValue {
  /** Authenticated fetch that handles 401 errors with automatic token refresh and retry */
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
 * - authFetch: Authenticated fetch with automatic token refresh and retry on 401
 *
 * When a 401 is received, the provider will:
 * 1. Call getAccessToken() to refresh the access token (which also refreshes identity token)
 * 2. Retry the request with the refreshed token
 * 3. If retry fails, mark session as expired
 *
 * Place this inside PrivyProvider in your app layout.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { authenticated, getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();

  const [sessionExpired, setSessionExpired] = useState(false);
  
  // Use ref to always have the latest token value in async callbacks
  const identityTokenRef = useRef<string | null>(identityToken);

  // Update ref when token changes
  useEffect(() => {
    identityTokenRef.current = identityToken;
  }, [identityToken]);

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
      const {
        headers = {},
        skipAuthRefresh = false,
        disableRetry = false,
        ...restOptions
      } = options;

      // Helper to make request with given token
      const makeRequest = async (token: string | null) => {
        const requestHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...headers,
        };
        if (token) {
          requestHeaders["privy-id-token"] = token;
        }

        return fetch(url, {
          ...restOptions,
          headers: requestHeaders,
        });
      };

      // Make the initial request with current token
      const response = await makeRequest(identityTokenRef.current);

      // Handle 401 - token expired, try to refresh and retry
      if (
        response.status === 401 &&
        !skipAuthRefresh &&
        !disableRetry &&
        authenticated
      ) {
        console.log("[Auth] Received 401, attempting token refresh and retry...");

        try {
          // Store the old token to compare
          const oldToken = identityTokenRef.current;

          // Force refresh the access token
          // This also triggers identity token refresh internally
          await getAccessToken();

          // Wait for the identity token state to update
          // The useIdentityToken hook should update after getAccessToken completes
          const maxWaitMs = 2000; // Max 2 seconds
          const pollIntervalMs = 100;
          const startTime = Date.now();

          while (Date.now() - startTime < maxWaitMs) {
            // Check if token has been updated in the ref
            if (identityTokenRef.current !== oldToken && identityTokenRef.current !== null) {
              console.log("[Auth] Token refreshed successfully, retrying request...");
              break;
            }
            
            // Wait before checking again
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
          }

          // Retry with the potentially new token
          const retryResponse = await makeRequest(identityTokenRef.current);

          // If retry also fails with 401, session is truly expired
          if (retryResponse.status === 401) {
            console.warn(
              "[Auth] Retry failed with 401, session truly expired",
            );
            setSessionExpired(true);
          } else {
            console.log("[Auth] Retry succeeded with refreshed token");
          }

          return retryResponse;
        } catch (error) {
          console.error("[Auth] Token refresh failed:", error);
          setSessionExpired(true);
          return response; // Return original 401 response
        }
      }

      return response;
    },
    [authenticated, getAccessToken],
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
