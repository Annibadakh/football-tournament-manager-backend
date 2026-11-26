const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "RefreshToken",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      tokenHash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
      // All tokens rotated from the same login share a family, so reuse can revoke them together
      familyId: { type: DataTypes.UUID, allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      revokedAt: { type: DataTypes.DATE, allowNull: true },
      replacedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      platform: { type: DataTypes.STRING(10), allowNull: false },
      userAgent: { type: DataTypes.STRING(255), allowNull: true },
      ipAddress: { type: DataTypes.STRING(45), allowNull: true },
    },
    { tableName: "refresh_tokens", updatedAt: false },
  );
