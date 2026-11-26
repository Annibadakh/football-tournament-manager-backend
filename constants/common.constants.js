const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  // Logged in, but email/phone verification must finish first
  VERIFICATION_REQUIRED: "VERIFICATION_REQUIRED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
});

const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
});

const SORT_ORDER = Object.freeze({
  ASC: "asc",
  DESC: "desc",
});

// Shared entity types for links between modules (CMS targets, notifications, deep links)
const ENTITY_TYPE = Object.freeze({
  TOURNAMENT: 1,
  TEAM: 2,
  PLAYER: 3,
  MATCH: 4,
});

// Business dates (registration deadlines, "today") are evaluated in Indian time
const APP_TIMEZONE = "Asia/Kolkata";

const REQUEST_BODY_LIMIT = "100kb";

// Versioned so a future mobile app keeps working if v2 of the API is ever needed
const API_PREFIX = "/api/v1";

module.exports = {
  ERROR_CODES,
  HTTP_STATUS,
  PAGINATION,
  SORT_ORDER,
  REQUEST_BODY_LIMIT,
  API_PREFIX,
  ENTITY_TYPE,
  APP_TIMEZONE,
};
