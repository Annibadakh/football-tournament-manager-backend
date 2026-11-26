import crypto from "crypto";
import { PassThrough } from "stream";
import { createRequire } from "module";
import request from "supertest";

const require = createRequire(import.meta.url);
const app = require("../app");
const { computeCharges } = require("../services/payment.service");
const gateway = require("../services/paymentGateway.service");
const { writeReceipt, formatMoney } = require("../services/receipt.service");
const { offlinePaymentSchema } = require("../validations/payment.schema");
const {
  OFFLINE_PAYMENT_MODE,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} = require("../constants/payment.constants");

const hmac = (secret, payload) => crypto.createHmac("sha256", secret).update(payload).digest("hex");

describe("convenience fee", () => {
  it("adds 2.36% rounded up to the whole rupee", () => {
    expect(computeCharges(1500)).toEqual({
      entryFeePaise: 150000,
      convenienceFeePaise: 3600,
      totalPaise: 153600,
    });
  });

  it("does not round up exact rupee amounts because of float error", () => {
    // 2500 × 2.36% = ₹59 exactly
    expect(computeCharges(2500).convenienceFeePaise).toBe(5900);
    expect(computeCharges("1000.00").totalPaise).toBe(102400);
  });

  it("charges nothing on a free entry", () => {
    expect(computeCharges(0).totalPaise).toBe(0);
  });
});

describe("gateway signatures", () => {
  it("accepts only the correct checkout signature", () => {
    const signature = hmac("test-key-secret", "order_1|pay_1");
    expect(
      gateway.isCheckoutSignatureValid({ orderId: "order_1", paymentId: "pay_1", signature }),
    ).toBe(true);
    expect(
      gateway.isCheckoutSignatureValid({ orderId: "order_1", paymentId: "pay_2", signature }),
    ).toBe(false);
    expect(
      gateway.isCheckoutSignatureValid({ orderId: "order_1", paymentId: "pay_1", signature: "x" }),
    ).toBe(false);
  });

  it("checks webhook signatures against the raw body", () => {
    const body = Buffer.from('{"event":"payment.captured"}');
    expect(gateway.isWebhookSignatureValid(body, hmac("test-webhook-secret", body))).toBe(true);
    expect(
      gateway.isWebhookSignatureValid(Buffer.from("{}"), hmac("test-webhook-secret", body)),
    ).toBe(false);
  });
});

describe("POST /api/v1/payments/webhook", () => {
  it("rejects a bad signature", async () => {
    const res = await request(app)
      .post("/api/v1/payments/webhook")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", "nope")
      .send('{"event":"payment.captured"}');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("acknowledges signed events it doesn't act on", async () => {
    const body = '{"event":"refund.created","payload":{}}';
    const res = await request(app)
      .post("/api/v1/payments/webhook")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", hmac("test-webhook-secret", body))
      .send(body);
    expect(res.status).toBe(200);
  });
});

describe("offline payment schema", () => {
  it("accepts amount, mode and reference", () => {
    const parsed = offlinePaymentSchema.safeParse({
      amount: 1500.5,
      mode: OFFLINE_PAYMENT_MODE.UPI,
      reference: " UTR123 ",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data.reference).toBe("UTR123");
  });

  it("rejects unknown modes and sub-paise amounts", () => {
    expect(offlinePaymentSchema.safeParse({ amount: 10, mode: 9 }).success).toBe(false);
    expect(offlinePaymentSchema.safeParse({ amount: 10.005, mode: 1 }).success).toBe(false);
  });
});

describe("receipt PDF", () => {
  it("formats money in Indian grouping", () => {
    expect(formatMoney("153600.00")).toBe("INR 1,53,600.00");
  });

  it("writes a PDF document", async () => {
    const output = new PassThrough();
    const chunks = [];
    output.on("data", (chunk) => chunks.push(chunk));
    const done = new Promise((resolve) => output.on("end", resolve));
    writeReceipt(output, {
      payment: {
        receiptNumber: "MDN-2027-000001",
        method: PAYMENT_METHOD.ONLINE,
        status: PAYMENT_STATUS.PAID,
        entryFee: "1500.00",
        convenienceFee: "36.00",
        amount: "1536.00",
        gatewayPaymentId: "pay_123",
        paidAt: new Date("2027-03-01T10:00:00Z"),
        paidBy: { fullName: "Akash Shinde" },
      },
      team: { name: "Kopargaon Kings", shortName: "KPK", tournament: { name: "KPL" } },
    });
    await done;
    expect(Buffer.concat(chunks).subarray(0, 5).toString()).toBe("%PDF-");
  });
});
