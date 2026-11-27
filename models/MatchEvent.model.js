const { DataTypes } = require("sequelize");
const { MATCH_EVENT_TYPE, MATCH_PERIOD } = require("../constants/match.constants");

module.exports = (sequelize) => {
  const MatchEvent = sequelize.define(
    "MatchEvent",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      matchId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      type: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(MATCH_EVENT_TYPE)] },
      },
      teamId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      playerUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      assistUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      minute: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      period: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(MATCH_PERIOD)] },
      },
      isSecondYellow: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      isReverted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: "match_events" },
  );

  MatchEvent.associate = (models) => {
    MatchEvent.belongsTo(models.Match, { foreignKey: "matchId", as: "match" });
    MatchEvent.belongsTo(models.Team, { foreignKey: "teamId", as: "team" });
    MatchEvent.belongsTo(models.User, { foreignKey: "playerUserId", as: "player" });
    MatchEvent.belongsTo(models.User, { foreignKey: "assistUserId", as: "assist" });
  };

  return MatchEvent;
};
