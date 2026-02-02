import { PublicKey } from "@solana/web3.js";

/**
 * Validate if a string is a valid Solana PublicKey
 */
export function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely parse a string to PublicKey, returns null if invalid
 */
export function safeParsePublicKey(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

/**
 * Validate and return PublicKey or throw descriptive error
 */
export function validatePublicKey(
  value: string,
  fieldName = "address",
): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`Invalid ${fieldName}: not a valid Solana public key`);
  }
}

/**
 * Validate base64 string
 */
export function isValidBase64(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  try {
    // Check if the string is valid base64
    const decoded = atob(str);
    return btoa(decoded) === str;
  } catch {
    return false;
  }
}

/**
 * Safely decode base64 string, returns null if invalid
 */
export function safeDecodeBase64(str: string): Uint8Array | null {
  try {
    if (!str || typeof str !== "string") return null;
    return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/**
 * Safely encode bytes to base64, returns null if invalid
 */
export function safeEncodeBase64(bytes: Uint8Array): string | null {
  try {
    return btoa(String.fromCharCode(...bytes));
  } catch {
    return null;
  }
}
