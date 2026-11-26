const { DataTypes } = require("sequelize");
const { OTP_PURPOSE } = require("../constants/auth.constants");

module.exports = (sequelize) =>
  sequelize.define(
    "AuthOtp",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      purpose: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(OTP_PURPOSE)] },
      },
      codeHash: { type: DataTypes.CHAR(64), allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      attempts: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      consumedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: "auth_otps", updatedAt: false },
  );
