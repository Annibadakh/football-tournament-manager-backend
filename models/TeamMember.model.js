const { DataTypes } = require("sequelize");
const {
  LOCKING_MEMBER_STATUSES,
  MEMBER_STATUS,
  activeLockFor,
} = require("../constants/team.constants");

module.exports = (sequelize) => {
  const TeamMember = sequelize.define(
    "TeamMember",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      teamId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      tournamentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      positionId: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
      jerseyNumber: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
      isCaptain: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(MEMBER_STATUS)] },
      },
      activeLock: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      invitedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      joinedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "team_members",
      // activeLock is derived from status so the DB unique indexes always match the business rule
      hooks: {
        beforeSave: (member) => {
          member.activeLock = activeLockFor(member.status, LOCKING_MEMBER_STATUSES);
        },
      },
    },
  );

  TeamMember.associate = (models) => {
    TeamMember.belongsTo(models.Team, { foreignKey: "teamId", as: "team" });
    TeamMember.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    TeamMember.belongsTo(models.Position, { foreignKey: "positionId", as: "position" });
  };

  return TeamMember;
};
