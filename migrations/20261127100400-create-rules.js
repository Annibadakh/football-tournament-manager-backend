"use strict";

const TABLE_OPTIONS = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "rules",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        title: { type: Sequelize.STRING(150), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: false },
        category: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        sort_order: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        updated_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("rules", ["uuid"], { unique: true, name: "uq_rules_uuid" });
    await queryInterface.addIndex("rules", ["is_active", "category", "sort_order"], {
      name: "idx_rules_is_active_category_sort_order",
    });

    // A row is either a selected master rule (rule_id) or a custom rule (title + description)
    await queryInterface.createTable(
      "tournament_rules",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        rule_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        title: { type: Sequelize.STRING(150), allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        sort_order: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("tournament_rules", ["uuid"], {
      unique: true,
      name: "uq_tournament_rules_uuid",
    });
    await queryInterface.addIndex("tournament_rules", ["tournament_id", "rule_id"], {
      unique: true,
      name: "uq_tournament_rules_tournament_id_rule_id",
    });
    await queryInterface.addConstraint("tournament_rules", {
      fields: ["tournament_id"],
      type: "foreign key",
      name: "fk_tournament_rules_tournament_id",
      references: { table: "tournaments", field: "id" },
      onDelete: "CASCADE",
    });
    await queryInterface.addConstraint("tournament_rules", {
      fields: ["rule_id"],
      type: "foreign key",
      name: "fk_tournament_rules_rule_id",
      references: { table: "rules", field: "id" },
      onDelete: "CASCADE",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("tournament_rules");
    await queryInterface.dropTable("rules");
  },
};
