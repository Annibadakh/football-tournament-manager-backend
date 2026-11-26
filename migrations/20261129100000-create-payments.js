"use strict";

const TABLE_OPTIONS = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

const foreignKey = (field, refTable, onDelete = "RESTRICT") => ({
  fields: [field],
  type: "foreign key",
  name: `fk_payments_${field}`,
  references: { table: refTable, field: "id" },
  onDelete,
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "payments",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        team_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        method: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        status: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        offline_mode: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        reference: { type: Sequelize.STRING(100), allowNull: true },
        entry_fee: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        convenience_fee: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        currency: { type: Sequelize.CHAR(3), allowNull: false, defaultValue: "INR" },
        gateway_order_id: { type: Sequelize.STRING(40), allowNull: true },
        gateway_payment_id: { type: Sequelize.STRING(40), allowNull: true },
        failure_reason: { type: Sequelize.STRING(255), allowNull: true },
        receipt_number: { type: Sequelize.STRING(20), allowNull: true },
        paid_by_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        recorded_by_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        paid_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("payments", ["uuid"], { unique: true, name: "uq_payments_uuid" });
    await queryInterface.addIndex("payments", ["gateway_order_id"], {
      unique: true,
      name: "uq_payments_gateway_order_id",
    });
    await queryInterface.addIndex("payments", ["gateway_payment_id"], {
      unique: true,
      name: "uq_payments_gateway_payment_id",
    });
    await queryInterface.addIndex("payments", ["receipt_number"], {
      unique: true,
      name: "uq_payments_receipt_number",
    });
    await queryInterface.addIndex("payments", ["team_id", "status"], {
      name: "idx_payments_team_status",
    });
    await queryInterface.addIndex("payments", ["tournament_id", "status"], {
      name: "idx_payments_tournament_status",
    });
    await queryInterface.addConstraint("payments", foreignKey("team_id", "teams"));
    await queryInterface.addConstraint("payments", foreignKey("tournament_id", "tournaments"));
    await queryInterface.addConstraint(
      "payments",
      foreignKey("paid_by_user_id", "users", "SET NULL"),
    );
    await queryInterface.addConstraint(
      "payments",
      foreignKey("recorded_by_user_id", "users", "SET NULL"),
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("payments");
  },
};
