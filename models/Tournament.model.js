const { DataTypes } = require("sequelize");
const { TOURNAMENT_FORMAT, TOURNAMENT_STATUS } = require("../constants/tournament.constants");

module.exports = (sequelize) => {
  const Tournament = sequelize.define(
    "Tournament",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
      organizerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      logoKey: { type: DataTypes.STRING(255), allowNull: true },
      bannerKey: { type: DataTypes.STRING(255), allowNull: true },
      status: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: TOURNAMENT_STATUS.DRAFT,
        validate: { isIn: [Object.values(TOURNAMENT_STATUS)] },
      },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      tournamentFormat: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true,
        validate: { isIn: [Object.values(TOURNAMENT_FORMAT)] },
      },
      gameFormatId: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      ageGroupId: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      genderCategoryId: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      startDate: { type: DataTypes.DATEONLY, allowNull: true },
      endDate: { type: DataTypes.DATEONLY, allowNull: true },
      registrationDeadline: { type: DataTypes.DATEONLY, allowNull: true },
      entryFee: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      minTeams: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      maxTeams: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      minSquadSize: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      maxSquadSize: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      pointsWin: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 3 },
      pointsDraw: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
      pointsLoss: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      cityPlaceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      venuePlaceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      venueDetails: { type: DataTypes.STRING(500), allowNull: true },
      contactPhone: { type: DataTypes.CHAR(10), allowNull: true },
      isStreamingEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: "tournaments", paranoid: true },
  );

  Tournament.associate = (models) => {
    Tournament.belongsTo(models.User, { foreignKey: "organizerId", as: "organizer" });
    Tournament.belongsTo(models.Place, { foreignKey: "cityPlaceId", as: "city" });
    Tournament.belongsTo(models.Place, { foreignKey: "venuePlaceId", as: "venue" });
    Tournament.belongsTo(models.GameFormat, { foreignKey: "gameFormatId", as: "gameFormat" });
    Tournament.belongsTo(models.AgeGroup, { foreignKey: "ageGroupId", as: "ageGroup" });
    Tournament.belongsTo(models.GenderCategory, {
      foreignKey: "genderCategoryId",
      as: "genderCategory",
    });
    Tournament.hasMany(models.TournamentGround, { foreignKey: "tournamentId", as: "grounds" });
    Tournament.hasMany(models.TournamentRule, {
      foreignKey: "tournamentId",
      as: "tournamentRules",
    });
  };

  return Tournament;
};
