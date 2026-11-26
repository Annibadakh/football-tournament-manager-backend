const placeService = require("../services/place.service");
const { sendSuccess } = require("../utils/apiResponse");

const searchPlaces = async (req, res) =>
  sendSuccess(res, {
    data: await placeService.searchPlaces(req.validated.query),
    message: "Suggestions fetched",
  });

const resolvePlace = async (req, res) =>
  sendSuccess(res, {
    data: await placeService.resolvePlace(req.validated.body),
    message: "Place saved",
  });

module.exports = { searchPlaces, resolvePlace };
