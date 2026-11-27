const fixtureService = require("../services/fixture.service");
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
    data: await fixtureService.getMatch(req.user, params(req).matchId),
    message: "Match fetched",
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
  updateMatch,
  deleteMatch,
};
