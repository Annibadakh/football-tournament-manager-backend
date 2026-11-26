const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "Place",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      googlePlaceId: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(255), allowNull: false },
      formattedAddress: { type: DataTypes.STRING(500), allowNull: true },
      area: { type: DataTypes.STRING(150), allowNull: true },
      city: { type: DataTypes.STRING(150), allowNull: true },
      district: { type: DataTypes.STRING(150), allowNull: true },
      state: { type: DataTypes.STRING(150), allowNull: true },
      pincode: { type: DataTypes.STRING(10), allowNull: true },
      latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: false },
      longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: false },
      // Written through ST_GeomFromText in the repository; never read back (lat/lng columns are)
      location: { type: DataTypes.GEOMETRY("POINT", 4326), allowNull: false },
      types: { type: DataTypes.JSON, allowNull: true },
      detailsFetchedAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
      tableName: "places",
      defaultScope: { attributes: { exclude: ["location"] } },
    },
  );
