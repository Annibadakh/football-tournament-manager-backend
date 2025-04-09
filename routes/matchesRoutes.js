const express = require('express');
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();
const {addMatch, getMatchesByTournament, getMatches, getMatchesById, updateStatus, updateScore, updateResult} = require('../controllers/matchController');

router.post('/add-match', authenticate(["admin"]), addMatch);

router.get('/get-matches/:tournamentId', getMatchesByTournament);
router.get('/get-matches', getMatches);
router.get('/get-match/:id', getMatchesById);

router.post('/update-status/:id', authenticate(["scorer", "admin"]), updateStatus);
router.post('/update-result/:id', authenticate(["scorer", "admin"]), updateResult);

router.post('/update-score', authenticate(["scorer", "admin"]), updateScore);

module.exports = router;
