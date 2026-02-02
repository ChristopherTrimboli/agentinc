"use client";

import { useCallback, useRef } from "react";
import { useIdentityToken } from "@privy-io/react-auth";

export interface AuthFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

export interface UseAuthFetchReturn {
  authFetch: (url: string, options?: AuthFetchOptions) => Promise<Response>;
  identityToken: string | null;
  isRefreshing: boolean;
}

/**
 * Custom hook that provides an authenticated fetch function with automatic token refresh.
 *
 * When a 401 Unauthorized response is received, it will:
 * 1. Refresh the identity token via Privy
 * 2. Retry the original request with the new token
 *
 * Usage:
 * ```tsx
 * const { authFetch } = useAuthFetch();
 *
 * const response = await authFetch('/api/my-endpoint', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export function useAuthFetch(): UseAuthFetchReturn {
  const { identityToken, refreshIdentityToken } = useIdentityToken();
  const isRefreshingRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const authFetch = useCallback(
    async (url: string, options: AuthFetchOptions = {}): Promise<Response> => {
      const { headers = {}, ...restOptions } = options;

      // Build headers with current token
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

      // If not 401 or no refresh function available, return as-is
      if (response.status !== 401 || !refreshIdentityToken) {
        return response;
      }

      // Handle 401 - refresh token and retry
      try {
        let newToken: string | null = null;

        // Prevent multiple simultaneous refreshes
        if (isRefreshingRef.current && refreshPromiseRef.current) {
          // Wait for the existing refresh to complete
          newToken = await refreshPromiseRef.current;
        } else {
          // Start a new refresh
          isRefreshingRef.current = true;
          refreshPromiseRef.current = refreshIdentityToken()
            .then((result) => {
              // refreshIdentityToken returns the new token or throws
              return result ?? null;
            })
            .catch((error) => {
              console.error("[AuthFetch] Token refresh failed:", error);
              return null;
            })
            .finally(() => {
              isRefreshingRef.current = false;
              refreshPromiseRef.current = null;
            });

          newToken = await refreshPromiseRef.current;
        }

        // If we got a new token, retry the request
        if (newToken) {
          const retryResponse = await fetch(url, {
            ...restOptions,
            headers: buildHeaders(newToken),
          });
          return retryResponse;
        }

        // No new token, return original 401 response
        return response;
      } catch (refreshError) {
        console.error("[AuthFetch] Token refresh error:", refreshError);
        // Return the original 401 response if refresh fails
        return response;
      }
    },
    [identityToken, refreshIdentityToken],
  );

  return {
    authFetch,
    identityToken,
    isRefreshing: isRefreshingRef.current,
  };
}

export default useAuthFetch;
