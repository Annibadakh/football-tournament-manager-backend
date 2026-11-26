const express = require("express");
const paymentController = require("../controllers/payment.controller");
const { authenticate, requireVerified } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/payment.schema");

const router = express.Router();
const signedIn = [authenticate, requireVerified];
const payment = { params: schemas.paymentIdParamSchema };

// Webhook body arrives raw (see app.js) so its signature can be checked byte for byte
router.post("/webhook", paymentController.handleWebhook);

router.post(
  "/:paymentId/verification",
  ...signedIn,
  validate({ ...payment, body: schemas.checkoutVerificationSchema }),
  paymentController.verifyPayment,
);
router.post(
  "/:paymentId/failure",
  ...signedIn,
  validate({ ...payment, body: schemas.checkoutFailureSchema }),
  paymentController.recordPaymentFailure,
);
// Receipts may be opened by the captain, the organizer or an admin (no verification gate)
router.get(
  "/:paymentId/receipt",
  authenticate,
  validate({ ...payment, query: schemas.receiptQuerySchema }),
  paymentController.downloadReceipt,
);

module.exports = router;
