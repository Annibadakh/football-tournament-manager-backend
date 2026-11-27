const express = require("express");
const matchController = require("../controllers/match.controller");
const {
  authenticate,
  optionalAuthenticate,
  requireVerified,
} = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/match.schema");

const router = express.Router();
const signedIn = [authenticate, requireVerified];
const match = { params: schemas.matchIdParamSchema };

router.get("/:matchId", optionalAuthenticate, validate(match), matchController.getMatch);
router.patch(
  "/:matchId",
  ...signedIn,
  validate({ ...match, body: schemas.updateMatchSchema }),
  matchController.updateMatch,
);
router.delete("/:matchId", ...signedIn, validate(match), matchController.deleteMatch);

module.exports = router;
