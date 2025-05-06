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

module.exports = MatchEvent;  