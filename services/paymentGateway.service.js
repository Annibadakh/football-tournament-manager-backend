const crypto = require("crypto");
const Razorpay = require("razorpay");
const config = require("../config/env");
const logger = require("../config/logger");
const ApiError = require("../utils/ApiError");

const { keyId, keySecret, webhookSecret, apiUrl } = config.payments;

let client = null;

// Lazily built so the app starts without keys (online payments are then disabled)
const getClient = () => {
  if (!config.payments.isConfigured) {
    throw ApiError.unavailable("Online payments are not set up yet. Please contact the organizer.");
  }
  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    // Local mock gateway for development/tests only (blocked in production by env validation)
    if (apiUrl) client.api.rq.defaults.baseURL = apiUrl;
  }
  return client;
};

const hmacHex = (secret, payload) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

const safeEqual = (expected, received) => {
  const a = Buffer.from(expected);
  const b = Buffer.from(String(received ?? ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Amounts go to Razorpay in paise
const createOrder = async ({ amountPaise, receipt, notes }) => {
  try {
    const order = await getClient().orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes,
    });
    return { orderId: order.id, amountPaise: order.amount };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error?.error ?? error }, "Razorpay order creation failed");
    throw ApiError.unavailable("Couldn't start the payment. Please try again in a moment.");
  }
};

// Checkout success handler signature: HMAC(order_id|payment_id) with the key secret
const isCheckoutSignatureValid = ({ orderId, paymentId, signature }) =>
  Boolean(keySecret) && safeEqual(hmacHex(keySecret, `${orderId}|${paymentId}`), signature);

// Webhook signature: HMAC of the raw request body with the webhook secret
const isWebhookSignatureValid = (rawBody, signature) =>
  Boolean(webhookSecret) && safeEqual(hmacHex(webhookSecret, rawBody), signature);

module.exports = {
  createOrder,
  isCheckoutSignatureValid,
  isWebhookSignatureValid,
  isEnabled: () => config.payments.isConfigured,
  keyId: () => keyId,
};
