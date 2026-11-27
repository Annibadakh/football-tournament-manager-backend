"use strict";

const TABLE_OPTIONS = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

const foreignKey = (field, refTable, onDelete = "RESTRICT") => ({
  fields: [field],
  type: "foreign key",
  name: `fk_streams_${field}`,
  references: { table: refTable, field: "id" },
  onDelete,
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "streams",
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.CHAR(36), allowNull: false },
        tournament_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        match_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        title: { type: Sequelize.STRING(120), allowNull: false },
        youtube_video_id: { type: Sequelize.CHAR(11), allowNull: false },
        scheduled_at: { type: Sequelize.DATE, allowNull: true },
        status: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        // From YouTube oEmbed; null = unknown (YouTube unreachable or video not public yet)
        is_embeddable: { type: Sequelize.BOOLEAN, allowNull: true },
        thumbnail_url: { type: Sequelize.STRING(300), allowNull: true },
        channel_name: { type: Sequelize.STRING(120), allowNull: true },
        started_at: { type: Sequelize.DATE, allowNull: true },
        ended_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        updated_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex("streams", ["uuid"], { unique: true, name: "uq_streams_uuid" });
    // Exactly one stream per match (NULLs allowed for tournament streams)
    await queryInterface.addIndex("streams", ["match_id"], {
      unique: true,
      name: "uq_streams_match",
    });
    await queryInterface.addIndex("streams", ["tournament_id", "status"], {
      name: "idx_streams_tournament_status",
    });
    await queryInterface.addConstraint(
      "streams",
      foreignKey("tournament_id", "tournaments", "CASCADE"),
    );
    await queryInterface.addConstraint("streams", foreignKey("match_id", "matches", "CASCADE"));
  },

  async down(queryInterface) {
    await queryInterface.dropTable("streams");
  },
};
