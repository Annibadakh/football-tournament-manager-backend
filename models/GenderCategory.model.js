const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "GenderCategory",
    {
      id: { type: DataTypes.TINYINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(50), allowNull: false },
      sortOrder: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "gender_categories" },
  );
