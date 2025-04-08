const express = require('express');
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();
const {addMatch, getMatchesByTournament} = require('../controllers/matchController');

// POST route to add a match
router.post('/add-match', authenticate(["admin"]), addMatch);

// GET route to get all matches of a tournament (optional)
router.get('/get-matches/:tournamentId', getMatchesByTournament);

module.exports = router;
