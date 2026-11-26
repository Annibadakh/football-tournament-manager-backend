const tournamentService = require("../services/tournament.service");
const categoryService = require("../services/category.service");
const { sendSuccess } = require("../utils/apiResponse");
const { HTTP_STATUS } = require("../constants/common.constants");

const tournamentId = (req) => req.validated.params.tournamentId;

const listTournaments = async (req, res) => {
  const { items, meta } = await tournamentService.listPublicTournaments(req.validated.query);
  return sendSuccess(res, { data: items, meta, message: "Tournaments fetched" });
};

const listManagedTournaments = async (req, res) => {
  const { items, meta } = await tournamentService.listManagedTournaments(
    req.user,
    req.validated.query,
  );
  return sendSuccess(res, { data: items, meta, message: "Tournaments fetched" });
};

const getTournament = async (req, res) =>
  sendSuccess(res, {
    data: await tournamentService.getTournament(req.user, tournamentId(req)),
    message: "Tournament fetched",
  });

const createTournament = async (req, res) =>
  sendSuccess(res, {
    data: await tournamentService.createTournament(req.user, req.validated.body),
    message: "Tournament created",
    status: HTTP_STATUS.CREATED,
  });

const updateTournament = async (req, res) =>
  sendSuccess(res, {
    data: await tournamentService.updateTournament(req.user, tournamentId(req), req.validated.body),
    message: "Tournament updated",
  });

const changeTournamentStatus = async (req, res) =>
  sendSuccess(res, {
    data: await tournamentService.changeTournamentStatus(
      req.user,
      tournamentId(req),
      req.validated.body,
    ),
    message: "Tournament status updated",
  });

const listGrounds = async (req, res) =>
  sendSuccess(res, {
    data: await tournamentService.listGrounds(req.user, tournamentId(req)),
    message: "Grounds fetched",
  });

const replaceGrounds = async (req, res) =>
  sendSuccess(res, {
    data: await tournamentService.replaceGrounds(
      req.user,
      tournamentId(req),
      req.validated.body.grounds,
    ),
    message: "Grounds saved",
  });

const listTournamentRules = async (req, res) =>
  sendSuccess(res, {
    data: await tournamentService.listTournamentRules(req.user, tournamentId(req)),
    message: "Rules fetched",
  });

const replaceTournamentRules = async (req, res) =>
  sendSuccess(res, {
    data: await tournamentService.replaceTournamentRules(
      req.user,
      tournamentId(req),
      req.validated.body.rules,
    ),
    message: "Rule book saved",
  });

const listCategories = async (req, res) =>
  sendSuccess(res, { data: await categoryService.listCategories(), message: "Categories fetched" });

module.exports = {
  listTournaments,
  listManagedTournaments,
  getTournament,
  createTournament,
  updateTournament,
  changeTournamentStatus,
  listGrounds,
  replaceGrounds,
  listTournamentRules,
  replaceTournamentRules,
  listCategories,
};
