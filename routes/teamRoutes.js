const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();
const {addTeam, getTeamsByTournament, getTeamById, getTeamByuuid, updateApprovalStatus} = require("../controllers/teamController");

router.post("/add-team", authenticate("admin"), addTeam);

router.get("/get-teams/:tournamentId", getTeamsByTournament);

router.get("/get-team/:id", authenticate(["admin", "scorer"]), getTeamById);

router.get("/get-captainteam/:uuid", authenticate("captain"), getTeamByuuid);

router.patch('/approve/:uuid', updateApprovalStatus);

module.exports = router;
