const positionService = require("../services/position.service");
const { sendSuccess } = require("../utils/apiResponse");

const listPositions = async (req, res) =>
  sendSuccess(res, { data: await positionService.listPositions(), message: "Positions fetched" });

module.exports = { listPositions };
