const fixtureService = require("../services/fixture.service");
const liveService = require("../services/live.service");
const { sendSuccess } = require("../utils/apiResponse");
const { HTTP_STATUS } = require("../constants/common.constants");

const params = (req) => req.validated.params;
const body = (req) => req.validated.body;

const getGroups = async (req, res) =>
  sendSuccess(res, {
    data: await fixtureService.getGroups(req.user, params(req).tournamentId),
    message: "Groups fetched",
  });

const drawGroups = async (req, res) =>
  sendSuccess(res, {
    data: await fixtureService.drawGroups(req.user, params(req).tournamentId, body(req)),
    message: "Groups drawn",
  });

const setGroups = async (req, res) =>
  sendSuccess(res, {
    data: await fixtureService.setGroups(req.user, params(req).tournamentId, body(req)),
    message: "Groups saved",
  });

const generateFixtures = async (req, res) =>
  sendSuccess(res, {
    data: await fixtureService.generateFixtures(req.user, params(req).tournamentId, body(req)),
    message: "Fixtures generated",
    status: HTTP_STATUS.CREATED,
  });

const deleteFixtures = async (req, res) =>
  sendSuccess(res, {
    data: await fixtureService.deleteFixtures(req.user, params(req).tournamentId),
    message: "Fixtures deleted",
  });

const scheduleMatches = async (req, res) => {
  const data = await fixtureService.scheduleMatches(req.user, params(req).tournamentId, body(req));
  sendSuccess(res, {
    data,
    message: data.unscheduledCount
      ? `${data.scheduledCount} matches scheduled; ${data.unscheduledCount} didn't fit. Add days, slots or grounds.`
      : `${data.scheduledCount} matches scheduled`,
  });
};

const listMatches = async (req, res) =>
  sendSuccess(res, {
    data: await fixtureService.listMatches(req.user, params(req).tournamentId, req.validated.query),
    message: "Matches fetched",
  });

const addMatch = async (req, res) =>
  sendSuccess(res, {
    data: await fixtureService.addMatch(req.user, params(req).tournamentId, body(req)),
    message: "Match added",
    status: HTTP_STATUS.CREATED,
  });

const getBracket = async (req, res) =>
  sendSuccess(res, {
    data: await fixtureService.getBracket(req.user, params(req).tournamentId),
    message: "Bracket fetched",
  });

const getMatch = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.getMatchDetail(req.user, params(req).matchId),
    message: "Match fetched",
  });

const getLive = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.getLive(req.user, params(req).matchId, req.validated.query),
    message: "Live state fetched",
  });

const getConsole = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.getConsole(req.user, params(req).matchId),
    message: "Console fetched",
  });

const changePeriod = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.changePeriod(req.user, params(req).matchId, body(req)),
    message: "Clock updated",
  });

const addEvent = async (req, res) => {
  const data = await liveService.addEvent(req.user, params(req).matchId, body(req));
  sendSuccess(res, {
    data,
    message: data.secondYellowRed ? "Second yellow: red card added" : "Event added",
    status: HTTP_STATUS.CREATED,
  });
};

const undoLastEvent = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.undoLastEvent(req.user, params(req).matchId),
    message: "Last event undone",
  });

const declareResult = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.declareResult(req.user, params(req).matchId, body(req)),
    message: "Result declared",
  });

const awardMatch = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.awardMatch(req.user, params(req).matchId, body(req)),
    message: body(req).type === "forfeit" ? "Forfeit recorded" : "Walkover recorded",
  });

const cancelMatch = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.cancelMatch(req.user, params(req).matchId),
    message: "Match cancelled",
  });

const getStandings = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.getStandings(req.user, params(req).tournamentId),
    message: "Standings fetched",
  });

const getLeaders = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.getLeaders(req.user, params(req).tournamentId),
    message: "Leaders fetched",
  });

const listCardNotices = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.listCardNotices(
      req.user,
      params(req).tournamentId,
      req.validated.query,
    ),
    message: "Card notices fetched",
  });

const handleCardNotice = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.handleCardNotice(req.user, params(req).noticeId),
    message: "Notice marked as handled",
  });

const listMyScoringMatches = async (req, res) =>
  sendSuccess(res, {
    data: await liveService.listMyScoringMatches(req.user),
    message: "Matches fetched",
  });

const updateMatch = async (req, res) =>
  sendSuccess(res, {
    data: await fixtureService.updateMatch(req.user, params(req).matchId, body(req)),
    message: "Match updated",
  });

const deleteMatch = async (req, res) =>
  sendSuccess(res, {
    data: await fixtureService.deleteMatch(req.user, params(req).matchId),
    message: "Match deleted",
  });

module.exports = {
  getGroups,
  drawGroups,
  setGroups,
  generateFixtures,
  deleteFixtures,
  scheduleMatches,
  listMatches,
  addMatch,
  getBracket,
  getMatch,
  getLive,
  getConsole,
  changePeriod,
  addEvent,
  undoLastEvent,
  declareResult,
  awardMatch,
  cancelMatch,
  getStandings,
  getLeaders,
  listCardNotices,
  handleCardNotice,
  listMyScoringMatches,
  updateMatch,
  deleteMatch,
};
