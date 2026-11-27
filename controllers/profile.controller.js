const profileService = require("../services/profile.service");
const awardService = require("../services/award.service");
const { EXPORTS, EXPORT_FILE_NAMES } = require("../services/export.service");
const { sendSuccess } = require("../utils/apiResponse");
const { HTTP_STATUS } = require("../constants/common.constants");

const params = (req) => req.validated.params;

const getPlayerProfile = async (req, res) =>
  sendSuccess(res, {
    data: await profileService.getPlayerProfile(params(req).playerId),
    message: "Player fetched",
  });

const getTeamStats = async (req, res) =>
  sendSuccess(res, {
    data: await profileService.getTeamStats(req.user, params(req).teamId),
    message: "Team stats fetched",
  });

const listAwards = async (req, res) =>
  sendSuccess(res, {
    data: await awardService.listAwards(req.user, params(req).tournamentId),
    message: "Awards fetched",
  });

const createAward = async (req, res) =>
  sendSuccess(res, {
    data: await awardService.createCustomAward(
      req.user,
      params(req).tournamentId,
      req.validated.body,
    ),
    message: "Award added",
    status: HTTP_STATUS.CREATED,
  });

const deleteAward = async (req, res) =>
  sendSuccess(res, {
    data: await awardService.deleteAward(req.user, params(req).awardId),
    message: "Award removed",
  });

// Data is loaded (and errors thrown) before any PDF header is sent
const downloadExport = async (req, res) => {
  const { tournamentId, kind } = params(req);
  const render = await EXPORTS[kind](req.user, tournamentId);
  const disposition = req.validated.query.download ? "attachment" : "inline";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${tournamentId}-${EXPORT_FILE_NAMES[kind]}.pdf"`,
  );
  res.setHeader("Cache-Control", "public, max-age=60");
  render(res);
};

module.exports = {
  getPlayerProfile,
  getTeamStats,
  listAwards,
  createAward,
  deleteAward,
  downloadExport,
};
