const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require("sequelize");
const ApiError = require("../utils/ApiError");
const { buildErrorBody } = require("../utils/apiResponse");
const { ERROR_CODES, HTTP_STATUS } = require("../constants/common.constants");

const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

const fromSequelizeError = (err) => {
  const errors = err.errors?.map((item) => ({ field: item.path, message: item.message }));
  if (err instanceof UniqueConstraintError)
    return ApiError.conflict("Record already exists", errors);
  if (err instanceof ValidationError) return ApiError.badRequest("Validation failed", errors);
  if (err instanceof ForeignKeyConstraintError)
    return ApiError.badRequest("Related record does not exist");
  return null;
};

// Body-parser errors carry a status and type, e.g. malformed JSON or too large payloads
const fromBodyParserError = (err) => {
  if (err.type === "entity.parse.failed") return ApiError.badRequest("Malformed JSON body");
  if (err.type === "entity.too.large") {
    return new ApiError(
      HTTP_STATUS.PAYLOAD_TOO_LARGE,
      ERROR_CODES.VALIDATION_ERROR,
      "Request body is too large",
    );
  }
  return null;
};

// eslint-disable-next-line no-unused-vars -- Express needs 4 args to treat this as an error handler
const errorHandler = (err, req, res, next) => {
  const apiError =
    err instanceof ApiError ? err : fromSequelizeError(err) || fromBodyParserError(err);

  if (apiError) {
    return res.status(apiError.status).json(buildErrorBody(apiError));
  }

  // Unknown errors are logged with the request id; clients never see internals
  req.log?.error({ err }, "Unhandled error");
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
    buildErrorBody({
      message: "Something went wrong. Please try again later.",
      code: ERROR_CODES.INTERNAL_ERROR,
    }),
  );
};

module.exports = { notFoundHandler, errorHandler };
