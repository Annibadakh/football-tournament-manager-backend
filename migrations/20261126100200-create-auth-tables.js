"use strict";

const TABLE_OPTIONS = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

const userForeignKey = (table) => ({
  fields: ["user_id"],
  type: "foreign key",
  name: `fk_${table}_user_id`,
  references: { table: "users", field: "id" },
  onDelete: "CASCADE",
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "auth_otps",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        purpose: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        code_hash: { type: Sequelize.CHAR(64), allowNull: false },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        attempts: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        consumed_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("auth_otps", ["user_id", "purpose", "created_at"], {
      name: "idx_auth_otps_user_id_purpose_created_at",
    });
    await queryInterface.addConstraint("auth_otps", userForeignKey("auth_otps"));

    await queryInterface.createTable(
      "refresh_tokens",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        token_hash: { type: Sequelize.CHAR(64), allowNull: false },
        family_id: { type: Sequelize.CHAR(36), allowNull: false },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        revoked_at: { type: Sequelize.DATE, allowNull: true },
        replaced_by_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        platform: { type: Sequelize.STRING(10), allowNull: false },
        user_agent: { type: Sequelize.STRING(255), allowNull: true },
        ip_address: { type: Sequelize.STRING(45), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("refresh_tokens", ["token_hash"], {
      unique: true,
      name: "uq_refresh_tokens_token_hash",
    });
    await queryInterface.addIndex("refresh_tokens", ["user_id", "revoked_at"], {
      name: "idx_refresh_tokens_user_id_revoked_at",
    });
    await queryInterface.addIndex("refresh_tokens", ["family_id"], {
      name: "idx_refresh_tokens_family_id",
    });
    await queryInterface.addConstraint("refresh_tokens", userForeignKey("refresh_tokens"));

    await queryInterface.createTable(
      "invites",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        token_hash: { type: Sequelize.CHAR(64), allowNull: false },
        type: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        invited_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        status: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        accepted_at: { type: Sequelize.DATE, allowNull: true },
        payload: { type: Sequelize.JSON, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("invites", ["token_hash"], {
      unique: true,
      name: "uq_invites_token_hash",
    });
    await queryInterface.addIndex("invites", ["user_id", "type", "status"], {
      name: "idx_invites_user_id_type_status",
    });
    await queryInterface.addConstraint("invites", userForeignKey("invites"));
    await queryInterface.addConstraint("invites", {
      fields: ["invited_by"],
      type: "foreign key",
      name: "fk_invites_invited_by",
      references: { table: "users", field: "id" },
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("invites");
    await queryInterface.dropTable("refresh_tokens");
    await queryInterface.dropTable("auth_otps");
  },
};
