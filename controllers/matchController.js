const Match = require("../models/match"); // adjust the path as needed

// Add a match
const addMatch = async (req, res) => {
  const { tournamentId, team1Id, team2Id, startDate, startTime, halfTime, breakTime } = req.body;

  try {
    const match = await Match.create({tournamentId, team1Id, team2Id, startDate, startTime, halfTime, breakTime});
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

module.exports = {addMatch, getMatchesByTournament};