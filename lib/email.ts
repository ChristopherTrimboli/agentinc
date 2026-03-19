import { Resend } from "resend";

// ── Client ────────────────────────────────────────────────────────────

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "Agent Inc. <notifications@agentinc.fun>";

// ── Core Sender ───────────────────────────────────────────────────────

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/** Fire-and-forget email. Logs errors but never throws. */
export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email");
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("[Email] Resend API error:", error);
    }
  } catch (err) {
    console.error("[Email] Failed to send:", err);
  }
}

// ── Shared Layout ─────────────────────────────────────────────────────

const LOGO_URL = "https://agentinc.fun/agentinc-logo.svg";
const GREEN = "#6FEC06";
const ABYSS = "#000028";
const SURFACE = "#0a0520";
const SURFACE_LIGHT = "#120a35";
const INDIGO = "#120557";

function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:${ABYSS};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${ABYSS};padding:48px 20px;">
    <tr>
      <td align="center">
        <!-- Logo -->
        <table width="100%" style="max-width:520px;">
          <tr>
            <td style="padding:0 0 24px;">
              <a href="https://agentinc.fun" style="text-decoration:none;">
                <img src="${LOGO_URL}" alt="Agent Inc." width="120" height="32" style="display:block;border:0;outline:none;" />
              </a>
            </td>
          </tr>
        </table>
        <!-- Card -->
        <table width="100%" style="max-width:520px;background:${SURFACE};border:1px solid rgba(111,236,6,0.15);border-radius:16px;overflow:hidden;">
          <!-- Body -->
          <tr>
            <td style="padding:32px 36px 36px;">
              ${body}
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table width="100%" style="max-width:520px;">
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.2);">
                <a href="https://agentinc.fun/dashboard/marketplace" style="color:rgba(255,255,255,0.3);text-decoration:none;">Marketplace</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="https://agentinc.fun" style="color:rgba(255,255,255,0.3);text-decoration:none;">agentinc.fun</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="https://x.com/agentincdotfun" style="color:rgba(255,255,255,0.3);text-decoration:none;">@agentincdotfun</a>
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.12);">
                AI agents on Solana
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Marketplace Email Templates ───────────────────────────────────────

interface TaskEmailParams {
  taskTitle: string;
  taskId: string;
  budgetSol?: number;
  creatorFees?: number;
  tokenMint?: string | null;
  tokenSymbol?: string | null;
  featuredImage?: string | null;
}

function formatSol(amount: number): string {
  if (amount <= 0) return "0";
  return amount < 0.01 ? amount.toFixed(6) : amount.toFixed(2);
}

function bountyBlock(params: TaskEmailParams): string {
  const budget = params.budgetSol ?? 0;
  const fees = params.creatorFees ?? 0;
  const total = budget + fees;
  if (total <= 0) return "";

  const hasToken = !!params.tokenMint;

  let breakdown = "";
  if (hasToken && fees > 0) {
    breakdown = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px solid rgba(111,236,6,0.1);padding-top:12px;">
        <tr>
          <td style="font-size:12px;color:rgba(255,255,255,0.35);padding:2px 0;">SOL Budget</td>
          <td align="right" style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.6);padding:2px 0;">${formatSol(budget)} SOL</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:rgba(255,255,255,0.35);padding:2px 0;">Creator Fees</td>
          <td align="right" style="font-size:12px;font-weight:600;color:${GREEN};padding:2px 0;">${formatSol(fees)} SOL</td>
        </tr>
      </table>`;
  }

  return `
    <div style="background:rgba(111,236,6,0.05);border:1px solid rgba(111,236,6,0.15);border-radius:12px;padding:20px 24px;margin-bottom:20px;text-align:center;">
      <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:rgba(111,236,6,0.5);letter-spacing:0.5px;text-transform:uppercase;">${hasToken ? "Total Bounty" : "Budget"}</p>
      <p style="margin:0;font-size:32px;font-weight:700;color:${GREEN};letter-spacing:-0.5px;">${formatSol(total)}</p>
      <p style="margin:0;font-size:13px;font-weight:500;color:rgba(111,236,6,0.4);">SOL</p>
      ${breakdown}
    </div>`;
}

function tokenBlock(params: TaskEmailParams): string {
  if (!params.tokenMint) return "";

  const bagsUrl = `https://bags.fm/${params.tokenMint}`;
  const symbol = params.tokenSymbol ? escapeHtml(params.tokenSymbol) : "";

  return `
    <div style="background:rgba(111,236,6,0.04);border:1px solid rgba(111,236,6,0.12);border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:rgba(111,236,6,0.4);letter-spacing:0.5px;text-transform:uppercase;">Task Token</p>
            ${symbol ? `<p style="margin:0;font-size:18px;font-weight:700;color:${GREEN};">${symbol}</p>` : ""}
          </td>
          <td align="right" valign="middle">
            <a href="${bagsUrl}" style="display:inline-block;background:rgba(111,236,6,0.12);border:1px solid rgba(111,236,6,0.25);color:${GREEN};font-size:12px;font-weight:600;text-decoration:none;padding:8px 16px;border-radius:8px;">
              See on Bags &rarr;
            </a>
          </td>
        </tr>
      </table>
    </div>`;
}

function featuredImageBlock(imageUrl: string | null | undefined): string {
  if (!imageUrl) return "";
  return `
    <div style="margin-bottom:20px;border-radius:12px;overflow:hidden;border:1px solid rgba(111,236,6,0.1);">
      <img src="${imageUrl}" alt="Task" width="100%" style="display:block;border:0;outline:none;max-height:200px;object-fit:cover;" />
    </div>`;
}

export function taskAssignedEmail(params: TaskEmailParams) {
  const { taskTitle, taskId } = params;
  const taskUrl = `https://agentinc.fun/dashboard/marketplace/tasks/${taskId}`;
  const body = `
    <div style="margin:0 0 20px;display:inline-block;background:rgba(111,236,6,0.1);border:1px solid rgba(111,236,6,0.2);border-radius:8px;padding:6px 14px;">
      <span style="font-size:12px;font-weight:600;color:${GREEN};letter-spacing:0.5px;text-transform:uppercase;">Assigned</span>
    </div>
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">You've been assigned a task</h2>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.5);">
      The poster has selected you to work on the following task. Head over to the marketplace to get started.
    </p>
    ${featuredImageBlock(params.featuredImage)}
    <div style="background:${SURFACE_LIGHT};border:1px solid rgba(111,236,6,0.12);border-radius:12px;padding:20px 24px;margin-bottom:20px;">
      <p style="margin:0;font-size:16px;font-weight:600;color:#ffffff;letter-spacing:-0.2px;">${escapeHtml(taskTitle)}</p>
    </div>
    ${bountyBlock(params)}
    ${tokenBlock(params)}
    <a href="${taskUrl}" style="display:inline-block;background:${GREEN};color:#000104;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;letter-spacing:-0.2px;">
      View Task &rarr;
    </a>`;
  return {
    subject: `You've been assigned: ${taskTitle}`,
    html: emailLayout(body),
  };
}

export function taskUnassignedEmail(params: TaskEmailParams) {
  const { taskTitle, taskId } = params;
  const taskUrl = `https://agentinc.fun/dashboard/marketplace/tasks/${taskId}`;
  const body = `
    <div style="margin:0 0 20px;display:inline-block;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 14px;">
      <span style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:0.5px;text-transform:uppercase;">Unassigned</span>
    </div>
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">You've been unassigned from a task</h2>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.5);">
      The poster has removed your assignment from the following task. The task is now open for new bids &mdash; you can still place a new bid if you'd like to continue.
    </p>
    ${featuredImageBlock(params.featuredImage)}
    <div style="background:${SURFACE_LIGHT};border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px 24px;margin-bottom:20px;">
      <p style="margin:0;font-size:16px;font-weight:600;color:#ffffff;letter-spacing:-0.2px;">${escapeHtml(taskTitle)}</p>
    </div>
    ${bountyBlock(params)}
    ${tokenBlock(params)}
    <a href="${taskUrl}" style="display:inline-block;background:${INDIGO};border:1px solid rgba(111,236,6,0.2);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;letter-spacing:-0.2px;">
      View Task &rarr;
    </a>`;
  return {
    subject: `Assignment removed: ${taskTitle}`,
    html: emailLayout(body),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
