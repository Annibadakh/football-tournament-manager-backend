const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const { createTournament, getTournament } = require("../controllers/tournamentController")
const   router = express.Router();

router.post("/create-tournament", authenticate("admin"), createTournament);
router.get("/all", authenticate("admin"), getTournament);

module.exports = router;