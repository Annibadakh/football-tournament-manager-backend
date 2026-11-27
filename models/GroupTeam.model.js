const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const GroupTeam = sequelize.define(
    "GroupTeam",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      groupId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      teamId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    },
    { tableName: "group_teams" },
  );

  GroupTeam.associate = (models) => {
    GroupTeam.belongsTo(models.TournamentGroup, { foreignKey: "groupId", as: "group" });
    GroupTeam.belongsTo(models.Team, { foreignKey: "teamId", as: "team" });
  };

  return GroupTeam;
};
