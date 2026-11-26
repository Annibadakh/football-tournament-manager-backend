const express = require("express");
const teamController = require("../controllers/team.controller");
const {
  authenticate,
  optionalAuthenticate,
  requireVerified,
} = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/team.schema");

const router = express.Router();
const signedIn = [authenticate, requireVerified];
const team = { params: schemas.teamIdParamSchema };
const member = { params: schemas.memberParamsSchema };

router.get("/:teamId", optionalAuthenticate, validate(team), teamController.getTeam);
router.patch(
  "/:teamId",
  ...signedIn,
  validate({ ...team, body: schemas.updateTeamSchema }),
  teamController.updateTeam,
);
router.delete("/:teamId", ...signedIn, validate(team), teamController.removeTeam);
router.patch(
  "/:teamId/review",
  ...signedIn,
  validate({ ...team, body: schemas.reviewTeamSchema }),
  teamController.reviewTeam,
);
router.patch("/:teamId/confirmation", ...signedIn, validate(team), teamController.confirmTeam);
router.patch(
  "/:teamId/lock",
  ...signedIn,
  validate({ ...team, body: schemas.lockTeamSchema }),
  teamController.lockTeam,
);
router.post("/:teamId/withdrawal", ...signedIn, validate(team), teamController.withdrawTeam);

router.post(
  "/:teamId/members",
  ...signedIn,
  validate({ ...team, body: schemas.invitePlayerSchema }),
  teamController.invitePlayer,
);
router.patch(
  "/:teamId/members/:memberId",
  ...signedIn,
  validate({ ...member, body: schemas.updatePlayerSchema }),
  teamController.updatePlayer,
);
router.delete(
  "/:teamId/members/:memberId",
  ...signedIn,
  validate(member),
  teamController.removePlayer,
);
router.post(
  "/:teamId/members/:memberId/invites",
  ...signedIn,
  validate(member),
  teamController.resendPlayerInvite,
);

module.exports = router;
