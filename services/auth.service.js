const { sequelize } = require("../models");
const logger = require("../config/logger");
const userRepository = require("../repositories/user.repository");
const otpService = require("./otp.service");
const tokenService = require("./token.service");
const { hashPassword, verifyPassword, assertPhoneAvailable } = require("./password.service");
const ApiError = require("../utils/ApiError");
const { OTP_PURPOSE } = require("../constants/auth.constants");
const { ACCOUNT_ROLE, ACCOUNT_STATUS } = require("../constants/user.constants");

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

// Guests and unverified sign-ups may (re)register; verified or staff accounts may not (business rule 2.3)
const isClaimableBySignup = (user) =>
  user.accountRole === ACCOUNT_ROLE.MEMBER &&
  [ACCOUNT_STATUS.GUEST, ACCOUNT_STATUS.PENDING_VERIFICATION].includes(user.accountStatus);

const emailTakenError = () => {
  const message = "An account with this email already exists. Please log in.";
  return ApiError.conflict(message, [{ field: "email", message }]);
};

// A failed email must not undo a successful sign-up; the user can resend the code
const sendVerificationOtpSafely = async (user) => {
  try {
    await otpService.issueOtp(user, OTP_PURPOSE.EMAIL_VERIFY);
  } catch (err) {
    logger.warn({ err, userId: user.id }, "Could not send verification OTP after sign-up");
  }
};

const register = async ({ fullName, email, password }, context) => {
  const existing = await userRepository.findUserByEmail(email);
  if (existing && !isClaimableBySignup(existing)) throw emailTakenError();

  const passwordHash = await hashPassword(password);
  const pendingFields = {
    fullName,
    passwordHash,
    accountStatus: ACCOUNT_STATUS.PENDING_VERIFICATION,
  };

  const user = existing
    ? await userRepository.updateUser(existing, pendingFields)
    : await userRepository.createUser({
        ...pendingFields,
        email,
        accountRole: ACCOUNT_ROLE.MEMBER,
      });

  await sendVerificationOtpSafely(user);
  const session = await tokenService.createSession(user, context);
  return { user, session };
};

const login = async ({ email, password }, context) => {
  const user = await userRepository.findUserByEmail(email, { withPassword: true });
  const isPasswordValid = await verifyPassword(password, user?.passwordHash);
  if (!user || !user.passwordHash || !isPasswordValid)
    throw ApiError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
  if (user.accountStatus === ACCOUNT_STATUS.BLOCKED) {
    throw ApiError.forbidden("Your account has been blocked. Please contact support.");
  }

  await userRepository.updateUser(user, { lastLoginAt: new Date() });
  const session = await tokenService.createSession(user, context);
  return { user, session };
};

const assertNotVerified = (user) => {
  if (user.accountStatus === ACCOUNT_STATUS.VERIFIED)
    throw ApiError.conflict("Your account is already verified");
};

const sendEmailVerificationOtp = async (user) => {
  assertNotVerified(user);
  await otpService.issueOtp(user, OTP_PURPOSE.EMAIL_VERIFY);
};

const verifyEmail = async (user, { otp, phone }) => {
  assertNotVerified(user);
  return sequelize.transaction(async (transaction) => {
    await assertPhoneAvailable(phone, user.id, { transaction });
    await otpService.verifyOtp(user, OTP_PURPOSE.EMAIL_VERIFY, otp, { transaction });
    return userRepository.updateUser(
      user,
      { phone, emailVerifiedAt: new Date(), accountStatus: ACCOUNT_STATUS.VERIFIED },
      { transaction },
    );
  });
};

// Always succeeds from the caller's view so the endpoint can't be used to discover emails
const requestPasswordReset = async ({ email }) => {
  const user = await userRepository.findUserByEmail(email, { withPassword: true });
  if (!user?.passwordHash || user.accountStatus === ACCOUNT_STATUS.BLOCKED) return;
  try {
    await otpService.issueOtp(user, OTP_PURPOSE.PASSWORD_RESET);
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }
};

const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await userRepository.findUserByEmail(email, { withPassword: true });
  if (!user?.passwordHash) {
    const message = "The code is invalid or has expired";
    throw ApiError.badRequest(message, [{ field: "otp", message }]);
  }

  const passwordHash = await hashPassword(newPassword);
  await sequelize.transaction(async (transaction) => {
    await otpService.verifyOtp(user, OTP_PURPOSE.PASSWORD_RESET, otp, { transaction });
    await userRepository.updateUser(user, { passwordHash }, { transaction });
    // A reset means the old password may be compromised: sign out every device
    await tokenService.revokeAllSessions(user.id, { transaction });
  });
};

module.exports = {
  register,
  login,
  sendEmailVerificationOtp,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
};
