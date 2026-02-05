/**
 * X402 Validation Schemas
 *
 * Zod schemas for validating x402 payment payloads and requirements.
 */

import { z } from "zod";

/**
 * Supported Solana networks.
 */
export const SolNetworkSchema = z.enum(["solana", "solana-devnet"]);

/**
 * Payment payload from client (x402 protocol).
 */
export const SolPaymentPayloadSchema = z.object({
  x402Version: z.number().int().positive(),
  scheme: z.literal("exact"),
  network: SolNetworkSchema,
  payload: z.object({
    transaction: z.string().min(1, "Transaction is required"),
  }),
});

export type ValidatedSolPaymentPayload = z.infer<
  typeof SolPaymentPayloadSchema
>;

/**
 * Payment requirements for verification/settlement.
 */
export const SolPaymentRequirementsSchema = z.object({
  scheme: z.literal("exact"),
  network: SolNetworkSchema,
  maxAmountRequired: z.string().regex(/^\d+$/, "Must be a numeric string"),
  asset: z.literal("native"),
  payTo: z.string().min(32).max(44), // Solana addresses are 32-44 chars
  resource: z.string(),
  description: z.string(),
  maxTimeoutSeconds: z.number().int().positive(),
  extra: z
    .object({
      usdAmount: z.string().optional(),
      solPrice: z.number().optional(),
    })
    .optional(),
});

export type ValidatedSolPaymentRequirements = z.infer<
  typeof SolPaymentRequirementsSchema
>;

/**
 * Request body for verify endpoint.
 */
export const VerifyRequestSchema = z.object({
  paymentPayload: SolPaymentPayloadSchema,
  paymentRequirements: SolPaymentRequirementsSchema,
});

export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

/**
 * Request body for settle endpoint.
 */
export const SettleRequestSchema = z.object({
  paymentPayload: SolPaymentPayloadSchema,
  paymentRequirements: SolPaymentRequirementsSchema,
});

export type SettleRequest = z.infer<typeof SettleRequestSchema>;

/**
 * Validate and parse request body with a schema.
 * Returns either the validated data or an error response object.
 */
export function validateRequestBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
):
  | { success: true; data: T }
  | { success: false; error: string; issues: z.ZodIssue[] } {
  const result = schema.safeParse(body);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errorMessage = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  return {
    success: false,
    error: errorMessage,
    issues: result.error.issues,
  };
}

/**
 * Privy wallet signTransaction response schema.
 */
export const PrivySignTransactionResponseSchema = z.object({
  signed_transaction: z.string().min(1),
});

export type PrivySignTransactionResponse = z.infer<
  typeof PrivySignTransactionResponseSchema
>;

/**
 * Validate Privy signTransaction response.
 */
export function validatePrivySignResponse(
  response: unknown,
):
  | { success: true; data: PrivySignTransactionResponse }
  | { success: false; error: string } {
  const result = PrivySignTransactionResponseSchema.safeParse(response);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: `Invalid Privy response: ${result.error.message}`,
  };
}
