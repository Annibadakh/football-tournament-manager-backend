// Stored as TINYINT; labels live in the frontend
const PAYMENT_METHOD = Object.freeze({
  ONLINE: 1,
  OFFLINE: 2,
});

const PAYMENT_STATUS = Object.freeze({
  // Razorpay order exists, money not received yet (retries reuse it)
  CREATED: 1,
  PAID: 2,
  // Money arrived after the team was confirmed another way, withdrawn or removed
  REFUND_DUE: 3,
});

const OFFLINE_PAYMENT_MODE = Object.freeze({
  CASH: 1,
  UPI: 2,
  BANK_TRANSFER: 3,
  OTHER: 4,
});

// Statuses that carry a receipt
const RECEIPT_STATUSES = [PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUND_DUE];

const PAYMENT_RULES = Object.freeze({
  CURRENCY: "INR",
  RECEIPT_PREFIX: "MDN",
  MAX_OFFLINE_AMOUNT: 1000000,
  REFERENCE_MAX_LENGTH: 100,
  FAILURE_REASON_MAX_LENGTH: 255,
});

// Razorpay webhook events we act on
const GATEWAY_EVENT = Object.freeze({
  PAYMENT_CAPTURED: "payment.captured",
  ORDER_PAID: "order.paid",
  PAYMENT_FAILED: "payment.failed",
});

module.exports = {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  OFFLINE_PAYMENT_MODE,
  RECEIPT_STATUSES,
  PAYMENT_RULES,
  GATEWAY_EVENT,
};
