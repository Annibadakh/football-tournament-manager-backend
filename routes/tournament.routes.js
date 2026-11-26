const express = require("express");
const tournamentController = require("../controllers/tournament.controller");
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

module.exports = router;
