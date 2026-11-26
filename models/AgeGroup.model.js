const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "AgeGroup",
    {
      id: { type: DataTypes.TINYINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(50), allowNull: false },
      minAge: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      maxAge: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      sortOrder: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "age_groups" },
  );
