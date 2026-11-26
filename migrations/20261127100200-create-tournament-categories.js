"use strict";

const TABLE_OPTIONS = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

const timestamps = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false },
  updated_at: { type: Sequelize.DATE, allowNull: false },
});

// Master tables, seeded now; management screens come later
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "game_formats",
      {
        id: { type: Sequelize.TINYINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        code: { type: Sequelize.STRING(20), allowNull: false },
        name: { type: Sequelize.STRING(50), allowNull: false },
        players_per_side: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        default_min_squad: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        default_max_squad: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        sort_order: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("game_formats", ["code"], {
      unique: true,
      name: "uq_game_formats_code",
    });

    await queryInterface.createTable(
      "age_groups",
      {
        id: { type: Sequelize.TINYINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        code: { type: Sequelize.STRING(20), allowNull: false },
        name: { type: Sequelize.STRING(50), allowNull: false },
        min_age: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        max_age: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        sort_order: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("age_groups", ["code"], {
      unique: true,
      name: "uq_age_groups_code",
    });

    await queryInterface.createTable(
      "gender_categories",
      {
        id: { type: Sequelize.TINYINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        code: { type: Sequelize.STRING(20), allowNull: false },
        name: { type: Sequelize.STRING(50), allowNull: false },
        sort_order: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("gender_categories", ["code"], {
      unique: true,
      name: "uq_gender_categories_code",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("gender_categories");
    await queryInterface.dropTable("age_groups");
    await queryInterface.dropTable("game_formats");
  },
};
