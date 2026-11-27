const { DataTypes } = require("sequelize");

// Append-only audit of scorer actions
module.exports = (sequelize) => {
  const MatchLog = sequelize.define(
    "MatchLog",
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      matchId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      actorUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      action: { type: DataTypes.STRING(30), allowNull: false },
      payload: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: "match_logs", updatedAt: false },
  );

  MatchLog.associate = (models) => {
    MatchLog.belongsTo(models.User, { foreignKey: "actorUserId", as: "actor" });
  };

  return MatchLog;
};
