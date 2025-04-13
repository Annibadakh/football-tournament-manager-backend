const Match = require('../models/match');
const Team = require('../models/team');
const Player = require('../models/player');
const MatchPlayer = require('../models/MatchPlayer'); // adjust the path as needed

// Add a match
const addMatch = async (req, res) => {
  const {
    tournamentId,
    team1Id,
    team2Id,
    startDate,
    startTime,
    halfTime,
    breakTime,
    stage, // ✅ New field added
  } = req.body;

  try {
    const match = await Match.create({
      tournamentId,
      team1Id,
      team2Id,
      startDate,
      startTime,
      halfTime,
      breakTime,
      stage, // ✅ Save stage value
    });

    res.status(201).json({ message: 'Match added successfully', match });
  } catch (error) {
    console.error('Error adding match:', error);
    res.status(500).json({ message: 'Failed to add match', error });
  }
};


const getMatchesByTournament = async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const matches = await Match.findAll({
      where: { tournamentId },
      order: [['startDate', 'ASC']]
    });

    res.status(200).json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ message: 'Failed to fetch matches', error });
  }
};
const getMatches = async (req, res) => {

  try {
    const matches = await Match.findAll({
      order: [['startDate', 'ASC']]
    });

    res.status(200).json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ message: 'Failed to fetch matches', error });
  }
};

const getMatchesById = async (req, res) => {
  const { id } = req.params;
  try {
    const match = await Match.findByPk(id);
    res.status(200).json(match);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ message: 'Failed to fetch matches', error });
  }
};

const updateStatus = async (req, res) => {
  const {id} = req.params;
  const {status} = req.body;

  try{
    const match = await Match.findByPk(id);

    if(status === 'ended'){
      if(match.totalGoalsTeam1 > match.totalGoalsTeam2){
        match.matchOutcome = "team1";
        match.winnerTeamId = match.team1Id;
        const winnerTeam = await Team.findOne({where: {uuid:match.team1Id}});
        winnerTeam.totalPoints  = (winnerTeam.totalPoints) + 3;
        await winnerTeam.save();
      } else if(match.totalGoalsTeam1 < match.totalGoalsTeam2){
        match.matchOutcome = "team2";
        match.winnerTeamId = match.team2Id;
        const winnerTeam = await Team.findOne({where: {uuid:match.team2Id}});
        winnerTeam.totalPoints  = (winnerTeam.totalPoints) + 3;
        await winnerTeam.save();
      }
      else{
        match.matchOutcome = "tie";
        const team1 = await Team.findOne({where: {uuid:match.team1Id}});
        team1.totalPoints  = (team1.totalPoints) + 1;
        await team1.save();
        const team2 = await Team.findOne({where: {uuid:match.team2Id}});
        team2.totalPoints  = (team2.totalPoints) + 1;
        await team2.save();
      }
    }
    match.status = status;
    await match.save();
    res.status(200).json({message: "status updated"});


  } catch (error) {
    console.error('error to update satatus', error);
    res.status(500).json({ message: 'Failed to update status', error });
  }
};

const updateScore = async (req, res) => {
  try {
    const { playerId, playerName, matchId, scoreId, concededId, change } = req.body;
    const id = matchId;
    
    // 1. Update match total goals
    const match = await Match.findByPk(id);
    
    if (match.team1Id.toString() === scoreId.toString()) {
      match.totalGoalsTeam1 = (match.totalGoalsTeam1) + change;
    } else if(match.team2Id.toString() === scoreId.toString()){
      match.totalGoalsTeam2 = (match.totalGoalsTeam2) + change;
    }

    
    await match.save();
    
    // 2. Update team stats (goals scored/conceded)
    const scoringTeam = await Team.findOne({
      where: {uuid: scoreId}
    });
    const concedingTeam = await Team.findOne({
      where: {uuid: concededId}
    });
    
    if (scoringTeam) {
      scoringTeam.goalsScored = (scoringTeam.goalsScored) + change;
      await scoringTeam.save();
    }
    
    if (concedingTeam) {
      concedingTeam.goalsConceded = (concedingTeam.goalsConceded) + change;
      await concedingTeam.save();
    }
    
    const player = await Player.findByPk(playerId);
    if (player) {
      player.totalScore = (player.totalScore) + change;
      await player.save();
    }
    
    // 4. Update or create PlayerMatch record
    let playerMatch = await MatchPlayer.findOne({ 
      where: {
        playerId: playerId, 
        matchId: matchId
      } 
    });
    
    if (playerMatch) {
      // Update existing record
      playerMatch.playerScore = (playerMatch.playerScore) + change;
      await playerMatch.save();
    } else {
      // Create new record
      playerMatch = await MatchPlayer.create({
        playerId,
        playerName,
        matchId,
        playerScore: change
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Score updated successfully',
      match: match,
      scoringTeam: scoringTeam,
      concedingTeam: concedingTeam,
      player: player,
      playerMatch: playerMatch,

    });
    
  } catch (error) {
    console.error('Error updating score:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update score',
      error: error.message
    });
  }
};

const updateResult = async (req, res) => {
  const {id} = req.params;
  const {matchOutcome, winnerTeamId} = req.body;
  try{
    const match = await Match.findByPk(id);
    match.matchOutcome = matchOutcome;
    match.winnerTeamId = winnerTeamId;
    match.save();
    res.status(200).json({message: "result updated updated"});
  } catch (error) {
    console.error('error to update result', error);
    res.status(500).json({ message: 'Failed to update result', error });
  }
};


module.exports = {addMatch, getMatchesByTournament, getMatches, getMatchesById, updateStatus, updateScore, updateResult};