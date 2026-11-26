"use strict";

const TABLE_OPTIONS = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "users",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        full_name: { type: Sequelize.STRING(100), allowNull: false },
        email: { type: Sequelize.STRING(255), allowNull: false },
        phone: { type: Sequelize.CHAR(10), allowNull: true },
        password_hash: { type: Sequelize.STRING(255), allowNull: true },
        account_role: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        account_status: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        email_verified_at: { type: Sequelize.DATE, allowNull: true },
        date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
        gender: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        city: { type: Sequelize.STRING(100), allowNull: true },
        bio: { type: Sequelize.STRING(500), allowNull: true },
        photo_key: { type: Sequelize.STRING(255), allowNull: true },
        last_login_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        updated_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("users", ["uuid"], { unique: true, name: "uq_users_uuid" });
    await queryInterface.addIndex("users", ["email"], { unique: true, name: "uq_users_email" });
    await queryInterface.addIndex("users", ["phone"], { unique: true, name: "uq_users_phone" });
    await queryInterface.addIndex("users", ["account_role", "account_status"], {
      name: "idx_users_account_role_account_status",
    });
    await queryInterface.addIndex("users", ["full_name"], { name: "idx_users_full_name" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("users");
  },
};
