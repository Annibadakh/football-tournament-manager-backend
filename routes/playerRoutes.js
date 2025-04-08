const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();
const {addPlayer, getPlayersByTeam} = require("../controllers/playerController");

router.post("/add-player", authenticate(["captain"]), addPlayer);
router.get("/get-players/:teamId", getPlayersByTeam);

module.exports = router;
