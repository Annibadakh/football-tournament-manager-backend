const { DataTypes } = require("sequelize");
const { ACCOUNT_ROLE, ACCOUNT_STATUS, GENDER } = require("../constants/user.constants");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      fullName: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      phone: { type: DataTypes.CHAR(10), allowNull: true, unique: true },
      passwordHash: { type: DataTypes.STRING(255), allowNull: true },
      accountRole: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(ACCOUNT_ROLE)] },
      },
      accountStatus: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(ACCOUNT_STATUS)] },
      },
      emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
      dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },
      gender: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true,
        validate: { isIn: [Object.values(GENDER)] },
      },
      cityPlaceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      bio: { type: DataTypes.STRING(500), allowNull: true },
      photoKey: { type: DataTypes.STRING(255), allowNull: true },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true },
      createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    {
      tableName: "users",
      paranoid: true,
      // Password hashes are never loaded unless a query asks for the withPassword scope
      defaultScope: { attributes: { exclude: ["passwordHash"] } },
      scopes: { withPassword: { attributes: { include: ["passwordHash"] } } },
    },
  );

  User.associate = (models) => {
    User.belongsTo(models.Place, { foreignKey: "cityPlaceId", as: "city" });
    User.hasMany(models.UserPosition, { foreignKey: "userId", as: "userPositions" });
    User.belongsToMany(models.Position, {
      through: models.UserPosition,
      foreignKey: "userId",
      otherKey: "positionId",
      as: "positions",
    });
  };

  return User;
};
