const { DataTypes } = require("sequelize");
const { TEAM_SOURCE, TEAM_STATUS } = require("../constants/team.constants");

module.exports = (sequelize) => {
  const Team = sequelize.define(
    "Team",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(60), allowNull: false },
      shortName: { type: DataTypes.STRING(4), allowNull: false },
      captainUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      status: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(TEAM_STATUS)] },
      },
      source: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(TEAM_SOURCE)] },
      },
      requestNumber: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      isSquadLocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      lockedAt: { type: DataTypes.DATE, allowNull: true },
      lockedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      confirmedAt: { type: DataTypes.DATE, allowNull: true },
      confirmedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      reviewedAt: { type: DataTypes.DATE, allowNull: true },
      reviewedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      rejectionReason: { type: DataTypes.STRING(300), allowNull: true },
      createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: "teams" },
  );

  Team.associate = (models) => {
    Team.belongsTo(models.Tournament, { foreignKey: "tournamentId", as: "tournament" });
    Team.belongsTo(models.User, { foreignKey: "captainUserId", as: "captain" });
    Team.hasMany(models.TeamMember, { foreignKey: "teamId", as: "members" });
  };

  return Team;
};
