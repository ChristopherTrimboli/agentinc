/**
 * Florist One Flowers Tool
 *
 * Send real flowers to anyone using the Florist One API.
 * Partner billing model: the platform's company card is charged; the user pays
 * in SOL before the order is placed.
 *
 * Flow:
 * 1. browseFlowers        — browse products by category/occasion
 * 2. checkFlowerDelivery  — get valid delivery dates for a recipient zip code
 * 3. getFlowerQuote       — get the exact USD total including delivery + tax
 * 4. sendFlowers          — collect SOL payment then place the real order
 *
 * Required env vars:
 *   FLORIST_ONE_API_KEY          — Florist One API key (from api-signup)
 *   FLORIST_ONE_API_PASSWORD     — Florist One API password
 *   FLORIST_CC_NUMBER            — Company credit card number (digits only)
 *   FLORIST_CC_EXPIRY            — Card expiry in MMYY format, e.g. "0828"
 *   FLORIST_CC_CVV               — Card CVV
 *   FLORIST_CC_ZIP               — Card billing zip code
 *   FLORIST_CC_NAME              — Cardholder full name
 *   FLORIST_COMPANY_EMAIL        — Platform contact email for orders
 *   FLORIST_COMPANY_NAME         — Platform / company display name
 *   FLORIST_COMPANY_PHONE        — Platform phone (10 digits, no spaces)
 *   FLORIST_COMPANY_ADDRESS      — Billing street address
 *   FLORIST_COMPANY_CITY         — Billing city
 *   FLORIST_COMPANY_STATE        — Billing state (2-char code)
 *   FLORIST_COMPANY_ZIP          — Billing zip code
 *
 * @see https://florist.one/api/documentation/
 */

import { tool } from "ai";
import { z } from "zod";

import type { BillingContext } from "@/lib/x402";

// ── Constants ────────────────────────────────────────────────────────────────

const FLORIST_API_BASE = "https://www.floristone.com/api/rest/flowershop";

/**
 * All valid Florist One category codes with human-readable labels.
 */
export const FLOWER_CATEGORIES: Record<string, string> = {
  // Occasions
  bs: "Best Sellers",
  ao: "Every Day",
  bd: "Birthday",
  an: "Anniversary",
  lr: "Love & Romance",
  gw: "Get Well",
  nb: "New Baby",
  ty: "Thank You",
  sy: "Funeral & Sympathy",
  // Product types
  c: "Centerpieces",
  o: "One-Sided Arrangements",
  v: "Vased Arrangements",
  r: "Roses",
  x: "Fruit Baskets",
  p: "Plants",
  b: "Balloons",
  // Funeral specific
  fbs: "Funeral Best Sellers",
  fa: "Funeral Table Arrangements",
  fb: "Funeral Baskets",
  fs: "Funeral Sprays",
  fp: "Funeral Plants",
  fl: "Funeral Inside Casket",
  fw: "Funeral Wreaths",
  fh: "Funeral Hearts",
  fx: "Funeral Crosses",
  fc: "Funeral Casket Sprays",
  fu: "Funeral Urn Arrangements",
  // Price range
  u60: "Flowers Under $60",
  "60t80": "Flowers $60–$80",
  "80t100": "Flowers $80–$100",
  a100: "Flowers Over $100",
  fu60: "Funeral Flowers Under $60",
  f60t80: "Funeral Flowers $60–$80",
  f80t100: "Funeral Flowers $80–$100",
  fa100: "Funeral Flowers Over $100",
  // All
  all: "All Products",
  // Seasonal
  cm: "Christmas",
  ea: "Easter",
  vd: "Valentine's Day",
  md: "Mother's Day",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a base64-encoded Basic Auth header from stored env credentials.
 */
function floristAuthHeader(): string {
  const key = process.env.FLORIST_ONE_API_KEY ?? "";
  const pass = process.env.FLORIST_ONE_API_PASSWORD ?? "";
  return `Basic ${Buffer.from(`${key}:${pass}`).toString("base64")}`;
}

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Shared fetch wrapper for Florist One REST API with a 15 s timeout.
 *
 * When `options.body` is a FormData instance the Content-Type header is
 * intentionally omitted so that `fetch` can set the multipart boundary itself.
 * All other requests default to application/json.
 */
async function floristFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const isFormData = options.body instanceof FormData;

    const res = await fetch(`${FLORIST_API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: floristAuthHeader(),
        // Never set Content-Type for multipart/form-data — fetch adds the
        // boundary automatically. Only force JSON for non-body requests.
        ...(isFormData
          ? {}
          : { "Content-Type": "application/json; charset=utf-8" }),
        ...(options.headers as Record<string, string>),
      },
    });
    clearTimeout(timer);

    const text = await res.text();
    let data: T;

    try {
      data = JSON.parse(text) as T;
    } catch {
      return { ok: false, error: `Non-JSON response: ${text.slice(0, 200)}` };
    }

    if (!res.ok) {
      const msg =
        (data as Record<string, string>)?.error ??
        (data as Record<string, string>)?.message ??
        `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }

    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

// ── Authorize.net server-side tokenization ────────────────────────────────────

interface AuthNetKeyResponse {
  USERNAME: string;
  AUTHORIZENET_KEY: string;
  AUTHORIZENET_URL: string;
}

interface OpaqueData {
  dataDescriptor: string;
  dataValue: string;
}

/**
 * Tokenize the stored company credit card using Authorize.net's
 * securePaymentContainerRequest (server-side Accept.JS equivalent).
 *
 * Florist One's getauthorizenetkey endpoint returns the merchant credentials
 * (public key + login) required to tokenize through their Authorize.net account.
 * This avoids storing or transmitting raw card data to Florist One.
 */
async function tokenizeCompanyCard(): Promise<
  { ok: true; opaqueData: OpaqueData } | { ok: false; error: string }
> {
  // 1. Fetch Florist One's Authorize.net public credentials
  const keyRes = await floristFetch<AuthNetKeyResponse>("/getauthorizenetkey");
  if (!keyRes.ok) {
    return { ok: false, error: `Failed to get payment key: ${keyRes.error}` };
  }

  const {
    USERNAME: loginId,
    AUTHORIZENET_KEY: clientKey,
    AUTHORIZENET_URL,
  } = keyRes.data;

  // Determine whether to use sandbox or production Authorize.net API
  const isSandbox = AUTHORIZENET_URL.includes("jstest");
  const authNetApiUrl = isSandbox
    ? "https://apitest.authorize.net/xml/v1/request.api"
    : "https://api.authorize.net/xml/v1/request.api";

  // 2. Build tokenization request with company card details
  const cardNumber = process.env.FLORIST_CC_NUMBER ?? "";
  const expiryRaw = process.env.FLORIST_CC_EXPIRY ?? ""; // MMYY, e.g. "0828"
  const cvv = process.env.FLORIST_CC_CVV ?? "";
  const zip = process.env.FLORIST_CC_ZIP ?? "";
  const fullName = process.env.FLORIST_CC_NAME ?? "";

  if (!cardNumber || !expiryRaw || !cvv || !zip || !fullName) {
    return {
      ok: false,
      error:
        "Company payment card is not configured. Please set FLORIST_CC_* environment variables.",
    };
  }

  // Authorize.net securePaymentContainerRequest expects YYYY-MM format.
  // The env var uses MMYY (e.g. "0828"), so we convert here.
  const expirationDate =
    expiryRaw.length === 4
      ? `20${expiryRaw.slice(2, 4)}-${expiryRaw.slice(0, 2)}`
      : expiryRaw;

  const tokenRequest = {
    securePaymentContainerRequest: {
      merchantAuthentication: {
        name: loginId,
        clientKey,
      },
      data: {
        type: "TOKEN",
        id: `florist-${Date.now()}`,
        token: {
          cardNumber,
          expirationDate,
          cardCode: cvv,
          zip,
          fullName,
        },
      },
    },
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const tokenRes = await fetch(authNetApiUrl, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokenRequest),
    });
    clearTimeout(timer);

    const tokenData = (await tokenRes.json()) as {
      opaqueData?: OpaqueData;
      messages?: {
        resultCode: string;
        message: Array<{ code: string; text: string }>;
      };
      errorResponse?: {
        messages?: { message: Array<{ code: string; text: string }> };
      };
    };

    if (
      tokenData.messages?.resultCode !== "Ok" ||
      !tokenData.opaqueData?.dataValue
    ) {
      const errMsg =
        tokenData.messages?.message?.[0]?.text ??
        tokenData.errorResponse?.messages?.message?.[0]?.text ??
        "Card tokenization failed";
      return { ok: false, error: errMsg };
    }

    return { ok: true, opaqueData: tokenData.opaqueData };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Authorize.net request failed",
    };
  }
}

// ── browseFlowers ─────────────────────────────────────────────────────────────

interface FloristProduct {
  CODE: string;
  NAME: string;
  PRICE: number;
  DESCRIPTION: string;
  DIMENSION: string;
  LARGE: string;
  SMALL: string;
}

interface ProductsResponse {
  PRODUCTS: FloristProduct[];
  TOTAL: number;
}

const browseFlowersSchema = z.object({
  category: z
    .string()
    .default("bs")
    .describe(
      `Category code. Common values: bs=Best Sellers, bd=Birthday, an=Anniversary, lr=Love & Romance, gw=Get Well, nb=New Baby, ty=Thank You, sy=Funeral & Sympathy, r=Roses, p=Plants, u60=Under $60, a100=Over $100. Full list: ${Object.entries(
        FLOWER_CATEGORIES,
      )
        .slice(0, 20)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`,
    ),
  count: z
    .number()
    .min(1)
    .max(24)
    .default(8)
    .describe("Number of products to return (1–24)"),
  start: z
    .number()
    .min(1)
    .default(1)
    .describe(
      "Item offset for pagination. For page 2 of 8 results, use start=9.",
    ),
  sorttype: z
    .enum(["pa", "pd", "az", "za"])
    .optional()
    .describe("Sort: pa=price asc, pd=price desc, az=A-Z, za=Z-A"),
});

/**
 * Browse Florist One products by category or occasion.
 */
export const browseFlowers = tool({
  description:
    "Browse available flower arrangements, bouquets, plants, and gifts by category or occasion. Returns product names, prices, descriptions, and image URLs.",
  inputSchema: browseFlowersSchema,
  execute: async (input: z.infer<typeof browseFlowersSchema>) => {
    const params = new URLSearchParams({
      category: input.category,
      count: String(input.count),
      start: String(input.start),
    });
    if (input.sorttype) params.set("sorttype", input.sorttype);

    const res = await floristFetch<ProductsResponse>(
      `/getproducts?${params.toString()}`,
    );

    if (!res.ok) {
      return { error: res.error };
    }

    const products = res.data.PRODUCTS.map((p) => ({
      code: p.CODE,
      name: p.NAME,
      price: p.PRICE,
      description: p.DESCRIPTION,
      dimensions: p.DIMENSION,
      imageUrl: p.LARGE,
      thumbnailUrl: p.SMALL,
    }));

    return {
      category: FLOWER_CATEGORIES[input.category] ?? input.category,
      totalAvailable: res.data.TOTAL,
      products,
    };
  },
});

// ── checkFlowerDelivery ───────────────────────────────────────────────────────

interface DeliveryDatesResponse {
  DATES?: string[];
  DATE_AVAILABLE?: boolean;
}

const checkFlowerDeliverySchema = z.object({
  zipcode: z
    .string()
    .describe(
      "Recipient's US zip code (5 digits) or Canadian postal code (A1A 1A1)",
    ),
  date: z
    .string()
    .optional()
    .describe(
      "Optional specific date to check availability (YYYY-MM-DD). Omit to get all available dates in the next 30 days.",
    ),
});

/**
 * Check available flower delivery dates for a zip code.
 */
export const checkFlowerDelivery = tool({
  description:
    "Check available delivery dates for flowers to a specific zip code. Returns a list of all available dates in the next 30 days, or confirms if a specific date is available. Note: no Sunday deliveries.",
  inputSchema: checkFlowerDeliverySchema,
  execute: async (input: z.infer<typeof checkFlowerDeliverySchema>) => {
    const params = new URLSearchParams({ zipcode: input.zipcode });
    if (input.date) params.set("date", input.date);

    const res = await floristFetch<DeliveryDatesResponse>(
      `/checkdeliverydate?${params.toString()}`,
    );

    if (!res.ok) {
      return { error: res.error };
    }

    if (input.date) {
      return {
        zipcode: input.zipcode,
        date: input.date,
        available: res.data.DATE_AVAILABLE ?? false,
      };
    }

    return {
      zipcode: input.zipcode,
      availableDates: res.data.DATES ?? [],
    };
  },
});

// ── getFlowerQuote ────────────────────────────────────────────────────────────

interface TotalResponse {
  SUBTOTAL: number;
  FLORISTONEDELIVERYCHARGE: number;
  DELIVERYCHARGETOTAL?: number;
  TAXTOTAL: number;
  FLORISTONETAX?: number;
  ORDERTOTAL: number;
  ORDERNO: number;
}

const getFlowerQuoteSchema = z.object({
  productCode: z.string().describe("Florist One product code, e.g. 'F1-509'"),
  productPrice: z
    .number()
    .describe("Product base price in USD (from browseFlowers)"),
  recipientZipcode: z
    .string()
    .describe("Recipient's zip code (used to calculate delivery charge)"),
});

/**
 * Get a full price quote for a flower order including delivery and tax.
 */
export const getFlowerQuote = tool({
  description:
    "Get the exact total for a flower order including product price, delivery charge, and tax. Always call this before sendFlowers so the user knows the full SOL cost.",
  inputSchema: getFlowerQuoteSchema,
  execute: async (input: z.infer<typeof getFlowerQuoteSchema>) => {
    const products = JSON.stringify([
      {
        PRICE: input.productPrice,
        RECIPIENT: { ZIPCODE: input.recipientZipcode },
        CODE: input.productCode,
      },
    ]);

    const params = new URLSearchParams({ products });
    const res = await floristFetch<TotalResponse>(
      `/gettotal?${params.toString()}`,
    );

    if (!res.ok) {
      return { error: res.error };
    }

    const orderTotal = res.data.ORDERTOTAL;

    return {
      productCode: input.productCode,
      subtotal: res.data.SUBTOTAL,
      deliveryCharge: res.data.FLORISTONEDELIVERYCHARGE,
      tax: res.data.TAXTOTAL,
      orderTotal,
      totalChargedToUser: orderTotal,
      note: `You will be charged $${orderTotal.toFixed(2)} USD in SOL for this order.`,
    };
  },
});

// ── sendFlowers ───────────────────────────────────────────────────────────────

interface PlaceOrderResponse {
  SUBTOTAL: number;
  FLORISTONEDELIVERYCHARGE: number;
  TAXTOTAL?: number;
  FLORISTONETAX?: number;
  ORDERTOTAL: number;
  ORDERNO: number;
}

const recipientSchema = z.object({
  name: z.string().max(100).describe("Recipient's full name"),
  address1: z.string().max(100).describe("Street address"),
  address2: z.string().max(100).optional().describe("Apt, suite, etc."),
  city: z.string().max(100).describe("City"),
  state: z.string().length(2).describe("2-letter state code, e.g. 'CA'"),
  zipcode: z.string().describe("5-digit US zip code"),
  country: z.string().length(2).default("US").describe("2-letter country code"),
  phone: z
    .string()
    .regex(/^\d{10}$/, "Must be exactly 10 digits with no spaces or dashes")
    .describe("Recipient phone number — exactly 10 digits, e.g. '4155550100'"),
  institution: z
    .string()
    .max(100)
    .optional()
    .describe("Optional: funeral home, hospital, or facility name"),
});

const sendFlowersSchema = z.object({
  productCode: z.string().describe("Florist One product code, e.g. 'F1-509'"),
  productPrice: z.number().describe("Product base price in USD"),
  deliveryDate: z
    .string()
    .describe(
      "Delivery date in YYYY-MM-DD format. Use checkFlowerDelivery to confirm availability.",
    ),
  recipient: recipientSchema.describe("Who receives the flowers"),
  cardMessage: z
    .string()
    .max(500)
    .optional()
    .describe("Personal card message to include with the flowers"),
  confirmedTotalUsd: z
    .number()
    .describe(
      "The total USD amount the user confirmed they will pay (from getFlowerQuote totalChargedToUser). This prevents surprise charges.",
    ),
  allowSubstitutions: z
    .boolean()
    .default(true)
    .describe("Allow minor flower substitutions if exact flowers unavailable"),
  senderIp: z
    .string()
    .optional()
    .describe(
      "IPv4 or IPv6 address of the user placing the order. Pass the request IP if available.",
    ),
});

/**
 * Create flower tools with optional billing context for SOL payment collection.
 *
 * Billing flow for sendFlowers:
 * 1. Verify order total matches user-confirmed amount
 * 2. Charge user in SOL via billingContext.chargeUsage()
 * 3. Tokenize company card via Authorize.net server-side API
 * 4. Place order with Florist One (company card is charged)
 * 5. Return Florist One order number on success
 */
export function createFlowerTools(billingContext?: BillingContext) {
  const sendFlowers = tool({
    description:
      "Send real flowers to someone. Collects payment in SOL from the user then places the order using the platform's card. Always call getFlowerQuote first and confirm the total with the user before calling this.",
    inputSchema: sendFlowersSchema,
    // Explicitly non-interactive so autonomous tasks can execute purchases.
    needsApproval: false,
    execute: async (input: z.infer<typeof sendFlowersSchema>) => {
      // Declared outside try so it remains accessible in the catch block.
      // If the catch fires after SOL was collected, the TX signature is still
      // returned so the user can contact support for a refund.
      let solTxSignature = "";

      try {
        // 1. Verify Florist One credentials are configured
        if (
          !process.env.FLORIST_ONE_API_KEY ||
          !process.env.FLORIST_ONE_API_PASSWORD
        ) {
          return {
            error:
              "Flower delivery is not yet configured on this platform. Please contact support.",
          };
        }

        // Verify all required company billing env vars before touching the
        // payment flow. Missing vars would cause silent fallbacks to placeholder
        // data being attached to the company card.
        const requiredCompanyVars: Record<string, string | undefined> = {
          FLORIST_COMPANY_NAME: process.env.FLORIST_COMPANY_NAME,
          FLORIST_COMPANY_EMAIL: process.env.FLORIST_COMPANY_EMAIL,
          FLORIST_COMPANY_PHONE: process.env.FLORIST_COMPANY_PHONE,
          FLORIST_COMPANY_ADDRESS: process.env.FLORIST_COMPANY_ADDRESS,
          FLORIST_COMPANY_CITY: process.env.FLORIST_COMPANY_CITY,
          FLORIST_COMPANY_STATE: process.env.FLORIST_COMPANY_STATE,
          FLORIST_COMPANY_ZIP: process.env.FLORIST_COMPANY_ZIP,
        };
        const missingVars = Object.entries(requiredCompanyVars)
          .filter(([, v]) => !v)
          .map(([k]) => k);
        if (missingVars.length > 0) {
          return {
            error: `Flower delivery is misconfigured — missing env vars: ${missingVars.join(", ")}. Please contact support.`,
          };
        }

        // 2. Re-verify the total with Florist One (prevents price manipulation)
        const products = JSON.stringify([
          {
            PRICE: input.productPrice,
            RECIPIENT: { ZIPCODE: input.recipient.zipcode },
            CODE: input.productCode,
          },
        ]);
        const totalParams = new URLSearchParams({ products });
        const totalRes = await floristFetch<TotalResponse>(
          `/gettotal?${totalParams.toString()}`,
        );

        if (!totalRes.ok) {
          return {
            error: `Could not verify order total: ${totalRes.error}`,
          };
        }

        const orderTotal = totalRes.data.ORDERTOTAL;
        const totalCharged = orderTotal;

        // Reject if confirmed total differs by more than $0.05 (rounding tolerance).
        // A $1 window was too loose and could mask price manipulation.
        if (Math.abs(totalCharged - input.confirmedTotalUsd) > 0.05) {
          return {
            error: `Order total mismatch. Expected $${totalCharged.toFixed(2)} but user confirmed $${input.confirmedTotalUsd.toFixed(2)}. Please call getFlowerQuote again and confirm the updated total.`,
            currentTotal: totalCharged,
          };
        }

        // 3. Collect SOL payment from user BEFORE placing order.
        //    Fail closed: if there is no billing context the order is blocked.
        //    We must never touch the company card unless payment is confirmed on-chain.
        if (!billingContext) {
          return {
            error:
              "Flower orders require an authenticated session with a linked wallet. Please log in and try again.",
          };
        }

        const chargeResult = await billingContext.chargeUsage(
          totalCharged,
          `Flower order (${input.productCode}) → ${input.recipient.name}`,
        );

        if (!chargeResult.success) {
          return {
            error: `SOL payment failed — order was not placed. ${chargeResult.error ?? "Please ensure your wallet has sufficient funds and try again."}`,
          };
        }

        // chargeResult.transaction is the confirmed on-chain Solana TX signature
        solTxSignature = chargeResult.transaction ?? "";
        console.log(
          `[Flowers] SOL payment confirmed: $${totalCharged} (${chargeResult.solCost} SOL) tx=${solTxSignature} for order to ${input.recipient.name}`,
        );

        // 4. Tokenize company card via Authorize.net.
        //    SOL has already been collected at this point — include the TX in
        //    the error response so the user can claim a refund if this fails.
        const tokenRes = await tokenizeCompanyCard();
        if (!tokenRes.ok) {
          return {
            error: `Card tokenization failed after SOL payment was confirmed: ${tokenRes.error}. Your SOL payment TX is ${solTxSignature}. Please contact support with this transaction ID for a full refund.`,
            solPaymentTx: solTxSignature,
            solanaExplorerUrl: solTxSignature
              ? `https://solscan.io/tx/${solTxSignature}`
              : undefined,
          };
        }

        // 5. Build and place the order.
        //
        //    Key conventions confirmed from Florist One PHP sample code:
        //    - customer and products objects use lowercase field names
        //    - POST body is multipart/form-data (not JSON)
        //    - ccinfo uses lowercase key "authorizenet_token"
        //    - phone fields are strings, not integers

        const companyPhone = (process.env.FLORIST_COMPANY_PHONE ?? "").replace(
          /\D/g,
          "",
        );

        const customer = JSON.stringify({
          name: process.env.FLORIST_COMPANY_NAME,
          email: process.env.FLORIST_COMPANY_EMAIL,
          phone: companyPhone,
          address1: process.env.FLORIST_COMPANY_ADDRESS,
          address2: "",
          city: process.env.FLORIST_COMPANY_CITY,
          state: process.env.FLORIST_COMPANY_STATE,
          zipcode: process.env.FLORIST_COMPANY_ZIP,
          country: "US",
          // Only include ip when a real sender IP is available.
          // Omitting is safer than submitting a placeholder that looks suspicious.
          ...(input.senderIp ? { ip: input.senderIp } : {}),
        });

        const orderProducts = JSON.stringify([
          {
            code: input.productCode,
            price: input.productPrice,
            deliverydate: input.deliveryDate,
            cardmessage: input.cardMessage ?? "",
            recipient: {
              name: input.recipient.name,
              address1: input.recipient.address1,
              address2: input.recipient.address2 ?? "",
              city: input.recipient.city,
              state: input.recipient.state,
              zipcode: input.recipient.zipcode,
              country: input.recipient.country,
              // phone validated as /^\d{10}$/ by Zod — keep as string per API spec
              phone: input.recipient.phone,
              institution: input.recipient.institution ?? "",
            },
          },
        ]);

        // ccinfo key must be lowercase "authorizenet_token" per Florist One docs.
        const ccinfo = JSON.stringify({
          authorizenet_token: tokenRes.opaqueData.dataValue,
        });

        // Florist One placeorder expects multipart/form-data (matching PHP sample).
        // Using FormData lets fetch set the correct Content-Type + boundary automatically.
        const formBody = new FormData();
        formBody.append("customer", customer);
        formBody.append("products", orderProducts);
        formBody.append("ccinfo", ccinfo);
        formBody.append("ordertotal", String(orderTotal));
        formBody.append(
          "allowsubstitutions",
          input.allowSubstitutions ? "1" : "0",
        );

        const orderRes = await floristFetch<PlaceOrderResponse>("/placeorder", {
          method: "POST",
          body: formBody,
        });

        if (!orderRes.ok) {
          return {
            error: `Order placement failed after SOL payment was confirmed: ${orderRes.error}. Your SOL payment TX is ${solTxSignature}. Please contact support with this transaction ID for a full refund.`,
            solPaymentTx: solTxSignature,
            solanaExplorerUrl: solTxSignature
              ? `https://solscan.io/tx/${solTxSignature}`
              : undefined,
          };
        }

        const order = orderRes.data;
        const taxTotal = order.TAXTOTAL ?? order.FLORISTONETAX ?? 0;

        return {
          success: true,
          orderNumber: order.ORDERNO,
          recipient: input.recipient.name,
          deliveryDate: input.deliveryDate,
          productCode: input.productCode,
          subtotal: order.SUBTOTAL,
          deliveryCharge: order.FLORISTONEDELIVERYCHARGE,
          tax: taxTotal,
          orderTotal: order.ORDERTOTAL,
          totalPaidUsd: totalCharged,
          solPaymentTx: solTxSignature,
          solanaExplorerUrl: solTxSignature
            ? `https://solscan.io/tx/${solTxSignature}`
            : undefined,
          message: `Order #${order.ORDERNO} confirmed! Flowers will be delivered to ${input.recipient.name} on ${input.deliveryDate}. SOL payment: ${solTxSignature}`,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[Flowers] sendFlowers unexpected error:", err);
        // Include TX signature if SOL was already collected before the crash
        return {
          error: solTxSignature
            ? `Unexpected error after SOL payment was confirmed: ${message}. Your SOL payment TX is ${solTxSignature}. Please contact support for a refund.`
            : message,
          ...(solTxSignature && {
            solPaymentTx: solTxSignature,
            solanaExplorerUrl: `https://solscan.io/tx/${solTxSignature}`,
          }),
        };
      }
    },
  });

  return {
    browseFlowers,
    checkFlowerDelivery,
    getFlowerQuote,
    sendFlowers,
  };
}

/**
 * Default flower tools bundle (no billing — for non-payment contexts).
 * Note: sendFlowers will reject at runtime if called without a billing context.
 */
export const flowerTools = createFlowerTools();
