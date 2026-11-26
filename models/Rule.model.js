const { DataTypes } = require("sequelize");
const { RULE_CATEGORY } = require("../constants/rule.constants");

module.exports = (sequelize) =>
  sequelize.define(
    "Rule",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      title: { type: DataTypes.STRING(150), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      category: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { isIn: [Object.values(RULE_CATEGORY)] },
      },
      sortOrder: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: "rules" },
  );
