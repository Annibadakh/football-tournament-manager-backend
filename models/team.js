const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Team = sequelize.define("Team", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  tournamentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  teamName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  captainName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  captainEmail: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  captainContact: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  uuid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  logoUrl: {
    type: DataTypes.STRING,
  },
  totalPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  goalsScored: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  goalsConceded: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

// sequelize.sync()
//   .then(() => console.log("team table created"))
//   .catch((err) => console.error("Error:", err));

module.exports = Team;
