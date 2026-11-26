"use strict";

const TABLE_OPTIONS = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "places",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        google_place_id: { type: Sequelize.STRING(255), allowNull: false },
        name: { type: Sequelize.STRING(255), allowNull: false },
        formatted_address: { type: Sequelize.STRING(500), allowNull: true },
        area: { type: Sequelize.STRING(150), allowNull: true },
        city: { type: Sequelize.STRING(150), allowNull: true },
        district: { type: Sequelize.STRING(150), allowNull: true },
        state: { type: Sequelize.STRING(150), allowNull: true },
        pincode: { type: Sequelize.STRING(10), allowNull: true },
        latitude: { type: Sequelize.DECIMAL(9, 6), allowNull: false },
        longitude: { type: Sequelize.DECIMAL(9, 6), allowNull: false },
        // SRID 4326 = GPS lat/lng; lets MySQL use the spatial index for distance queries
        location: { type: "POINT NOT NULL SRID 4326", allowNull: false },
        types: { type: Sequelize.JSON, allowNull: true },
        details_fetched_at: { type: Sequelize.DATE, allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("places", ["uuid"], { unique: true, name: "uq_places_uuid" });
    await queryInterface.addIndex("places", ["google_place_id"], {
      unique: true,
      name: "uq_places_google_place_id",
    });
    await queryInterface.addIndex("places", ["location"], {
      type: "SPATIAL",
      name: "sidx_places_location",
    });
    await queryInterface.addIndex("places", ["city"], { name: "idx_places_city" });
    await queryInterface.addIndex("places", ["district"], { name: "idx_places_district" });
    await queryInterface.addIndex("places", ["state"], { name: "idx_places_state" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("places");
  },
};
