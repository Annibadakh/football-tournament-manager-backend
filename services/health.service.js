const healthRepository = require("../repositories/health.repository");
const ApiError = require("../utils/ApiError");
const { ERROR_CODES, HTTP_STATUS } = require("../constants/common.constants");

const getHealthStatus = async () => {
  try {
    await healthRepository.pingDatabase();
  } catch {
    throw new ApiError(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      "Database is not reachable",
    );
  }

  return { status: "ok", database: "up", uptimeSeconds: Math.round(process.uptime()) };
};

module.exports = { getHealthStatus };
