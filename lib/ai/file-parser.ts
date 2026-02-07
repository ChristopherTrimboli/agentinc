/**
 * File Parser Utility
 *
 * Extracts text content from various file types for RAG knowledge base embedding.
 * Supports: PDF, plain text, markdown, CSV, JSON, code files, and more.
 */

import { PDFParse } from "pdf-parse";

/** Supported document MIME types for text extraction */
export const DOCUMENT_MIME_TYPES = [
  // PDF
  "application/pdf",
  // Text
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/xml",
  "text/css",
  "text/javascript",
  // Code
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
  // Office-like (text-based)
  "application/rtf",
] as const;

/** Image MIME type prefixes */
export const IMAGE_MIME_PREFIX = "image/";

/** All supported MIME types for the file input accept attribute */
export const ACCEPTED_FILE_TYPES = [
  "image/*",
  "application/pdf",
  "text/*",
  "application/json",
  "application/xml",
  "application/rtf",
  ".md",
  ".csv",
  ".json",
  ".txt",
  ".pdf",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".sql",
  ".yml",
  ".yaml",
  ".toml",
  ".env",
  ".sh",
  ".bash",
  ".html",
  ".css",
  ".xml",
  ".rtf",
].join(",");

/**
 * Check if a MIME type is a supported document type (non-image).
 */
export function isDocumentType(mediaType: string): boolean {
  if (!mediaType) return false;
  return (
    DOCUMENT_MIME_TYPES.includes(
      mediaType as (typeof DOCUMENT_MIME_TYPES)[number],
    ) || mediaType.startsWith("text/")
  );
}

/**
 * Check if a MIME type is an image type.
 */
export function isImageType(mediaType: string): boolean {
  return mediaType?.startsWith(IMAGE_MIME_PREFIX) ?? false;
}

/**
 * Get a human-readable file type label for display.
 */
export function getFileTypeLabel(mediaType: string, filename?: string): string {
  if (!mediaType && !filename) return "File";

  // Check by extension first
  const ext = filename?.split(".").pop()?.toLowerCase();
  const extLabels: Record<string, string> = {
    pdf: "PDF",
    md: "Markdown",
    txt: "Text",
    csv: "CSV",
    json: "JSON",
    xml: "XML",
    html: "HTML",
    css: "CSS",
    js: "JavaScript",
    jsx: "JSX",
    ts: "TypeScript",
    tsx: "TSX",
    py: "Python",
    sql: "SQL",
    yml: "YAML",
    yaml: "YAML",
    toml: "TOML",
    sh: "Shell",
    bash: "Shell",
    rtf: "RTF",
    env: "Env",
  };

  if (ext && extLabels[ext]) return extLabels[ext];

  // Fall back to MIME type
  if (mediaType === "application/pdf") return "PDF";
  if (mediaType.startsWith("text/")) return "Text";
  if (mediaType.startsWith("image/")) return "Image";
  if (mediaType === "application/json") return "JSON";

  return "File";
}

/**
 * Get file extension icon color for UI display.
 */
export function getFileTypeColor(mediaType: string, filename?: string): string {
  const ext = filename?.split(".").pop()?.toLowerCase();

  const colorMap: Record<string, string> = {
    pdf: "#ef4444", // red
    md: "#8b5cf6", // purple
    txt: "#94a3b8", // slate
    csv: "#22c55e", // green
    json: "#f59e0b", // amber
    xml: "#f97316", // orange
    html: "#ef4444", // red
    css: "#3b82f6", // blue
    js: "#eab308", // yellow
    jsx: "#06b6d4", // cyan
    ts: "#3b82f6", // blue
    tsx: "#06b6d4", // cyan
    py: "#22c55e", // green
    sql: "#f97316", // orange
  };

  if (ext && colorMap[ext]) return colorMap[ext];
  if (mediaType === "application/pdf") return "#ef4444";

  return "#6b7280"; // gray default
}

export interface ParsedFile {
  filename: string;
  mediaType: string;
  textContent: string;
  /** Original size in bytes */
  originalSize: number;
  /** Whether text extraction was successful */
  success: boolean;
  error?: string;
}

/**
 * Extract text content from a file buffer based on its MIME type.
 * Returns the extracted text or an error message.
 */
export async function parseFileContent(
  buffer: Buffer,
  mediaType: string,
  filename: string,
): Promise<ParsedFile> {
  const base: Omit<ParsedFile, "textContent" | "success" | "error"> = {
    filename,
    mediaType,
    originalSize: buffer.length,
  };

  try {
    // PDF extraction (pdf-parse v2 class-based API)
    if (mediaType === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        const text = result.text?.trim();
        if (!text) {
          return {
            ...base,
            textContent: "",
            success: false,
            error: "PDF appears to be empty or contains only images.",
          };
        }
        return { ...base, textContent: text, success: true };
      } finally {
        await parser.destroy();
      }
    }

    // Text-based files (plain text, markdown, CSV, code, etc.)
    if (
      mediaType.startsWith("text/") ||
      mediaType === "application/json" ||
      mediaType === "application/xml" ||
      mediaType === "application/javascript" ||
      mediaType === "application/typescript" ||
      mediaType === "application/rtf"
    ) {
      const text = buffer.toString("utf-8").trim();
      if (!text) {
        return {
          ...base,
          textContent: "",
          success: false,
          error: "File appears to be empty.",
        };
      }
      return { ...base, textContent: text, success: true };
    }

    // Unsupported type - try to read as text anyway
    try {
      const text = buffer.toString("utf-8").trim();
      if (text && !text.includes("\0")) {
        // Looks like valid text
        return { ...base, textContent: text, success: true };
      }
    } catch {
      // Not text
    }

    return {
      ...base,
      textContent: "",
      success: false,
      error: `Unsupported file type: ${mediaType}`,
    };
  } catch (error) {
    return {
      ...base,
      textContent: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown parsing error",
    };
  }
}

/**
 * Parse multiple files in parallel.
 */
export async function parseFiles(
  files: Array<{ buffer: Buffer; mediaType: string; filename: string }>,
): Promise<ParsedFile[]> {
  return Promise.all(
    files.map(({ buffer, mediaType, filename }) =>
      parseFileContent(buffer, mediaType, filename),
    ),
  );
}
