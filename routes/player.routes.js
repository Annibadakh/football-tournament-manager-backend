const express = require("express");
const teamController = require("../controllers/team.controller");
const { authenticate, requireVerified } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { playerSearchQuerySchema } = require("../validations/team.schema");

const router = express.Router();

// Logged-in search used when picking verified players for squads and staff
router.get(
  "/",
  authenticate,
  requireVerified,
  validate({ query: playerSearchQuerySchema }),
  teamController.searchPlayers,
);

module.exports = router;
