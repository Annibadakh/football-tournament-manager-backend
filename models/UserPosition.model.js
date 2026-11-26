const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const UserPosition = sequelize.define(
    "UserPosition",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      positionId: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
      isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: "user_positions" },
  );

  UserPosition.associate = (models) => {
    UserPosition.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    UserPosition.belongsTo(models.Position, { foreignKey: "positionId", as: "position" });
  };

  return UserPosition;
};
