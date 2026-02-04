/**
 * Encryption utilities for sensitive data storage
 *
 * Uses AES-256-GCM for authenticated encryption
 * - 256-bit key from ENCRYPTION_KEY env var
 * - Random 12-byte IV per encryption
 * - Authentication tag prevents tampering
 *
 * Format: base64(iv:authTag:ciphertext)
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment
 * Key must be exactly 32 bytes (256 bits) in hex or base64
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
        "Generate one with: openssl rand -hex 32",
    );
  }

  // Try hex format first (64 chars = 32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, "hex");
  }

  // Try base64 format (44 chars for 32 bytes)
  if (/^[A-Za-z0-9+/]{43}=?$/.test(key)) {
    const decoded = Buffer.from(key, "base64");
    if (decoded.length === KEY_LENGTH) {
      return decoded;
    }
  }

  // Try as raw string (must be exactly 32 bytes)
  const rawBuffer = Buffer.from(key, "utf8");
  if (rawBuffer.length === KEY_LENGTH) {
    return rawBuffer;
  }

  throw new Error(
    `ENCRYPTION_KEY must be 32 bytes. Got ${rawBuffer.length} bytes. ` +
      "Use hex format (64 chars) or base64 format (44 chars). " +
      "Generate with: openssl rand -hex 32",
  );
}

/**
 * Encrypt a plaintext string
 * Returns base64-encoded string containing iv:authTag:ciphertext
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in base64 format
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine iv + authTag + ciphertext and encode as base64
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypt an encrypted string
 *
 * @param encryptedData - Base64-encoded encrypted string (iv:authTag:ciphertext)
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();

  // Decode from base64
  const combined = Buffer.from(encryptedData, "base64");

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Check if a string appears to be encrypted
 * Useful for migration scenarios where data might be mixed
 *
 * @param data - String to check
 * @returns true if the string appears to be encrypted
 */
export function isEncrypted(data: string): boolean {
  try {
    // Must be valid base64
    const decoded = Buffer.from(data, "base64");

    // Must be at least IV + AuthTag + 1 byte of data
    if (decoded.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      return false;
    }

    // Check if it re-encodes to the same base64 (valid base64 check)
    if (decoded.toString("base64") !== data) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Safely decrypt data that might be plaintext (for migration)
 * If decryption fails, assumes it's plaintext and returns as-is
 *
 * @param data - Potentially encrypted string
 * @returns Decrypted or original string
 */
export function safeDecrypt(data: string): string {
  if (!isEncrypted(data)) {
    return data;
  }

  try {
    return decrypt(data);
  } catch {
    // If decryption fails, it's probably plaintext
    return data;
  }
}
