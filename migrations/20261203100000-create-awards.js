"use strict";

const TABLE_OPTIONS = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

const foreignKey = (field, refTable, onDelete = "CASCADE") => ({
  fields: [field],
  type: "foreign key",
  name: `fk_awards_${field}`,
  references: { table: refTable, field: "id" },
  onDelete,
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "awards",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        type: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        title: { type: Sequelize.STRING(80), allowNull: false },
        team_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        // e.g. goals for the Golden Boot
        value: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: true },
        is_automatic: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("awards", ["uuid"], { unique: true, name: "uq_awards_uuid" });
    await queryInterface.addIndex("awards", ["tournament_id"], { name: "idx_awards_tournament" });
    await queryInterface.addIndex("awards", ["user_id"], { name: "idx_awards_user" });
    await queryInterface.addIndex("awards", ["team_id"], { name: "idx_awards_team" });
    await queryInterface.addConstraint("awards", foreignKey("tournament_id", "tournaments"));
    await queryInterface.addConstraint("awards", foreignKey("team_id", "teams"));
    await queryInterface.addConstraint("awards", foreignKey("user_id", "users"));
  },

  async down(queryInterface) {
    await queryInterface.dropTable("awards");
  },
};
