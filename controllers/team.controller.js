const teamService = require("../services/team.service");
const squadService = require("../services/squad.service");
const staffService = require("../services/staff.service");
const playerService = require("../services/player.service");
const inviteService = require("../services/invite.service");
const { sendSuccess } = require("../utils/apiResponse");
const { HTTP_STATUS } = require("../constants/common.constants");

const params = (req) => req.validated.params;
const body = (req) => req.validated.body;

const listTournamentTeams = async (req, res) =>
  sendSuccess(res, {
    data: await teamService.listTournamentTeams(
      req.user,
      params(req).tournamentId,
      req.validated.query,
    ),
    message: "Teams fetched",
  });

const addTeam = async (req, res) =>
  sendSuccess(res, {
    data: await teamService.addTeam(req.user, params(req).tournamentId, body(req)),
    message: "Team added",
    status: HTTP_STATUS.CREATED,
  });

const requestTeam = async (req, res) =>
  sendSuccess(res, {
    data: await teamService.requestTeam(req.user, params(req).tournamentId, body(req)),
    message: "Request sent to the organizer",
    status: HTTP_STATUS.CREATED,
  });

const getTeam = async (req, res) =>
  sendSuccess(res, {
    data: await teamService.getTeamForViewer(req.user, params(req).teamId),
    message: "Team fetched",
  });

const updateTeam = async (req, res) =>
  sendSuccess(res, {
    data: await teamService.updateTeamDetails(req.user, params(req).teamId, body(req)),
    message: "Team updated",
  });

const reviewTeam = async (req, res) =>
  sendSuccess(res, {
    data: await teamService.reviewTeamRequest(req.user, params(req).teamId, body(req)),
    message: body(req).decision === "approve" ? "Request approved" : "Request rejected",
  });

const lockTeam = async (req, res) =>
  sendSuccess(res, {
    data: await teamService.setTeamLock(req.user, params(req).teamId, body(req)),
    message: body(req).isLocked ? "Squad locked" : "Squad unlocked",
  });

const withdrawTeam = async (req, res) => {
  await teamService.withdrawTeam(req.user, params(req).teamId);
  return sendSuccess(res, { message: "Team withdrawn" });
};

const removeTeam = async (req, res) => {
  await teamService.removeTeam(req.user, params(req).teamId);
  return sendSuccess(res, { message: "Team removed from the tournament" });
};

const invitePlayer = async (req, res) =>
  sendSuccess(res, {
    data: await squadService.invitePlayer(req.user, params(req).teamId, body(req)),
    message: "Invitation sent",
    status: HTTP_STATUS.CREATED,
  });

const updatePlayer = async (req, res) =>
  sendSuccess(res, {
    data: await squadService.updatePlayer(
      req.user,
      params(req).teamId,
      params(req).memberId,
      body(req),
    ),
    message: "Player updated",
  });

const removePlayer = async (req, res) => {
  await squadService.removePlayer(req.user, params(req).teamId, params(req).memberId);
  return sendSuccess(res, { message: "Player removed" });
};

const resendPlayerInvite = async (req, res) => {
  await squadService.resendPlayerInvite(req.user, params(req).teamId, params(req).memberId);
  return sendSuccess(res, { message: "Invitation sent again" });
};

const listStaff = async (req, res) =>
  sendSuccess(res, {
    data: await staffService.listStaff(req.user, params(req).tournamentId),
    message: "Staff fetched",
  });

const inviteStaff = async (req, res) =>
  sendSuccess(res, {
    data: await staffService.inviteStaff(req.user, params(req).tournamentId, body(req)),
    message: "Invitation sent",
    status: HTTP_STATUS.CREATED,
  });

const removeStaff = async (req, res) => {
  await staffService.removeStaff(req.user, params(req).tournamentId, params(req).staffId);
  return sendSuccess(res, { message: "Staff member removed" });
};

const searchPlayers = async (req, res) => {
  const { items, meta } = await playerService.searchPlayers(req.validated.query);
  return sendSuccess(res, { data: items, meta, message: "Players fetched" });
};

const listMyTeams = async (req, res) =>
  sendSuccess(res, { data: await teamService.listMyTeams(req.user), message: "Teams fetched" });

const listMyInvitations = async (req, res) =>
  sendSuccess(res, {
    data: await inviteService.listMyInvitations(req.user),
    message: "Invitations fetched",
  });

const respondToInvitation = async (req, res) => {
  await inviteService.respondToInvitation(req.user, params(req).inviteId, body(req));
  return sendSuccess(res, {
    message: body(req).accept ? "Invitation accepted" : "Invitation declined",
  });
};

module.exports = {
  listTournamentTeams,
  addTeam,
  requestTeam,
  getTeam,
  updateTeam,
  reviewTeam,
  lockTeam,
  withdrawTeam,
  removeTeam,
  invitePlayer,
  updatePlayer,
  removePlayer,
  resendPlayerInvite,
  listStaff,
  inviteStaff,
  removeStaff,
  searchPlayers,
  listMyTeams,
  listMyInvitations,
  respondToInvitation,
};
