const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tournamentId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  team1Id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  team2Id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  referee: {
    type: DataTypes.STRING,
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  halfTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  breakTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'started', 'half-time', 'break', 'paused', 'ended'),
    defaultValue: 'pending'
  },
  stage: {
    type: DataTypes.ENUM('league', 'quarter-final', 'semi-final', 'final'),
    defaultValue: 'league'
  },
  matchOutcome: {
    type: DataTypes.ENUM('team1', 'team2', 'tie', 'undecided'),
    defaultValue: 'undecided'
  },
  winnerTeamId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  totalGoalsTeam1: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalGoalsTeam2: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// sequelize.sync()
//   .then(() => console.log("match table created"))
//   .catch((err) => console.error("Error:", err));

module.exports = Match;
