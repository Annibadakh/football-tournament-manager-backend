const { rateLimit } = require("express-rate-limit");
const config = require("../config/env");
const ApiError = require("../utils/ApiError");
const { ERROR_CODES, HTTP_STATUS } = require("../constants/common.constants");

const createLimiter = (max) =>
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => config.isTest,
    // Route through the error middleware so the response keeps the standard envelope
    handler: (req, res, next) =>
      next(
        new ApiError(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          ERROR_CODES.RATE_LIMITED,
          "Too many requests. Please try again later.",
        ),
      ),
  });

const apiLimiter = createLimiter(config.rateLimit.max);

// Stricter limit for login, OTP and password reset routes (wired in Phase 1)
const authLimiter = createLimiter(config.rateLimit.authMax);

module.exports = { apiLimiter, authLimiter };
