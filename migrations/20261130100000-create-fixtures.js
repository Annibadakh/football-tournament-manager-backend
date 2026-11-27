"use strict";

const TABLE_OPTIONS = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

const foreignKey = (table, field, refTable, onDelete = "RESTRICT") => ({
  fields: [field],
  type: "foreign key",
  name: `fk_${table}_${field}`,
  references: { table: refTable, field: "id" },
  onDelete,
});

const timestamps = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false },
  updated_at: { type: Sequelize.DATE, allowNull: false },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    // Match settings and group setup live on the tournament
    await queryInterface.addColumn("tournaments", "half_minutes", {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addColumn("tournaments", "extra_time_half_minutes", {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addColumn("tournaments", "yellow_card_notice_threshold", {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 2,
    });
    await queryInterface.addColumn("tournaments", "groups_count", {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addColumn("tournaments", "qualifiers_per_group", {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: true,
    });

    await queryInterface.createTable(
      "tournament_groups",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        name: { type: Sequelize.STRING(20), allowNull: false },
        sort_order: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("tournament_groups", ["uuid"], {
      unique: true,
      name: "uq_tournament_groups_uuid",
    });
    await queryInterface.addIndex("tournament_groups", ["tournament_id", "name"], {
      unique: true,
      name: "uq_tournament_groups_tournament_name",
    });
    await queryInterface.addConstraint(
      "tournament_groups",
      foreignKey("tournament_groups", "tournament_id", "tournaments", "CASCADE"),
    );

    await queryInterface.createTable(
      "group_teams",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        team_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
    // A team sits in at most one group per tournament
    await queryInterface.addIndex("group_teams", ["tournament_id", "team_id"], {
      unique: true,
      name: "uq_group_teams_tournament_team",
    });
    await queryInterface.addIndex("group_teams", ["group_id"], { name: "idx_group_teams_group" });
    await queryInterface.addConstraint(
      "group_teams",
      foreignKey("group_teams", "group_id", "tournament_groups", "CASCADE"),
    );
    await queryInterface.addConstraint(
      "group_teams",
      foreignKey("group_teams", "team_id", "teams", "CASCADE"),
    );
    await queryInterface.addConstraint(
      "group_teams",
      foreignKey("group_teams", "tournament_id", "tournaments", "CASCADE"),
    );

    await queryInterface.createTable(
      "matches",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        stage: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        round_number: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        round_name: { type: Sequelize.STRING(40), allowNull: true },
        match_number: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false },
        home_team_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        away_team_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        home_placeholder: { type: Sequelize.STRING(60), allowNull: true },
        away_placeholder: { type: Sequelize.STRING(60), allowNull: true },
        next_match_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        next_match_slot: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        // Knockout seeds from groups: "A1" means Group A, 1st place
        home_seed: { type: Sequelize.STRING(10), allowNull: true },
        away_seed: { type: Sequelize.STRING(10), allowNull: true },
        is_third_place: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        ground_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        scheduled_at: { type: Sequelize.DATE, allowNull: true },
        status: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        period: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        period_started_at: { type: Sequelize.DATE, allowNull: true },
        home_score: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        away_score: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        decided_by: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        winner_team_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        potm_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        started_at: { type: Sequelize.DATE, allowNull: true },
        ended_at: { type: Sequelize.DATE, allowNull: true },
        declared_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("matches", ["uuid"], { unique: true, name: "uq_matches_uuid" });
    await queryInterface.addIndex("matches", ["tournament_id", "match_number"], {
      unique: true,
      name: "uq_matches_tournament_number",
    });
    await queryInterface.addIndex("matches", ["tournament_id", "status"], {
      name: "idx_matches_tournament_status",
    });
    await queryInterface.addIndex("matches", ["tournament_id", "scheduled_at"], {
      name: "idx_matches_tournament_scheduled",
    });
    await queryInterface.addIndex("matches", ["ground_id", "scheduled_at"], {
      name: "idx_matches_ground_scheduled",
    });
    await queryInterface.addIndex("matches", ["home_team_id"], { name: "idx_matches_home_team" });
    await queryInterface.addIndex("matches", ["away_team_id"], { name: "idx_matches_away_team" });
    await queryInterface.addConstraint(
      "matches",
      foreignKey("matches", "tournament_id", "tournaments", "CASCADE"),
    );
    await queryInterface.addConstraint(
      "matches",
      foreignKey("matches", "group_id", "tournament_groups", "SET NULL"),
    );
    await queryInterface.addConstraint("matches", foreignKey("matches", "home_team_id", "teams"));
    await queryInterface.addConstraint("matches", foreignKey("matches", "away_team_id", "teams"));
    await queryInterface.addConstraint("matches", foreignKey("matches", "winner_team_id", "teams"));
    await queryInterface.addConstraint(
      "matches",
      foreignKey("matches", "next_match_id", "matches", "SET NULL"),
    );
    await queryInterface.addConstraint(
      "matches",
      foreignKey("matches", "ground_id", "tournament_grounds", "SET NULL"),
    );
    await queryInterface.addConstraint(
      "matches",
      foreignKey("matches", "potm_user_id", "users", "SET NULL"),
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("matches");
    await queryInterface.dropTable("group_teams");
    await queryInterface.dropTable("tournament_groups");
    for (const column of [
      "qualifiers_per_group",
      "groups_count",
      "yellow_card_notice_threshold",
      "extra_time_half_minutes",
      "half_minutes",
    ]) {
      await queryInterface.removeColumn("tournaments", column);
    }
  },
};
