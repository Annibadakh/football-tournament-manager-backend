const express = require("express");
const meController = require("../controllers/me.controller");
const tournamentController = require("../controllers/tournament.controller");
const teamController = require("../controllers/team.controller");
const teamSchemas = require("../validations/team.schema");
const { listTournamentsQuerySchema } = require("../validations/tournament.schema");
const { ACCOUNT_ROLE } = require("../constants/user.constants");
const { authenticate, authorize, requireVerified } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/user.schema");

const router = express.Router();

// Reading /me is allowed before verification so the app knows to show the verify screen
router.use(authenticate);
router.get("/", meController.getMe);
router.patch(
  "/",
  requireVerified,
  validate({ body: schemas.updateProfileSchema }),
  meController.updateMe,
);
router.put(
  "/positions",
  requireVerified,
  validate({ body: schemas.replacePositionsSchema }),
  meController.replaceMyPositions,
);
router.patch(
  "/password",
  validate({ body: schemas.changePasswordSchema }),
  meController.changeMyPassword,
);

// Tournaments I manage: organizers get their own, admins get all
router.get(
  "/tournaments",
  requireVerified,
  authorize(ACCOUNT_ROLE.SUPERADMIN, ACCOUNT_ROLE.ADMIN, ACCOUNT_ROLE.ORGANIZER),
  validate({ query: listTournamentsQuerySchema }),
  tournamentController.listManagedTournaments,
);

router.get("/teams", requireVerified, teamController.listMyTeams);
router.get("/invitations", requireVerified, teamController.listMyInvitations);
router.post(
  "/invitations/:inviteId/response",
  requireVerified,
  validate({
    params: teamSchemas.invitationParamSchema,
    body: teamSchemas.invitationResponseSchema,
  }),
  teamController.respondToInvitation,
);

module.exports = router;
