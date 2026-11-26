const tokenService = require("../services/token.service");
const userRepository = require("../repositories/user.repository");
const ApiError = require("../utils/ApiError");
const { ACCOUNT_STATUS } = require("../constants/user.constants");
const { ERROR_CODES, HTTP_STATUS } = require("../constants/common.constants");

const readBearerToken = (req) => {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  return scheme === "Bearer" && token ? token : null;
};

// Loads the user on every request so blocks and role changes apply immediately, not at token expiry
const authenticate = async (req, res, next) => {
  const token = readBearerToken(req);
  if (!token) return next(ApiError.unauthorized());

  let payload;
  try {
    payload = tokenService.verifyAccessToken(token);
  } catch {
    return next(ApiError.unauthorized("Your session has expired. Please log in again."));
  }

  const user = await userRepository.findUserByUuid(payload.sub);
  if (!user) return next(ApiError.unauthorized());
  if (user.accountStatus === ACCOUNT_STATUS.BLOCKED) {
    return next(ApiError.forbidden("Your account has been blocked. Please contact support."));
  }

  req.user = user;
  return next();
};

// "Verify to continue": logged-in but unverified accounts can only reach verification endpoints
const requireVerified = (req, res, next) => {
  if (req.user?.accountStatus === ACCOUNT_STATUS.VERIFIED) return next();
  return next(
    new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.VERIFICATION_REQUIRED,
      "Please verify your email and mobile number to continue",
    ),
  );
};

const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.accountRole)) return next(ApiError.forbidden());
    return next();
  };

module.exports = { authenticate, requireVerified, authorize };
