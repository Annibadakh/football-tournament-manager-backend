const ApiError = require("../utils/ApiError");

// TODO: verify the JWT access token and load req.user in Phase 1 (identity module)
const authenticate = (req, res, next) => next(ApiError.unauthorized());

// Allows the request only when req.user has one of the given account roles
const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.accountRole)) return next(ApiError.forbidden());
    return next();
  };

module.exports = { authenticate, authorize };
