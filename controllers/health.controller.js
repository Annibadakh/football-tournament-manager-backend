const healthService = require("../services/health.service");
const { sendSuccess } = require("../utils/apiResponse");

const getHealth = async (req, res) => {
  const health = await healthService.getHealthStatus();
  return sendSuccess(res, { data: health, message: "Service is healthy" });
};

module.exports = { getHealth };
