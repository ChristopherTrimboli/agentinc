/**
 * Slop or Not — Agent verification engine.
 *
 * Runs tech-agnostic health checks against 8004-registered agents using the
 * SDK's built-in liveness probing (MCP JSON-RPC, A2A agent-card, HTTP fallback).
 */

import { PublicKey } from "@solana/web3.js";
import { put } from "@vercel/blob";

import { getErc8004Sdk, getSignedErc8004Sdk } from "@/lib/erc8004";
import prisma from "@/lib/prisma";
import type {
  VerificationCheck,
  AgentVerification,
  VerificationStatus,
  ServiceCheckResult,
} from "@/lib/network/types";
import type { IndexedAgent } from "8004-solana";

// ── Constants ────────────────────────────────────────────────────────────────

const LIVENESS_TIMEOUT_MS = 8000;
const METADATA_TIMEOUT_MS = 5000;

// ── Individual Checks ────────────────────────────────────────────────────────

async function checkServiceLiveness(
  asset: PublicKey,
): Promise<VerificationCheck> {
  const start = Date.now();
  try {
    const sdk = getErc8004Sdk();
    const report = await sdk.isItAlive(asset, {
      timeoutMs: LIVENESS_TIMEOUT_MS,
      treatAuthAsAlive: true,
      concurrency: 4,
    });

    const serviceResults: ServiceCheckResult[] = report.results.map((r) => ({
      type: String(r.type),
      endpoint: r.endpoint,
      ok: r.ok,
      latencyMs: r.latencyMs,
      reason: r.reason,
      skipped: r.skipped,
    }));

    if (report.totalPinged === 0) {
      return {
        name: "Service Liveness",
        passed: false,
        skipped: true,
        details: "No HTTP services to ping",
        latencyMs: Date.now() - start,
        serviceResults,
      };
    }

    const passed = report.status === "live" || report.status === "partially";

    return {
      name: "Service Liveness",
      passed,
      skipped: false,
      details:
        report.status === "live"
          ? `All ${report.okCount} services online`
          : report.status === "partially"
            ? `${report.okCount}/${report.totalPinged} services online`
            : `All ${report.totalPinged} services unreachable`,
      latencyMs: Date.now() - start,
      serviceResults,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    let details: string;
    let skipped = false;
    if (msg.includes("Agent not found")) {
      details = "Agent not found on-chain";
    } else if (msg.includes("no agent URI") || msg.includes("has no agent")) {
      details = "No agent URI configured";
      skipped = true;
    } else if (
      msg.includes("Invalid JSON") ||
      msg.includes("JSON") ||
      msg.includes("Unexpected token")
    ) {
      details =
        "Agent URI does not serve valid JSON (non-compliant 8004 registration)";
    } else if (msg.includes("too large")) {
      details = "Agent URI response too large";
    } else if (msg.includes("blocked")) {
      details = "Agent URI blocked (private/internal host)";
    } else if (msg.includes("timeout") || msg.includes("AbortError")) {
      details = "Agent URI timed out";
    } else {
      details = `Liveness check failed: ${msg.slice(0, 120)}`;
    }

    return {
      name: "Service Liveness",
      passed: false,
      skipped,
      details,
      latencyMs: Date.now() - start,
    };
  }
}

async function checkMetadataValid(
  agentUri: string | null,
): Promise<VerificationCheck> {
  if (!agentUri || agentUri.length < 5) {
    return {
      name: "Metadata Valid",
      passed: false,
      skipped: false,
      details: "No agent URI configured",
    };
  }

  const start = Date.now();
  try {
    let resolvedUri = agentUri;
    if (resolvedUri.startsWith("ipfs://")) {
      resolvedUri = `https://ipfs.io/ipfs/${resolvedUri.slice(7)}`;
    } else if (resolvedUri.startsWith("ar://")) {
      resolvedUri = `https://arweave.net/${resolvedUri.slice(5)}`;
    }

    const resp = await fetch(resolvedUri, {
      signal: AbortSignal.timeout(METADATA_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });

    if (!resp.ok) {
      return {
        name: "Metadata Valid",
        passed: false,
        skipped: false,
        details: `HTTP ${resp.status} fetching metadata`,
        latencyMs: Date.now() - start,
      };
    }

    const contentType = resp.headers.get("content-type") ?? "";
    const text = await resp.text();

    if (
      contentType.includes("text/html") ||
      (!contentType.includes("json") && text.trimStart().startsWith("<"))
    ) {
      return {
        name: "Metadata Valid",
        passed: false,
        skipped: false,
        details: "Agent URI serves HTML, not a JSON registration file",
        latencyMs: Date.now() - start,
      };
    }

    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        name: "Metadata Valid",
        passed: false,
        skipped: false,
        details: "Agent URI response is not valid JSON",
        latencyMs: Date.now() - start,
      };
    }

    const hasName =
      typeof json?.name === "string" && (json.name as string).length > 0;
    const hasServices =
      Array.isArray(json?.services) || Array.isArray(json?.endpoints);
    const hasType =
      typeof json?.type === "string" && (json.type as string).includes("8004");

    const issues: string[] = [];
    if (!hasName) issues.push("missing name");
    if (!hasServices) issues.push("missing services array");
    if (!hasType) issues.push("missing 8004 type identifier");

    return {
      name: "Metadata Valid",
      passed: hasName && hasServices && hasType,
      skipped: false,
      details:
        issues.length === 0
          ? "Valid 8004 registration file"
          : issues.join(", "),
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      name: "Metadata Valid",
      passed: false,
      skipped: false,
      details: "Failed to fetch metadata (timeout or network error)",
      latencyMs: Date.now() - start,
    };
  }
}

async function checkIndexerIntegrity(
  asset: PublicKey,
  feedbackCount: number,
): Promise<VerificationCheck> {
  if (feedbackCount === 0) {
    return {
      name: "Indexer Integrity",
      passed: true,
      skipped: true,
      details: "No feedbacks to verify",
    };
  }

  const start = Date.now();
  try {
    const sdk = getErc8004Sdk();
    const result = await sdk.verifyIntegrity(asset);

    return {
      name: "Indexer Integrity",
      passed: result.trustworthy,
      skipped: false,
      details:
        result.status === "valid"
          ? "Hash-chain verified"
          : result.status === "syncing"
            ? `Indexer syncing (${result.totalLag} behind)`
            : result.error?.message || "Integrity check failed",
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      name: "Indexer Integrity",
      passed: false,
      skipped: false,
      details: "Integrity check failed",
      latencyMs: Date.now() - start,
    };
  }
}

function checkRegistrationComplete(agent: IndexedAgent): VerificationCheck {
  const hasUri = !!agent.agent_uri && agent.agent_uri.length > 5;
  const hasPointer =
    !!agent.collection_pointer && agent.collection_pointer.length > 0;
  const hasAtom = agent.atom_enabled ?? false;

  const missing: string[] = [];
  if (!hasUri) missing.push("agent URI");
  if (!hasPointer) missing.push("collection pointer");

  const extras: string[] = [];
  if (!hasAtom) extras.push("ATOM not enabled");

  const allDetails = [...missing.map((m) => `missing ${m}`), ...extras];

  return {
    name: "Registration Complete",
    passed: hasUri && hasPointer,
    skipped: false,
    details:
      allDetails.length === 0
        ? "Fully registered (ATOM enabled)"
        : allDetails.join(", "),
  };
}

// ── Main Verification Runner ─────────────────────────────────────────────────

/** Run all verification checks for a single agent. */
export async function verifyAgent(
  agent: IndexedAgent,
): Promise<AgentVerification> {
  const asset = new PublicKey(agent.asset);

  const [liveness, metadata, integrity] = await Promise.all([
    checkServiceLiveness(asset),
    checkMetadataValid(agent.agent_uri),
    checkIndexerIntegrity(asset, agent.feedback_count),
  ]);

  const registration = checkRegistrationComplete(agent);

  const checks = [liveness, metadata, integrity, registration];

  const applicable = checks.filter((c) => !c.skipped);
  const passed = applicable.filter((c) => c.passed);

  let status: VerificationStatus;
  if (applicable.length === 0) {
    status = "unverified";
  } else if (passed.length === applicable.length) {
    status = "verified";
  } else if (passed.length >= Math.ceil(applicable.length / 2)) {
    status = "partial";
  } else {
    status = "unverified";
  }

  return {
    status,
    checks,
    verifiedAt: new Date().toISOString(),
    score: passed.length,
    maxScore: applicable.length,
  };
}

// ── Batch Runner ─────────────────────────────────────────────────────────────

/** Verify a batch of agents with concurrency limiting. */
export async function verifyAgentBatch(
  agents: IndexedAgent[],
  concurrency = 10,
): Promise<Map<string, AgentVerification>> {
  const results = new Map<string, AgentVerification>();
  let index = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, agents.length) },
    async () => {
      while (index < agents.length) {
        const current = index++;
        const agent = agents[current];
        try {
          const result = await verifyAgent(agent);
          results.set(agent.asset, result);
        } catch (err) {
          console.error(`[Verification] Failed for ${agent.asset}:`, err);
        }
      }
    },
  );

  await Promise.all(workers);
  return results;
}

// ── On-Chain Feedback Submission ─────────────────────────────────────────────

const APP_URL = "https://agentinc.fun";

interface VerificationReport {
  type: "agentinc-verification-v1";
  agent: string;
  verifiedAt: string;
  status: VerificationStatus;
  score: number;
  maxScore: number;
  summary: string;
  issues: string[];
  checks: VerificationCheck[];
  verifier: string;
  verifierUrl: string;
}

function buildReport(
  asset: string,
  verification: AgentVerification,
): VerificationReport {
  const failed = verification.checks.filter((c) => !c.passed && !c.skipped);
  const issues: string[] = [];

  for (const check of failed) {
    if (check.serviceResults?.length) {
      for (const svc of check.serviceResults) {
        if (!svc.ok && !svc.skipped) {
          issues.push(
            `${svc.type} endpoint ${svc.endpoint} unreachable${svc.reason ? `: ${svc.reason}` : ""}`,
          );
        }
      }
    } else {
      issues.push(`${check.name}: ${check.details}`);
    }
  }

  const statusLabel =
    verification.status === "verified"
      ? "All checks passed"
      : verification.status === "partial"
        ? `${verification.score}/${verification.maxScore} checks passed`
        : "Agent failed verification";

  return {
    type: "agentinc-verification-v1",
    agent: asset,
    verifiedAt: verification.verifiedAt,
    status: verification.status,
    score: verification.score,
    maxScore: verification.maxScore,
    summary: `${statusLabel}. ${issues.length > 0 ? `Issues: ${issues.length}` : "No issues found."}`,
    issues,
    checks: verification.checks,
    verifier: "Agent Inc.",
    verifierUrl: APP_URL,
  };
}

/** Upload verification report to Vercel Blob and return the blob URL. */
async function uploadReport(
  asset: string,
  report: VerificationReport,
): Promise<string> {
  const json = JSON.stringify(report);
  const filename = `8004-feedback/${asset}/${Date.now()}.json`;

  const { url } = await put(filename, json, {
    access: "public",
    contentType: "application/json",
  });

  return url;
}

// ── Feedback Dedup (DB-backed) ───────────────────────────────────────────────

async function getSkippedAssets(): Promise<Set<string>> {
  try {
    const rows = await prisma.networkFeedbackState.findMany({
      where: { skipped: true },
      select: { asset: true },
    });
    return new Set(rows.map((r) => r.asset));
  } catch {
    return new Set();
  }
}

async function markAssetSkipped(asset: string): Promise<void> {
  try {
    await prisma.networkFeedbackState.upsert({
      where: { asset },
      create: { asset, skipped: true },
      update: { skipped: true },
    });
  } catch {
    /* non-critical */
  }
}

/** Get the last feedback status we submitted per agent. */
async function getLastFeedbackStatuses(): Promise<Map<string, string>> {
  try {
    const rows = await prisma.networkFeedbackState.findMany({
      where: { lastStatus: { not: null } },
      select: { asset: true, lastStatus: true },
    });
    return new Map(
      rows
        .filter(
          (r): r is typeof r & { lastStatus: string } => r.lastStatus !== null,
        )
        .map((r) => [r.asset, r.lastStatus]),
    );
  } catch {
    return new Map();
  }
}

/** Record the status we just submitted feedback for. */
async function setLastFeedbackStatus(
  asset: string,
  status: string,
): Promise<void> {
  try {
    await prisma.networkFeedbackState.upsert({
      where: { asset },
      create: { asset, lastStatus: status },
      update: { lastStatus: status },
    });
  } catch {
    /* non-critical */
  }
}

/**
 * Submit on-chain 8004 feedback for an agent.
 * Sends the transaction first; only uploads the Blob report on success.
 */
export async function submitVerificationFeedback(
  agent: IndexedAgent,
  verification: AgentVerification,
): Promise<{ signature: string; feedbackUri: string } | null> {
  try {
    const atomScore = Math.round(
      (verification.score / Math.max(verification.maxScore, 1)) * 100,
    );

    const livenessCheck = verification.checks.find(
      (c) => c.name === "Service Liveness",
    );
    const serviceResults = livenessCheck?.serviceResults ?? [];
    const primaryEndpoint =
      serviceResults.find((s) => s.ok && !s.skipped)?.endpoint ??
      serviceResults.find((s) => !s.skipped)?.endpoint ??
      "";

    const tag2 =
      verification.status === "verified"
        ? "pass"
        : verification.status === "partial"
          ? "degraded"
          : "fail";

    const sdk = getSignedErc8004Sdk();
    const assetPk = new PublicKey(agent.asset);

    const report = buildReport(agent.asset, verification);
    const feedbackUri = await uploadReport(agent.asset, report);

    const result = await sdk.giveFeedback(assetPk, {
      value: String(atomScore),
      score: atomScore,
      tag1: "reachable",
      tag2,
      endpoint: primaryEndpoint.slice(0, 250),
      feedbackUri,
    });

    if ("signature" in result && "success" in result) {
      if (!result.success) {
        const errMsg = (result as { error?: string }).error ?? "";
        if (
          errMsg.includes("InvalidAsset") ||
          errMsg.includes("0x2eeb") ||
          errMsg.includes("Simulation failed")
        ) {
          await markAssetSkipped(agent.asset);
        }
        return null;
      }
      await setLastFeedbackStatus(agent.asset, verification.status);
      return { signature: result.signature, feedbackUri };
    }

    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("InvalidAsset") ||
      msg.includes("0x2eeb") ||
      msg.includes("Simulation failed")
    ) {
      await markAssetSkipped(agent.asset);
    }
    return null;
  }
}

/** Submit feedback for agents whose status changed since last submission. */
export async function submitFeedbackBatch(
  agents: IndexedAgent[],
  verifications: Map<string, AgentVerification>,
  concurrency = 5,
): Promise<number> {
  let submitted = 0;
  let index = 0;

  const [skipped, lastStatuses] = await Promise.all([
    getSkippedAssets(),
    getLastFeedbackStatuses(),
  ]);

  const eligible = agents.filter((a) => {
    if (skipped.has(a.asset)) return false;
    const v = verifications.get(a.asset);
    if (!v) return false;
    const prev = lastStatuses.get(a.asset);
    return prev !== v.status;
  });

  if (eligible.length === 0) {
    console.log(
      "[Verification Feedback] No status changes detected, skipping feedback",
    );
    return 0;
  }

  console.log(
    `[Verification Feedback] ${eligible.length} agents with status changes (${skipped.size} invalid skipped)`,
  );

  const workers = Array.from(
    { length: Math.min(concurrency, eligible.length) },
    async () => {
      while (index < eligible.length) {
        const current = index++;
        const agent = eligible[current];
        const verification = verifications.get(agent.asset)!;
        const result = await submitVerificationFeedback(agent, verification);
        if (result) submitted++;
      }
    },
  );

  await Promise.all(workers);
  return submitted;
}
