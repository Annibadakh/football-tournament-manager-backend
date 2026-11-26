const { ERROR_CODES, HTTP_STATUS } = require("../constants/common.constants");

// Expected failures thrown by services; the error middleware turns them into the envelope
class ApiError extends Error {
  constructor(status, code, message, errors) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }

  static badRequest(message, errors) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, message, errors);
  }

  static unauthorized(message = "Authentication required") {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(message, errors) {
    return new ApiError(HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT, message, errors);
  }

  static unavailable(message = "This service is not available right now") {
    return new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_CODES.SERVICE_UNAVAILABLE, message);
  }
}

module.exports = ApiError;
