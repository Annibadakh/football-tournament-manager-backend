const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Tournament = sequelize.define("Tournament", {
  uuid: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    validate: {
      notEmpty: true,
    },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  totalTeams: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("league", "group", "knockout"),
    allowNull: false,
  },
  teamSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  amountPerTeam: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pointsWin: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pointsDraw: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pointsLoss: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

sequelize.sync()
  .then(() => console.log("tournament table created"))
  .catch((err) => console.error("Error:", err));

module.exports = Tournament;
  