const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();
const {addTeam, getTeamsByTournament, getTeamById, getTeamByuuid} = require("../controllers/teamController");

router.post("/add-team", authenticate("admin"), addTeam);

router.get("/get-teams/:tournamentId", authenticate("admin"), getTeamsByTournament);

router.get("/get-team/:id", authenticate("admin"), getTeamById);

router.get("/get-captainteam/:uuid", authenticate("captain"), getTeamByuuid);

module.exports = router;
