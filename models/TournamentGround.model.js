const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TournamentGround = sequelize.define(
    "TournamentGround",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: false },
      placeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      sortOrder: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "tournament_grounds" },
  );

  TournamentGround.associate = (models) => {
    TournamentGround.belongsTo(models.Place, { foreignKey: "placeId", as: "place" });
  };

  return TournamentGround;
};
