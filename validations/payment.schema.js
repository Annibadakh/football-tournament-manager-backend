const { z } = require("zod");
const { OFFLINE_PAYMENT_MODE, PAYMENT_RULES } = require("../constants/payment.constants");

const paymentIdParamSchema = z.object({ paymentId: z.uuid("Invalid payment id") });

const gatewayIdField = (label) => z.string().trim().min(1, `${label} is required`).max(40);

const checkoutVerificationSchema = z.object({
  orderId: gatewayIdField("Order id"),
  paymentId: gatewayIdField("Payment id"),
  signature: z.string().trim().min(1, "Signature is required").max(128),
});

const checkoutFailureSchema = z.object({
  reason: z.string().trim().min(1).max(PAYMENT_RULES.FAILURE_REASON_MAX_LENGTH),
});

// Offline confirmation by the organizer (amount in rupees, up to 2 decimals)
const offlinePaymentSchema = z.object({
  amount: z
    .number({ error: "Amount is required" })
    .min(0, "Amount can't be negative")
    .max(PAYMENT_RULES.MAX_OFFLINE_AMOUNT)
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
      "Use at most 2 decimals",
    ),
  mode: z.enum(OFFLINE_PAYMENT_MODE, { error: "Choose how the team paid" }),
  reference: z.string().trim().max(PAYMENT_RULES.REFERENCE_MAX_LENGTH).optional(),
});

const receiptQuerySchema = z.object({
  download: z
    .enum(["0", "1"])
    .optional()
    .transform((value) => value === "1"),
});

module.exports = {
  paymentIdParamSchema,
  checkoutVerificationSchema,
  checkoutFailureSchema,
  offlinePaymentSchema,
  receiptQuerySchema,
};
