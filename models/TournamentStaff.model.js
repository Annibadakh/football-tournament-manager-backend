const { DataTypes } = require("sequelize");
const {
  LOCKING_STAFF_STATUSES,
  STAFF_ROLE,
  STAFF_STATUS,
  activeLockFor,
} = require("../constants/team.constants");

module.exports = (sequelize) => {
  const TournamentStaff = sequelize.define(
    "TournamentStaff",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      staffRole: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(STAFF_ROLE)] },
      },
      status: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(STAFF_STATUS)] },
      },
      activeLock: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      invitedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      joinedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "tournament_staff",
      hooks: {
        beforeSave: (staff) => {
          staff.activeLock = activeLockFor(staff.status, LOCKING_STAFF_STATUSES);
        },
      },
    },
  );

  TournamentStaff.associate = (models) => {
    TournamentStaff.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    TournamentStaff.belongsTo(models.Tournament, { foreignKey: "tournamentId", as: "tournament" });
  };

  return TournamentStaff;
};
