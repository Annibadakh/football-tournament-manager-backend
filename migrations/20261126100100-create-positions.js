"use strict";

const TABLE_OPTIONS = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "positions",
      {
        id: { type: Sequelize.TINYINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        code: { type: Sequelize.STRING(10), allowNull: false },
        name: { type: Sequelize.STRING(50), allowNull: false },
        short_name: { type: Sequelize.STRING(10), allowNull: false },
        sort_order: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("positions", ["code"], {
      unique: true,
      name: "uq_positions_code",
    });

    await queryInterface.createTable(
      "user_positions",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        position_id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("user_positions", ["user_id", "position_id"], {
      unique: true,
      name: "uq_user_positions_user_id_position_id",
    });
    await queryInterface.addIndex("user_positions", ["position_id"], {
      name: "idx_user_positions_position_id",
    });
    await queryInterface.addConstraint("user_positions", {
      fields: ["user_id"],
      type: "foreign key",
      name: "fk_user_positions_user_id",
      references: { table: "users", field: "id" },
      onDelete: "CASCADE",
    });
    await queryInterface.addConstraint("user_positions", {
      fields: ["position_id"],
      type: "foreign key",
      name: "fk_user_positions_position_id",
      references: { table: "positions", field: "id" },
      onDelete: "RESTRICT",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user_positions");
    await queryInterface.dropTable("positions");
  },
};
