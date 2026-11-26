const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { sequelize } = require("../models");
const refreshTokenRepository = require("../repositories/refreshToken.repository");
const userRepository = require("../repositories/user.repository");
const ApiError = require("../utils/ApiError");
const { generateToken, sha256 } = require("../utils/crypto");
const { JWT_OPTIONS } = require("../constants/auth.constants");
const { ACCOUNT_STATUS } = require("../constants/user.constants");

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please log in again.";

const signAccessToken = (user) =>
  jwt.sign({ role: user.accountRole }, config.auth.accessSecret, {
    subject: user.uuid,
    expiresIn: config.auth.accessExpiresIn,
    issuer: JWT_OPTIONS.ISSUER,
    audience: JWT_OPTIONS.AUDIENCE,
    algorithm: JWT_OPTIONS.ALGORITHM,
  });

// Throws jsonwebtoken errors; the auth middleware maps them to UNAUTHORIZED
const verifyAccessToken = (token) =>
  jwt.verify(token, config.auth.accessSecret, {
    issuer: JWT_OPTIONS.ISSUER,
    audience: JWT_OPTIONS.AUDIENCE,
    algorithms: [JWT_OPTIONS.ALGORITHM],
  });

const issueRefreshToken = async ({ userId, familyId, context }, { transaction } = {}) => {
  const token = generateToken();
  const record = await refreshTokenRepository.createRefreshToken(
    {
      userId,
      tokenHash: sha256(token),
      familyId: familyId ?? crypto.randomUUID(),
      expiresAt: new Date(Date.now() + config.auth.refreshTokenTtlDays * DAY_MS),
      platform: context.platform,
      userAgent: context.userAgent?.slice(0, 255) ?? null,
      ipAddress: context.ipAddress ?? null,
    },
    { transaction },
  );
  return { token, record };
};

// Every new session (login, sign-up, invite acceptance) counts as a login
const createSession = async (user, context, { transaction } = {}) => {
  const { token } = await issueRefreshToken({ userId: user.id, context }, { transaction });
  await userRepository.updateUser(user, { lastLoginAt: new Date() }, { transaction });
  return { accessToken: signAccessToken(user), refreshToken: token };
};

/**
 * Swaps a refresh token for a new pair. The row is locked so two parallel refreshes can't both win.
 * A token that was already rotated is being reused, which means it leaked: the whole login family is revoked.
 */
const rotateRefreshToken = async (rawToken, context) => {
  const outcome = await sequelize.transaction(async (transaction) => {
    const existing = await refreshTokenRepository.findRefreshTokenByHash(sha256(rawToken), {
      transaction,
    });
    if (!existing || existing.expiresAt < new Date()) return { isValid: false };
    if (existing.revokedAt) return { isValid: false, reusedFamilyId: existing.familyId };

    const user = await userRepository.findUserById(existing.userId, { transaction });
    if (!user || user.accountStatus === ACCOUNT_STATUS.BLOCKED) return { isValid: false };

    const { token, record } = await issueRefreshToken(
      { userId: user.id, familyId: existing.familyId, context },
      { transaction },
    );
    await refreshTokenRepository.revokeRefreshToken(existing, record.id, { transaction });
    return {
      isValid: true,
      user,
      session: { accessToken: signAccessToken(user), refreshToken: token },
    };
  });

  // Revoked after the transaction commits so the theft response can't be rolled back
  if (outcome.reusedFamilyId)
    await refreshTokenRepository.revokeTokenFamily(outcome.reusedFamilyId);
  if (!outcome.isValid) throw ApiError.unauthorized(SESSION_EXPIRED_MESSAGE);
  return { user: outcome.user, session: outcome.session };
};

const revokeSession = async (rawToken) => {
  if (!rawToken) return;
  const existing = await refreshTokenRepository.findRefreshTokenByHash(sha256(rawToken));
  if (existing && !existing.revokedAt)
    await refreshTokenRepository.revokeRefreshToken(existing, null);
};

const revokeAllSessions = (userId, { transaction } = {}) =>
  refreshTokenRepository.revokeAllUserTokens(userId, { transaction });

module.exports = {
  signAccessToken,
  verifyAccessToken,
  createSession,
  rotateRefreshToken,
  revokeSession,
  revokeAllSessions,
};
