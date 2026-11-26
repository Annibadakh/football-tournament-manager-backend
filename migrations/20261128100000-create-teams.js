"use strict";

const TABLE_OPTIONS = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

const foreignKey = (table, field, refTable, onDelete = "RESTRICT") => ({
  fields: [field],
  type: "foreign key",
  name: `fk_${table}_${field}`,
  references: { table: refTable, field: "id" },
  onDelete,
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "teams",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        name: { type: Sequelize.STRING(60), allowNull: false },
        short_name: { type: Sequelize.STRING(4), allowNull: false },
        captain_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        status: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        source: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        request_number: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        is_squad_locked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        locked_at: { type: Sequelize.DATE, allowNull: true },
        locked_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        confirmed_at: { type: Sequelize.DATE, allowNull: true },
        confirmed_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        reviewed_at: { type: Sequelize.DATE, allowNull: true },
        reviewed_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        rejection_reason: { type: Sequelize.STRING(300), allowNull: true },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        updated_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("teams", ["uuid"], { unique: true, name: "uq_teams_uuid" });
    await queryInterface.addIndex("teams", ["tournament_id", "status"], {
      name: "idx_teams_tournament_id_status",
    });
    await queryInterface.addIndex("teams", ["captain_user_id", "tournament_id"], {
      name: "idx_teams_captain_user_id_tournament_id",
    });
    await queryInterface.addConstraint(
      "teams",
      foreignKey("teams", "tournament_id", "tournaments"),
    );
    await queryInterface.addConstraint("teams", foreignKey("teams", "captain_user_id", "users"));

    await queryInterface.createTable(
      "team_members",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        team_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        position_id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        jersey_number: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        is_captain: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        status: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        // 1 while INVITED/ACTIVE, NULL otherwise: unique indexes ignore NULLs
        active_lock: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        invited_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        joined_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("team_members", ["uuid"], {
      unique: true,
      name: "uq_team_members_uuid",
    });
    // One team per tournament for every player (business rule 4)
    await queryInterface.addIndex("team_members", ["tournament_id", "user_id", "active_lock"], {
      unique: true,
      name: "uq_team_members_tournament_id_user_id_active_lock",
    });
    await queryInterface.addIndex("team_members", ["team_id", "jersey_number", "active_lock"], {
      unique: true,
      name: "uq_team_members_team_id_jersey_number_active_lock",
    });
    await queryInterface.addIndex("team_members", ["user_id", "status"], {
      name: "idx_team_members_user_id_status",
    });
    await queryInterface.addConstraint(
      "team_members",
      foreignKey("team_members", "team_id", "teams", "CASCADE"),
    );
    await queryInterface.addConstraint(
      "team_members",
      foreignKey("team_members", "tournament_id", "tournaments"),
    );
    await queryInterface.addConstraint(
      "team_members",
      foreignKey("team_members", "user_id", "users"),
    );
    await queryInterface.addConstraint(
      "team_members",
      foreignKey("team_members", "position_id", "positions"),
    );

    await queryInterface.createTable(
      "tournament_staff",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        staff_role: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        status: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        active_lock: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        invited_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        joined_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("tournament_staff", ["uuid"], {
      unique: true,
      name: "uq_tournament_staff_uuid",
    });
    await queryInterface.addIndex(
      "tournament_staff",
      ["tournament_id", "user_id", "staff_role", "active_lock"],
      {
        unique: true,
        name: "uq_tournament_staff_tournament_id_user_id_staff_role_active_lock",
      },
    );
    await queryInterface.addIndex("tournament_staff", ["user_id", "status"], {
      name: "idx_tournament_staff_user_id_status",
    });
    await queryInterface.addConstraint(
      "tournament_staff",
      foreignKey("tournament_staff", "tournament_id", "tournaments", "CASCADE"),
    );
    await queryInterface.addConstraint(
      "tournament_staff",
      foreignKey("tournament_staff", "user_id", "users"),
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("tournament_staff");
    await queryInterface.dropTable("team_members");
    await queryInterface.dropTable("teams");
  },
};
