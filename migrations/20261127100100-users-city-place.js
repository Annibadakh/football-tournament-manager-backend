"use strict";

// Player city moves from free text to a Google place (business rule: structured locations)
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "city");
    await queryInterface.addColumn("users", "city_place_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      after: "gender",
    });
    await queryInterface.addConstraint("users", {
      fields: ["city_place_id"],
      type: "foreign key",
      name: "fk_users_city_place_id",
      references: { table: "places", field: "id" },
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint("users", "fk_users_city_place_id");
    await queryInterface.removeColumn("users", "city_place_id");
    await queryInterface.addColumn("users", "city", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },
};
