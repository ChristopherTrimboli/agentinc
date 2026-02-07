/**
 * Knowledge Base File Upload API
 *
 * POST /api/knowledge/upload
 *
 * Accepts multipart form data with one or more files.
 * Parses file content (PDF, text, markdown, CSV, etc.),
 * generates embeddings in batch using embedMany, and stores in the knowledge base.
 *
 * Form data fields:
 * - files: File[] (one or more files)
 * - agentId: string (optional - scope knowledge to specific agent)
 */

import { getPrivyClient } from "@/lib/auth/verifyRequest";
import { parseFileContent } from "@/lib/ai/file-parser";
import { createResourcesFromFiles } from "@/lib/ai/embedding";
import { rateLimitByUser } from "@/lib/rateLimit";

export const maxDuration = 60; // Allow up to 60 seconds for large file processing

export async function POST(req: Request) {
  // Authenticate
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: string;
  try {
    const privy = getPrivyClient();
    const privyUser = await privy.users().get({ id_token: idToken });
    userId = privyUser.id;
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  // Rate limit: 10 upload requests per minute per user
  const rateLimited = await rateLimitByUser(userId, "knowledge-upload", 10);
  if (rateLimited) return rateLimited;

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json(
      { error: "Invalid form data. Send files as multipart/form-data." },
      { status: 400 },
    );
  }

  const agentId = formData.get("agentId") as string | null;
  const rawFiles = formData.getAll("files");

  if (!rawFiles || rawFiles.length === 0) {
    return Response.json({ error: "No files provided." }, { status: 400 });
  }

  // Filter to actual File objects
  const files = rawFiles.filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return Response.json(
      { error: "No valid files found in the upload." },
      { status: 400 },
    );
  }

  // Limit: max 10 files per request
  if (files.length > 10) {
    return Response.json(
      { error: "Maximum 10 files per upload." },
      { status: 400 },
    );
  }

  // Max 10MB per file
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const oversized = files.filter((f) => f.size > MAX_FILE_SIZE);
  if (oversized.length > 0) {
    return Response.json(
      {
        error: `Files exceed 10MB limit: ${oversized.map((f) => f.name).join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Parse all files
  const parsedFiles: Array<{
    filename: string;
    textContent: string;
    mediaType: string;
    success: boolean;
    error?: string;
  }> = [];

  // Parse all files in parallel
  const parsedResults = await Promise.all(
    files.map(async (file) => {
      const mediaType = file.type || "application/octet-stream";

      // Skip images - they go through the normal chat attachment flow
      if (mediaType.startsWith("image/")) {
        return {
          filename: file.name,
          textContent: "",
          mediaType,
          success: false,
          error:
            "Image files are handled as chat attachments, not knowledge base documents.",
        };
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await parseFileContent(buffer, mediaType, file.name);
      return {
        filename: file.name,
        textContent: parsed.textContent,
        mediaType,
        success: parsed.success,
        error: parsed.error,
      };
    }),
  );

  parsedFiles.push(...parsedResults);

  // Filter to successfully parsed files
  const successfulFiles = parsedFiles.filter(
    (f) => f.success && f.textContent.length > 0,
  );

  if (successfulFiles.length === 0) {
    return Response.json(
      {
        error: "No files could be parsed.",
        details: parsedFiles.map((f) => ({
          filename: f.filename,
          error: f.error || "Empty content",
        })),
      },
      { status: 400 },
    );
  }

  // Create resources and embeddings in batch
  const results = await createResourcesFromFiles({
    files: successfulFiles.map((f) => ({
      filename: f.filename,
      textContent: f.textContent,
    })),
    userId,
    agentId: agentId || undefined,
  });

  // Build response with all file statuses
  const allResults = parsedFiles.map((parsed) => {
    const embeddingResult = results.find((r) => r.filename === parsed.filename);
    if (embeddingResult) {
      return {
        filename: parsed.filename,
        success: embeddingResult.success,
        resourceId: embeddingResult.resourceId,
        chunks: embeddingResult.chunks,
        error: embeddingResult.error,
      };
    }
    return {
      filename: parsed.filename,
      success: false,
      chunks: 0,
      error: parsed.error || "File was not processed",
    };
  });

  const successCount = allResults.filter((r) => r.success).length;
  const totalChunks = allResults.reduce((sum, r) => sum + r.chunks, 0);

  return Response.json({
    message: `${successCount}/${files.length} files processed, ${totalChunks} chunks embedded.`,
    results: allResults,
  });
}
