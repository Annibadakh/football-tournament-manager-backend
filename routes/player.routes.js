const express = require("express");
const profileController = require("../controllers/profile.controller");
const teamController = require("../controllers/team.controller");
const { optionalAuthenticate } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { playerSearchQuerySchema } = require("../validations/team.schema");
const { playerIdParamSchema } = require("../validations/profile.schema");

const router = express.Router();

// Public directory of verified players (also used to pick players for squads and staff)
router.get(
  "/",
  optionalAuthenticate,
  validate({ query: playerSearchQuerySchema }),
  teamController.searchPlayers,
);
router.get(
  "/:playerId",
  validate({ params: playerIdParamSchema }),
  profileController.getPlayerProfile,
);

module.exports = router;
