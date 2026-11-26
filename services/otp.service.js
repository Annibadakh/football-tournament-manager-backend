const config = require("../config/env");
const otpRepository = require("../repositories/otp.repository");
const emailService = require("./email.service");
const emailTemplates = require("../utils/emailTemplates");
const ApiError = require("../utils/ApiError");
const { generateNumericCode, safeEqual, sha256 } = require("../utils/crypto");
const { OTP_PURPOSE, OTP_RULES } = require("../constants/auth.constants");
const { ERROR_CODES, HTTP_STATUS } = require("../constants/common.constants");

const TEMPLATE_BY_PURPOSE = {
  [OTP_PURPOSE.EMAIL_VERIFY]: emailTemplates.emailVerificationOtp,
  [OTP_PURPOSE.PASSWORD_RESET]: emailTemplates.passwordResetOtp,
};

// Bound to user + purpose and peppered with the server secret, so a leaked hash is useless elsewhere
const hashOtp = (userId, purpose, code) =>
  sha256(`${userId}:${purpose}:${code}:${config.auth.accessSecret}`);

const invalidCodeError = (message = "The code is invalid or has expired") =>
  ApiError.badRequest(message, [{ field: "otp", message }]);

const assertResendAllowed = (latestOtp) => {
  if (!latestOtp || latestOtp.consumedAt) return;
  const secondsSinceSent = (Date.now() - latestOtp.createdAt.getTime()) / 1000;
  const waitSeconds = Math.ceil(OTP_RULES.RESEND_COOLDOWN_SECONDS - secondsSinceSent);
  if (waitSeconds > 0) {
    throw new ApiError(
      HTTP_STATUS.TOO_MANY_REQUESTS,
      ERROR_CODES.RATE_LIMITED,
      `Please wait ${waitSeconds} seconds before requesting a new code`,
    );
  }
};

const issueOtp = async (user, purpose) => {
  assertResendAllowed(await otpRepository.findLatestOtp(user.id, purpose));

  const code = generateNumericCode(OTP_RULES.LENGTH);
  await otpRepository.consumeOpenOtps(user.id, purpose);
  await otpRepository.createOtp({
    userId: user.id,
    purpose,
    codeHash: hashOtp(user.id, purpose, code),
    expiresAt: new Date(Date.now() + OTP_RULES.TTL_MINUTES * 60 * 1000),
  });

  const template = TEMPLATE_BY_PURPOSE[purpose];
  await emailService.sendEmail({
    to: user.email,
    ...template({ fullName: user.fullName, code, ttlMinutes: OTP_RULES.TTL_MINUTES }),
  });
};

/**
 * Consumes the latest code if it matches. Failed attempts are recorded outside the caller's
 * transaction so a rollback can't reset the attempt counter.
 */
const verifyOtp = async (user, purpose, code, { transaction } = {}) => {
  const otp = await otpRepository.findLatestOtp(user.id, purpose);
  if (!otp || otp.consumedAt || otp.expiresAt < new Date()) throw invalidCodeError();
  if (otp.attempts >= OTP_RULES.MAX_ATTEMPTS)
    throw invalidCodeError("Too many attempts. Please request a new code");

  if (!safeEqual(otp.codeHash, hashOtp(user.id, purpose, code))) {
    await otpRepository.incrementOtpAttempts(otp);
    throw invalidCodeError("Incorrect code");
  }
  await otpRepository.markOtpConsumed(otp, { transaction });
};

module.exports = { issueOtp, verifyOtp };
