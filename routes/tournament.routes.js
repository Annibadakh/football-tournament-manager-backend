const express = require("express");
const tournamentController = require("../controllers/tournament.controller");
const matchController = require("../controllers/match.controller");
const streamController = require("../controllers/stream.controller");
const profileController = require("../controllers/profile.controller");
const profileSchemas = require("../validations/profile.schema");
const streamSchemas = require("../validations/stream.schema");
const teamController = require("../controllers/team.controller");
const matchSchemas = require("../validations/match.schema");
const teamSchemas = require("../validations/team.schema");
const {
  authenticate,
  authorize,
  optionalAuthenticate,
  requireVerified,
} = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/tournament.schema");
const { ACCOUNT_ROLE } = require("../constants/user.constants");

const router = express.Router();
const params = { params: schemas.tournamentIdParamSchema };
const signedIn = [authenticate, requireVerified];
const adminOnly = [...signedIn, authorize(ACCOUNT_ROLE.SUPERADMIN, ACCOUNT_ROLE.ADMIN)];

router.get(
  "/",
  validate({ query: schemas.listTournamentsQuerySchema }),
  tournamentController.listTournaments,
);
router.post(
  "/",
  ...adminOnly,
  validate({ body: schemas.createTournamentSchema }),
  tournamentController.createTournament,
);

router.get(
  "/:tournamentId",
  optionalAuthenticate,
  validate(params),
  tournamentController.getTournament,
);
router.patch(
  "/:tournamentId",
  ...signedIn,
  validate({ ...params, body: schemas.updateTournamentSchema }),
  tournamentController.updateTournament,
);
router.patch(
  "/:tournamentId/status",
  ...signedIn,
  validate({ ...params, body: schemas.changeStatusSchema }),
  tournamentController.changeTournamentStatus,
);

router.get(
  "/:tournamentId/grounds",
  optionalAuthenticate,
  validate(params),
  tournamentController.listGrounds,
);
router.put(
  "/:tournamentId/grounds",
  ...signedIn,
  validate({ ...params, body: schemas.replaceGroundsSchema }),
  tournamentController.replaceGrounds,
);

router.get(
  "/:tournamentId/rules",
  optionalAuthenticate,
  validate(params),
  tournamentController.listTournamentRules,
);
router.put(
  "/:tournamentId/rules",
  ...signedIn,
  validate({ ...params, body: schemas.replaceTournamentRulesSchema }),
  tournamentController.replaceTournamentRules,
);

// Teams and team requests
router.get(
  "/:tournamentId/teams",
  optionalAuthenticate,
  validate({ ...params, query: teamSchemas.listTeamsQuerySchema }),
  teamController.listTournamentTeams,
);
router.post(
  "/:tournamentId/teams",
  ...signedIn,
  validate({ ...params, body: teamSchemas.addTeamSchema }),
  teamController.addTeam,
);
router.post(
  "/:tournamentId/team-requests",
  ...signedIn,
  validate({ ...params, body: teamSchemas.teamRequestSchema }),
  teamController.requestTeam,
);

// Scorers and media operators
router.get("/:tournamentId/staff", ...signedIn, validate(params), teamController.listStaff);
router.post(
  "/:tournamentId/staff",
  ...signedIn,
  validate({ ...params, body: teamSchemas.inviteStaffSchema }),
  teamController.inviteStaff,
);
router.delete(
  "/:tournamentId/staff/:staffId",
  ...signedIn,
  validate({ params: teamSchemas.staffParamsSchema }),
  teamController.removeStaff,
);

// ---------- groups & fixtures ----------
router.get(
  "/:tournamentId/groups",
  optionalAuthenticate,
  validate(params),
  matchController.getGroups,
);
router.put(
  "/:tournamentId/groups",
  ...signedIn,
  validate({ ...params, body: matchSchemas.setGroupsSchema }),
  matchController.setGroups,
);
router.post(
  "/:tournamentId/group-draw",
  ...signedIn,
  validate({ ...params, body: matchSchemas.drawGroupsSchema }),
  matchController.drawGroups,
);
router.post(
  "/:tournamentId/fixtures",
  ...signedIn,
  validate({ ...params, body: matchSchemas.generateFixturesSchema }),
  matchController.generateFixtures,
);
router.delete(
  "/:tournamentId/fixtures",
  ...signedIn,
  validate(params),
  matchController.deleteFixtures,
);
router.post(
  "/:tournamentId/schedule",
  ...signedIn,
  validate({ ...params, body: matchSchemas.scheduleSchema }),
  matchController.scheduleMatches,
);
router.get(
  "/:tournamentId/matches",
  optionalAuthenticate,
  validate({ ...params, query: matchSchemas.listMatchesQuerySchema }),
  matchController.listMatches,
);
router.post(
  "/:tournamentId/matches",
  ...signedIn,
  validate({ ...params, body: matchSchemas.addMatchSchema }),
  matchController.addMatch,
);
router.get(
  "/:tournamentId/bracket",
  optionalAuthenticate,
  validate(params),
  matchController.getBracket,
);

router.get(
  "/:tournamentId/standings",
  optionalAuthenticate,
  validate(params),
  matchController.getStandings,
);
router.get(
  "/:tournamentId/leaders",
  optionalAuthenticate,
  validate(params),
  matchController.getLeaders,
);
router.get(
  "/:tournamentId/card-notices",
  ...signedIn,
  validate({ ...params, query: matchSchemas.noticesQuerySchema }),
  matchController.listCardNotices,
);

// ---------- streams ----------
router.get(
  "/:tournamentId/streams",
  optionalAuthenticate,
  validate(params),
  streamController.listStreams,
);
router.post(
  "/:tournamentId/streams",
  ...signedIn,
  validate({ ...params, body: streamSchemas.createStreamSchema }),
  streamController.createStream,
);

// ---------- awards & exports ----------
router.get(
  "/:tournamentId/awards",
  optionalAuthenticate,
  validate(params),
  profileController.listAwards,
);
router.post(
  "/:tournamentId/awards",
  ...signedIn,
  validate({ ...params, body: profileSchemas.customAwardSchema }),
  profileController.createAward,
);
router.get(
  "/:tournamentId/exports/:kind.pdf",
  optionalAuthenticate,
  validate({ params: profileSchemas.exportParamSchema, query: profileSchemas.exportQuerySchema }),
  profileController.downloadExport,
);

module.exports = router;
