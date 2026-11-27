const { DataTypes } = require("sequelize");
const {
  DECIDED_BY,
  MATCH_PERIOD,
  MATCH_SLOT,
  MATCH_STAGE,
  MATCH_STATUS,
} = require("../constants/match.constants");

const tinyEnum = (values, { allowNull = false, defaultValue } = {}) => ({
  type: DataTypes.TINYINT.UNSIGNED,
  allowNull,
  ...(defaultValue !== undefined && { defaultValue }),
  validate: { isIn: [Object.values(values)] },
});

module.exports = (sequelize) => {
  const Match = sequelize.define(
    "Match",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      stage: tinyEnum(MATCH_STAGE),
      groupId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      roundNumber: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
      roundName: { type: DataTypes.STRING(40), allowNull: true },
      matchNumber: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      homeTeamId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      awayTeamId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      homePlaceholder: { type: DataTypes.STRING(60), allowNull: true },
      awayPlaceholder: { type: DataTypes.STRING(60), allowNull: true },
      nextMatchId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      nextMatchSlot: tinyEnum(MATCH_SLOT, { allowNull: true }),
      homeSeed: { type: DataTypes.STRING(10), allowNull: true },
      awaySeed: { type: DataTypes.STRING(10), allowNull: true },
      isThirdPlace: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      groundId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      scheduledAt: { type: DataTypes.DATE, allowNull: true },
      status: tinyEnum(MATCH_STATUS),
      period: tinyEnum(MATCH_PERIOD, { defaultValue: MATCH_PERIOD.NOT_STARTED }),
      periodStartedAt: { type: DataTypes.DATE, allowNull: true },
      homeScore: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      awayScore: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      decidedBy: tinyEnum(DECIDED_BY, { allowNull: true }),
      winnerTeamId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      potmUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      endedAt: { type: DataTypes.DATE, allowNull: true },
      declaredBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      // Bumped on every change so live pages can poll cheaply
      version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: "matches" },
  );

  Match.associate = (models) => {
    Match.belongsTo(models.Tournament, { foreignKey: "tournamentId", as: "tournament" });
    Match.belongsTo(models.TournamentGroup, { foreignKey: "groupId", as: "group" });
    Match.belongsTo(models.Team, { foreignKey: "homeTeamId", as: "homeTeam" });
    Match.belongsTo(models.Team, { foreignKey: "awayTeamId", as: "awayTeam" });
    Match.belongsTo(models.Team, { foreignKey: "winnerTeamId", as: "winnerTeam" });
    Match.belongsTo(models.TournamentGround, { foreignKey: "groundId", as: "ground" });
    Match.belongsTo(models.Match, { foreignKey: "nextMatchId", as: "nextMatch" });
    Match.belongsTo(models.User, { foreignKey: "potmUserId", as: "potm" });
  };

  return Match;
};
