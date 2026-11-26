const { DataTypes } = require("sequelize");
const { INVITE_STATUS, INVITE_TYPE } = require("../constants/invite.constants");

module.exports = (sequelize) => {
  const Invite = sequelize.define(
    "Invite",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tokenHash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
      type: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(INVITE_TYPE)] },
      },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      invitedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      status: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: INVITE_STATUS.PENDING,
        validate: { isIn: [Object.values(INVITE_STATUS)] },
      },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      acceptedAt: { type: DataTypes.DATE, allowNull: true },
      // Type-specific context (team, position, ...) added by later phases
      payload: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: "invites" },
  );

  Invite.associate = (models) => {
    Invite.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    Invite.belongsTo(models.User, { foreignKey: "invitedBy", as: "inviter" });
  };

  return Invite;
};
