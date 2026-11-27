const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TournamentGroup = sequelize.define(
    "TournamentGroup",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(20), allowNull: false },
      sortOrder: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "tournament_groups" },
  );

  TournamentGroup.associate = (models) => {
    TournamentGroup.hasMany(models.GroupTeam, { foreignKey: "groupId", as: "groupTeams" });
  };

  return TournamentGroup;
};
