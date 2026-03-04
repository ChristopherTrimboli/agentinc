"use client";

import useSWR, { type SWRConfiguration, type SWRResponse } from "swr";
import useSWRImmutable from "swr/immutable";
import { useAuth } from "@/lib/auth/AuthProvider";

const publicFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `HTTP ${res.status}`) as Error & {
      status: number;
    };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

/**
 * SWR-based fetch hook with automatic Privy auth headers.
 * Replaces manual useEffect + fetch patterns with proper caching,
 * deduplication, revalidation, and unmount safety.
 *
 * @param url - API endpoint (pass `null` to skip fetching)
 * @param config - SWR configuration overrides
 */
export function useFetch<T = unknown>(
  url: string | null,
  config?: SWRConfiguration<T>,
): SWRResponse<T> {
  const { authFetch } = useAuth();

  const fetcher = async (endpoint: string): Promise<T> => {
    const res = await authFetch(endpoint);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const error = new Error(body.error || `HTTP ${res.status}`) as Error & {
        status: number;
      };
      error.status = res.status;
      throw error;
    }
    return res.json();
  };

  return useSWR<T>(url, fetcher, config);
}

/**
 * Same as useFetch but never revalidates automatically.
 * Good for data that doesn't change (e.g. static configs, one-time lookups).
 */
export function useFetchImmutable<T = unknown>(
  url: string | null,
  config?: SWRConfiguration<T>,
): SWRResponse<T> {
  const { authFetch } = useAuth();

  const fetcher = async (endpoint: string): Promise<T> => {
    const res = await authFetch(endpoint);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const error = new Error(body.error || `HTTP ${res.status}`) as Error & {
        status: number;
      };
      error.status = res.status;
      throw error;
    }
    return res.json();
  };

  return useSWRImmutable<T>(url, fetcher, config);
}

/**
 * SWR fetch for public endpoints (no auth token needed).
 * Useful for unauthenticated pages or static data.
 */
export function usePublicFetch<T = unknown>(
  url: string | null,
  config?: SWRConfiguration<T>,
): SWRResponse<T> {
  return useSWR<T>(url, publicFetcher as (url: string) => Promise<T>, config);
}

/**
 * Public fetch that never revalidates.
 */
export function usePublicFetchImmutable<T = unknown>(
  url: string | null,
  config?: SWRConfiguration<T>,
): SWRResponse<T> {
  return useSWRImmutable<T>(
    url,
    publicFetcher as (url: string) => Promise<T>,
    config,
  );
}
