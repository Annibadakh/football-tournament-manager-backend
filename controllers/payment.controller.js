const paymentService = require("../services/payment.service");
const receiptService = require("../services/receipt.service");
const { sendSuccess } = require("../utils/apiResponse");
const { HTTP_STATUS } = require("../constants/common.constants");

const params = (req) => req.validated.params;
const body = (req) => req.validated.body;

const getTeamPayments = async (req, res) =>
  sendSuccess(res, {
    data: await paymentService.getTeamPayments(req.user, params(req).teamId),
    message: "Payments fetched",
  });

const createPaymentOrder = async (req, res) =>
  sendSuccess(res, {
    data: await paymentService.createPaymentOrder(req.user, params(req).teamId),
    message: "Payment started",
    status: HTTP_STATUS.CREATED,
  });

const verifyPayment = async (req, res) =>
  sendSuccess(res, {
    data: await paymentService.verifyCheckoutPayment(req.user, params(req).paymentId, body(req)),
    message: "Payment received. Your team is confirmed.",
  });

const recordPaymentFailure = async (req, res) =>
  sendSuccess(res, {
    data: await paymentService.recordCheckoutFailure(req.user, params(req).paymentId, body(req)),
    message: "Payment failure noted",
  });

const recordOfflinePayment = async (req, res) =>
  sendSuccess(res, {
    data: await paymentService.recordOfflinePayment(req.user, params(req).teamId, body(req)),
    message: "Payment recorded. Team confirmed.",
  });

// Razorpay retries on non-2xx, so a bad signature is the only rejection
const handleWebhook = async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  await paymentService.handleWebhook(rawBody, req.get("x-razorpay-signature"));
  sendSuccess(res, { data: null, message: "Received" });
};

const downloadReceipt = async (req, res) => {
  const receipt = await paymentService.getReceiptPayment(req.user, params(req).paymentId);
  const disposition = req.validated.query.download ? "attachment" : "inline";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${receipt.payment.receiptNumber}.pdf"`,
  );
  res.setHeader("Cache-Control", "private, no-store");
  receiptService.writeReceipt(res, receipt);
};

module.exports = {
  getTeamPayments,
  createPaymentOrder,
  verifyPayment,
  recordPaymentFailure,
  recordOfflinePayment,
  handleWebhook,
  downloadReceipt,
};
