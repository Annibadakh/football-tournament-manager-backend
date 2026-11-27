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
      "match_events",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        match_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        type: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        // Team the player belongs to (own goals count for the other side)
        team_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        player_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        assist_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        minute: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: true },
        period: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        // A red card created automatically by a second yellow
        is_second_yellow: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        is_reverted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("match_events", ["uuid"], {
      unique: true,
      name: "uq_match_events_uuid",
    });
    await queryInterface.addIndex("match_events", ["match_id", "is_reverted"], {
      name: "idx_match_events_match",
    });
    await queryInterface.addIndex("match_events", ["tournament_id", "type", "player_user_id"], {
      name: "idx_match_events_tournament_type_player",
    });
    await queryInterface.addConstraint(
      "match_events",
      foreignKey("match_events", "match_id", "matches", "CASCADE"),
    );
    await queryInterface.addConstraint(
      "match_events",
      foreignKey("match_events", "tournament_id", "tournaments", "CASCADE"),
    );
    await queryInterface.addConstraint(
      "match_events",
      foreignKey("match_events", "team_id", "teams"),
    );
    await queryInterface.addConstraint(
      "match_events",
      foreignKey("match_events", "player_user_id", "users"),
    );
    await queryInterface.addConstraint(
      "match_events",
      foreignKey("match_events", "assist_user_id", "users"),
    );

    await queryInterface.createTable(
      "match_logs",
      {
        id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        match_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        actor_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        action: { type: Sequelize.STRING(30), allowNull: false },
        payload: { type: Sequelize.JSON, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("match_logs", ["match_id", "id"], {
      name: "idx_match_logs_match",
    });
    await queryInterface.addConstraint(
      "match_logs",
      foreignKey("match_logs", "match_id", "matches", "CASCADE"),
    );

    await queryInterface.createTable(
      "card_notices",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        team_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        reason: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        yellow_count: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        source_match_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        handled_at: { type: Sequelize.DATE, allowNull: true },
        handled_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("card_notices", ["uuid"], {
      unique: true,
      name: "uq_card_notices_uuid",
    });
    // One notice per player, reason and source match (result re-checks stay idempotent)
    await queryInterface.addIndex("card_notices", ["source_match_id", "user_id", "reason"], {
      unique: true,
      name: "uq_card_notices_source_user_reason",
    });
    await queryInterface.addIndex("card_notices", ["tournament_id", "handled_at"], {
      name: "idx_card_notices_tournament_open",
    });
    await queryInterface.addConstraint(
      "card_notices",
      foreignKey("card_notices", "tournament_id", "tournaments", "CASCADE"),
    );
    await queryInterface.addConstraint(
      "card_notices",
      foreignKey("card_notices", "source_match_id", "matches", "CASCADE"),
    );
    await queryInterface.addConstraint(
      "card_notices",
      foreignKey("card_notices", "team_id", "teams"),
    );
    await queryInterface.addConstraint(
      "card_notices",
      foreignKey("card_notices", "user_id", "users"),
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("card_notices");
    await queryInterface.dropTable("match_logs");
    await queryInterface.dropTable("match_events");
  },
};
