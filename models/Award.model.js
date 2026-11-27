const { DataTypes } = require("sequelize");
const { AWARD_TYPE } = require("../constants/award.constants");

module.exports = (sequelize) => {
  const Award = sequelize.define(
    "Award",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      type: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(AWARD_TYPE)] },
      },
      title: { type: DataTypes.STRING(80), allowNull: false },
      teamId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      value: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      isAutomatic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: "awards" },
  );

  Award.associate = (models) => {
    Award.belongsTo(models.Tournament, { foreignKey: "tournamentId", as: "tournament" });
    Award.belongsTo(models.Team, { foreignKey: "teamId", as: "team" });
    Award.belongsTo(models.User, { foreignKey: "userId", as: "player" });
  };

  return Award;
};
