/**
 * Slop or Not — Agent verification engine.
 *
 * Runs tech-agnostic health checks against 8004-registered agents using the
 * SDK's built-in liveness probing (MCP JSON-RPC, A2A agent-card, HTTP fallback).
 */

import { PublicKey } from "@solana/web3.js";

import { getErc8004Sdk } from "@/lib/erc8004";
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
const QUALITY_THRESHOLD = 20;
const RISK_THRESHOLD = 80;

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

    const passed =
      report.status === "live" || report.status === "partially";

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
  } catch {
    return {
      name: "Service Liveness",
      passed: false,
      skipped: false,
      details: "Agent not found or no URI configured",
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

    const json = await resp.json();
    const hasName = typeof json?.name === "string" && json.name.length > 0;
    const hasServices =
      Array.isArray(json?.services) || Array.isArray(json?.endpoints);
    const hasType =
      typeof json?.type === "string" && json.type.includes("8004");

    const issues: string[] = [];
    if (!hasName) issues.push("missing name");
    if (!hasServices) issues.push("missing services");
    if (!hasType) issues.push("non-standard type field");

    return {
      name: "Metadata Valid",
      passed: hasName && hasServices,
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
      details: "Failed to fetch or parse metadata",
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

function checkReputationHealth(agent: IndexedAgent): VerificationCheck {
  if (agent.feedback_count === 0) {
    return {
      name: "Reputation Health",
      passed: true,
      skipped: true,
      details: "No feedbacks yet",
    };
  }

  const issues: string[] = [];
  if (agent.quality_score < QUALITY_THRESHOLD) {
    issues.push(`quality ${Math.round(agent.quality_score)}%`);
  }
  if (agent.risk_score >= RISK_THRESHOLD) {
    issues.push(`risk ${Math.round(agent.risk_score)}%`);
  }

  return {
    name: "Reputation Health",
    passed: issues.length === 0,
    skipped: false,
    details:
      issues.length === 0
        ? `Quality ${Math.round(agent.quality_score)}%, ${agent.feedback_count} feedbacks`
        : `Issues: ${issues.join(", ")}`,
  };
}

function checkRegistrationComplete(agent: IndexedAgent): VerificationCheck {
  const hasUri = !!agent.agent_uri && agent.agent_uri.length > 5;
  const hasPointer =
    !!agent.collection_pointer && agent.collection_pointer.length > 0;
  const hasAtom = agent.atom_enabled ?? false;

  const missing: string[] = [];
  if (!hasUri) missing.push("agent URI");
  if (!hasPointer) missing.push("collection pointer");
  if (!hasAtom) missing.push("ATOM");

  return {
    name: "Registration Complete",
    passed: hasUri && hasPointer && hasAtom,
    skipped: false,
    details:
      missing.length === 0
        ? "Fully registered"
        : `Missing: ${missing.join(", ")}`,
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

  const reputation = checkReputationHealth(agent);
  const registration = checkRegistrationComplete(agent);

  const checks = [liveness, metadata, integrity, reputation, registration];

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
  concurrency = 5,
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
          console.error(
            `[Verification] Failed for ${agent.asset}:`,
            err,
          );
        }
      }
    },
  );

  await Promise.all(workers);
  return results;
}
