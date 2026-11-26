const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authLimiter } = require("../middlewares/rateLimit.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/auth.schema");

const router = express.Router();

router.post(
  "/register",
  authLimiter,
  validate({ body: schemas.registerSchema }),
  authController.register,
);
router.post("/login", authLimiter, validate({ body: schemas.loginSchema }), authController.login);
router.post("/refresh", validate({ body: schemas.refreshSchema }), authController.refresh);
router.post("/logout", validate({ body: schemas.refreshSchema }), authController.logout);
router.post("/logout-all", authenticate, authController.logoutAll);
router.post("/email-otp", authLimiter, authenticate, authController.sendEmailOtp);
router.post(
  "/email-verification",
  authLimiter,
  authenticate,
  validate({ body: schemas.verifyEmailSchema }),
  authController.verifyEmail,
);
router.post(
  "/password-reset-otp",
  authLimiter,
  validate({ body: schemas.passwordResetRequestSchema }),
  authController.sendPasswordResetOtp,
);
router.post(
  "/password-reset",
  authLimiter,
  validate({ body: schemas.passwordResetSchema }),
  authController.resetPassword,
);

module.exports = router;
