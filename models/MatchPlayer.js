const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MatchPlayer = sequelize.define('match_player', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  matchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  playerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  playerScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  }
});

// sequelize.sync()
//   .then(() => console.log("match_player table created"))
//   .catch((err) => console.error("Error:", err));

module.exports = MatchPlayer;
