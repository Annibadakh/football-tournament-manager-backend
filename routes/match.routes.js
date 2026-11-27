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

// ---------- live ----------
router.get(
  "/:matchId/live",
  optionalAuthenticate,
  validate({ ...match, query: schemas.liveQuerySchema }),
  matchController.getLive,
);
router.get("/:matchId/console", ...signedIn, validate(match), matchController.getConsole);
router.post(
  "/:matchId/periods",
  ...signedIn,
  validate({ ...match, body: schemas.periodSchema }),
  matchController.changePeriod,
);
router.post(
  "/:matchId/events",
  ...signedIn,
  validate({ ...match, body: schemas.addEventSchema }),
  matchController.addEvent,
);
router.delete("/:matchId/events/last", ...signedIn, validate(match), matchController.undoLastEvent);
router.post(
  "/:matchId/result",
  ...signedIn,
  validate({ ...match, body: schemas.declareResultSchema }),
  matchController.declareResult,
);
router.post(
  "/:matchId/walkover",
  ...signedIn,
  validate({ ...match, body: schemas.awardMatchSchema }),
  matchController.awardMatch,
);
router.post("/:matchId/cancellation", ...signedIn, validate(match), matchController.cancelMatch);

module.exports = router;
