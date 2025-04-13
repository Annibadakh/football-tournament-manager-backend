const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


    const MatchEvent = sequelize.define('MatchEvent', {
      teamName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      operationId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    });
  
// sequelize.sync()
//   .then(() => console.log("match event table created"))
//   .catch((err) => console.error("Error:", err));

module.exports = MatchEvent;  