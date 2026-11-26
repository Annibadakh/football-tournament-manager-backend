const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  // Either a selected master rule (ruleId) or a custom rule (title + description)
  const TournamentRule = sequelize.define(
    "TournamentRule",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      ruleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      title: { type: DataTypes.STRING(150), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      sortOrder: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "tournament_rules" },
  );

  TournamentRule.associate = (models) => {
    TournamentRule.belongsTo(models.Rule, { foreignKey: "ruleId", as: "rule" });
  };

  return TournamentRule;
};
