const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "Position",
    {
      id: { type: DataTypes.TINYINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(10), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(50), allowNull: false },
      shortName: { type: DataTypes.STRING(10), allowNull: false },
      sortOrder: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "positions" },
  );
