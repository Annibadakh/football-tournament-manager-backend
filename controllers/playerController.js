const Player = require("../models/player");

const addPlayer = async (req, res) => {
  try {
    const {name, position, totalScore, addPoint, photoUrl, jerseyNumber, teamId} = req.body;

    const newPlayer = await Player.create({name, position, totalScore, addPoint, photoUrl, jerseyNumber, teamId});

    res.status(201).json({ message: "Player added successfully", player: newPlayer });
  } catch (error) {
    console.error("Error adding player:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

const getPlayersByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const players = await Player.findAll({
      where: { teamId },
      order: [['jerseyNumber', 'ASC']],
    });
    res.status(200).json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
const getTopScorers = async (req, res) => {
  try {
    const topScorers = await Player.findAll({
      order: [["totalScore", "DESC"]],
      limit: 3,
    });
    res.status(200).json(topScorers);
  } catch (error) {
    console.error("Error fetching top scorers:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


module.exports = {addPlayer, getPlayersByTeam, getTopScorers};