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
      "tournaments",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        slug: { type: Sequelize.STRING(180), allowNull: false },
        organizer_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        name: { type: Sequelize.STRING(150), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        logo_key: { type: Sequelize.STRING(255), allowNull: true },
        banner_key: { type: Sequelize.STRING(255), allowNull: true },
        status: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        published_at: { type: Sequelize.DATE, allowNull: true },
        tournament_format: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        game_format_id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        age_group_id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        gender_category_id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        start_date: { type: Sequelize.DATEONLY, allowNull: true },
        end_date: { type: Sequelize.DATEONLY, allowNull: true },
        registration_deadline: { type: Sequelize.DATEONLY, allowNull: true },
        entry_fee: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        min_teams: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: true },
        max_teams: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: true },
        min_squad_size: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        max_squad_size: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
        points_win: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 3 },
        points_draw: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
        points_loss: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        city_place_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        venue_place_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        venue_details: { type: Sequelize.STRING(500), allowNull: true },
        contact_phone: { type: Sequelize.CHAR(10), allowNull: true },
        is_streaming_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        updated_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("tournaments", ["uuid"], {
      unique: true,
      name: "uq_tournaments_uuid",
    });
    await queryInterface.addIndex("tournaments", ["slug"], {
      unique: true,
      name: "uq_tournaments_slug",
    });
    // Feed and public list queries filter by status and order by start date
    await queryInterface.addIndex("tournaments", ["status", "start_date"], {
      name: "idx_tournaments_status_start_date",
    });
    await queryInterface.addIndex("tournaments", ["organizer_id", "status"], {
      name: "idx_tournaments_organizer_id_status",
    });
    await queryInterface.addIndex("tournaments", ["city_place_id", "status"], {
      name: "idx_tournaments_city_place_id_status",
    });
    await queryInterface.addIndex("tournaments", ["venue_place_id"], {
      name: "idx_tournaments_venue_place_id",
    });
    await queryInterface.addIndex("tournaments", ["name"], { name: "idx_tournaments_name" });
    await queryInterface.addConstraint(
      "tournaments",
      foreignKey("tournaments", "organizer_id", "users"),
    );
    await queryInterface.addConstraint(
      "tournaments",
      foreignKey("tournaments", "city_place_id", "places"),
    );
    await queryInterface.addConstraint(
      "tournaments",
      foreignKey("tournaments", "venue_place_id", "places"),
    );
    await queryInterface.addConstraint(
      "tournaments",
      foreignKey("tournaments", "game_format_id", "game_formats"),
    );
    await queryInterface.addConstraint(
      "tournaments",
      foreignKey("tournaments", "age_group_id", "age_groups"),
    );
    await queryInterface.addConstraint(
      "tournaments",
      foreignKey("tournaments", "gender_category_id", "gender_categories"),
    );

    await queryInterface.createTable(
      "tournament_grounds",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        name: { type: Sequelize.STRING(100), allowNull: false },
        place_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        sort_order: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("tournament_grounds", ["uuid"], {
      unique: true,
      name: "uq_tournament_grounds_uuid",
    });
    await queryInterface.addIndex("tournament_grounds", ["tournament_id", "name"], {
      unique: true,
      name: "uq_tournament_grounds_tournament_id_name",
    });
    await queryInterface.addConstraint(
      "tournament_grounds",
      foreignKey("tournament_grounds", "tournament_id", "tournaments", "CASCADE"),
    );
    await queryInterface.addConstraint(
      "tournament_grounds",
      foreignKey("tournament_grounds", "place_id", "places", "SET NULL"),
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("tournament_grounds");
    await queryInterface.dropTable("tournaments");
  },
};
