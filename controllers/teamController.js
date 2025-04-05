const Team = require("../models/team");
const User = require("../models/user");
const Tournament = require("../models/tournament");
const bcrypt = require("bcryptjs");

const addTeam = async (req, res) => {
  const {teamName, captainName,  captainEmail, captainContact, isApproved, logoUrl,totalPoints, tournamentId} = req.body;
  try {
    const existingUser = await User.findOne({ where: { email: captainEmail} });
    if (existingUser) return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(captainEmail, 12);
    const newUser = await User.create({
      name: captainName,
      email: captainEmail,
      password: hashedPassword,
      role: "captain",
      contactNum: captainContact
    });
    const team = await Team.create({teamName, captainName, captainEmail, captainContact, isApproved, logoUrl, totalPoints, tournamentId, uuid: newUser.uuid});
    res.status(201).json({message:"team and user created success !!",team, newUser});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add team." });
  }
};

const getTeamsByTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const teams = await Team.findAll({ where: { tournamentId } });
    res.status(200).json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch teams." });
  }
};


const getTeamById = async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get team." });
  }
};
const getTeamByuuid = async (req, res) => {
  const uuid = req.params.uuid;
  console.log("uer id", uuid)
  try {
    const team = await Team.findOne({
      where: {uuid}
    });
    const tournament = await Tournament.findByPk(team.tournamentId);
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json({team, tournament});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get team." });
  }
};

module.exports = {addTeam, getTeamsByTournament, getTeamById, getTeamByuuid};