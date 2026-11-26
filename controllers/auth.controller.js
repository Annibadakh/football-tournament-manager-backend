const config = require("../config/env");
const authService = require("../services/auth.service");
const tokenService = require("../services/token.service");
const userService = require("../services/user.service");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/apiResponse");
const { getClientContext } = require("../utils/requestContext");
const { CLIENT_PLATFORM, REFRESH_COOKIE } = require("../constants/auth.constants");
const { HTTP_STATUS } = require("../constants/common.constants");

const DAY_MS = 24 * 60 * 60 * 1000;

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.auth.cookieSecure,
  sameSite: config.auth.cookieSameSite,
  path: REFRESH_COOKIE.PATH,
});

// Web keeps the refresh token in an httpOnly cookie; apps get it in the body for secure storage
const sendSession = async (req, res, { user, session }, { message, status = HTTP_STATUS.OK }) => {
  const isWeb = getClientContext(req).platform === CLIENT_PLATFORM.WEB;
  if (isWeb) {
    res.cookie(REFRESH_COOKIE.NAME, session.refreshToken, {
      ...refreshCookieOptions(),
      maxAge: config.auth.refreshTokenTtlDays * DAY_MS,
    });
  }
  const data = {
    user: await userService.getMyProfile(user.id),
    accessToken: session.accessToken,
    ...(!isWeb && { refreshToken: session.refreshToken }),
  };
  return sendSuccess(res, { data, message, status });
};

const readRefreshToken = (req) =>
  req.cookies?.[REFRESH_COOKIE.NAME] ?? req.validated?.body?.refreshToken;

const register = async (req, res) => {
  const result = await authService.register(req.validated.body, getClientContext(req));
  return sendSession(req, res, result, {
    message: "Account created. Check your email for the verification code.",
    status: HTTP_STATUS.CREATED,
  });
};

const login = async (req, res) => {
  const result = await authService.login(req.validated.body, getClientContext(req));
  return sendSession(req, res, result, { message: "Logged in successfully" });
};

const refresh = async (req, res) => {
  const refreshToken = readRefreshToken(req);
  if (!refreshToken) throw ApiError.unauthorized("Your session has expired. Please log in again.");
  const result = await tokenService.rotateRefreshToken(refreshToken, getClientContext(req));
  return sendSession(req, res, result, { message: "Session refreshed" });
};

const logout = async (req, res) => {
  await tokenService.revokeSession(readRefreshToken(req));
  res.clearCookie(REFRESH_COOKIE.NAME, refreshCookieOptions());
  return sendSuccess(res, { message: "Logged out" });
};

const logoutAll = async (req, res) => {
  await tokenService.revokeAllSessions(req.user.id);
  res.clearCookie(REFRESH_COOKIE.NAME, refreshCookieOptions());
  return sendSuccess(res, { message: "Logged out from all devices" });
};

const sendEmailOtp = async (req, res) => {
  await authService.sendEmailVerificationOtp(req.user);
  return sendSuccess(res, { message: "Verification code sent to your email" });
};

const verifyEmail = async (req, res) => {
  const user = await authService.verifyEmail(req.user, req.validated.body);
  return sendSuccess(res, {
    data: await userService.getMyProfile(user.id),
    message: "Your account is verified",
  });
};

const sendPasswordResetOtp = async (req, res) => {
  await authService.requestPasswordReset(req.validated.body);
  return sendSuccess(res, {
    message: "If an account exists for this email, a reset code has been sent",
  });
};

const resetPassword = async (req, res) => {
  await authService.resetPassword(req.validated.body);
  return sendSuccess(res, { message: "Password updated. Please log in with your new password." });
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  sendEmailOtp,
  verifyEmail,
  sendPasswordResetOtp,
  resetPassword,
  sendSession,
};
