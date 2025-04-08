const Tournament = require("../models/tournament");

const createTournament = async (req, res) => {
  try {
    const {name, totalTeams, type, teamSize, startDate, endDate, amountPerTeam, logoUrl, pointsWin, pointsDraw, pointsLoss} = req.body;


    const newTournament = await Tournament.create({name, totalTeams, type, teamSize, startDate, endDate, amountPerTeam, logoUrl, pointsWin, pointsDraw, pointsLoss});

    res.status(201).json({ message: "Tournament created", tournament: newTournament });
  } catch (error) {
    console.error("Create Tournament Error:", error);
    res.status(500).json({ error: "Failed to create tournament" });
  }
};

const getTournament = async (req, res) => {
  try{
    const list = await Tournament.findAll();

    res.status(201).json({message: "Tournament list here", list:list});
  } catch (error) {
    res.status(500).json({error: "fail to load tournament list"});
  }
};


module.exports =  {createTournament, getTournament};