const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Player = sequelize.define("Player", {
    playerId: {
    type: DataTypes.STRING(4),
    primaryKey: true,
    defaultValue: () => String(Math.floor(1000 + Math.random() * 9000)),
    },
  teamId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  position: {
    type: DataTypes.ENUM("Striker", "Defender", "Mid-Fielder", "Goalkeeper"),
    allowNull: false,
  },
  totalScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  addPoint: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  photoUrl: {
    type: DataTypes.STRING,
  },
  jerseyNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});
// sequelize.sync()
//   .then(() => console.log("player table created"))
//   .catch((err) => console.error("Error:", err));


module.exports = Player;
