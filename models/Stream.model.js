const { DataTypes } = require("sequelize");
const { STREAM_STATUS } = require("../constants/stream.constants");

module.exports = (sequelize) => {
  const Stream = sequelize.define(
    "Stream",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      matchId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      title: { type: DataTypes.STRING(120), allowNull: false },
      youtubeVideoId: { type: DataTypes.CHAR(11), allowNull: false },
      scheduledAt: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(STREAM_STATUS)] },
      },
      isEmbeddable: { type: DataTypes.BOOLEAN, allowNull: true },
      thumbnailUrl: { type: DataTypes.STRING(300), allowNull: true },
      channelName: { type: DataTypes.STRING(120), allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      endedAt: { type: DataTypes.DATE, allowNull: true },
      createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: "streams" },
  );

  Stream.associate = (models) => {
    Stream.belongsTo(models.Tournament, { foreignKey: "tournamentId", as: "tournament" });
    Stream.belongsTo(models.Match, { foreignKey: "matchId", as: "match" });
  };

  return Stream;
};
