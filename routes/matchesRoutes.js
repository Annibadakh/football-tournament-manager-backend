const express = require('express');
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();
const {addMatch, getMatchesByTournament, getMatchesById, updateStatus, updateScore, updateResult} = require('../controllers/matchController');

router.post('/add-match', authenticate(["admin"]), addMatch);

router.get('/get-matches/:tournamentId', getMatchesByTournament);
router.get('/get-match/:id', getMatchesById);

router.post('/update-status/:id', updateStatus);
router.post('/update-result/:id', updateResult);

router.post('/update-score', updateScore);

module.exports = router;
