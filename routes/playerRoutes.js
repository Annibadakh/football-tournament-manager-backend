const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();
const {addPlayer, getPlayersByTeam, getTopScorers} = require("../controllers/playerController");

router.post("/add-player", authenticate(["captain"]), addPlayer);
router.get("/get-players/:teamId", getPlayersByTeam);
router.get("/top-scorers", getTopScorers);

module.exports = router;
