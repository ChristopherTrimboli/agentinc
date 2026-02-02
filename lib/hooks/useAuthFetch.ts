"use client";

import { useCallback } from "react";
import { useIdentityToken } from "@privy-io/react-auth";

export interface AuthFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

export interface UseAuthFetchReturn {
  authFetch: (url: string, options?: AuthFetchOptions) => Promise<Response>;
  identityToken: string | null;
}

/**
 * Custom hook that provides an authenticated fetch function.
 *
 * Automatically attaches the Privy identity token to requests.
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
  const { identityToken } = useIdentityToken();

  const authFetch = useCallback(
    async (url: string, options: AuthFetchOptions = {}): Promise<Response> => {
      const { headers = {}, ...restOptions } = options;

      // Build headers with current token
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

      return response;
    },
    [identityToken],
  );

  return {
    authFetch,
    identityToken,
  };
}

export default useAuthFetch;
