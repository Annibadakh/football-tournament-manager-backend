const { DataTypes } = require("sequelize");
const { CARD_NOTICE_REASON } = require("../constants/match.constants");

module.exports = (sequelize) => {
  const CardNotice = sequelize.define(
    "CardNotice",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      teamId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      reason: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(CARD_NOTICE_REASON)] },
      },
      yellowCount: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      sourceMatchId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      handledAt: { type: DataTypes.DATE, allowNull: true },
      handledBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: "card_notices" },
  );

  CardNotice.associate = (models) => {
    CardNotice.belongsTo(models.User, { foreignKey: "userId", as: "player" });
    CardNotice.belongsTo(models.Team, { foreignKey: "teamId", as: "team" });
    CardNotice.belongsTo(models.Match, { foreignKey: "sourceMatchId", as: "sourceMatch" });
  };

  return CardNotice;
};
