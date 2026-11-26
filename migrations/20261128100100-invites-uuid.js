"use strict";

// Public id so pending invitations can be answered in the app (the email token stays secret)
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("invites", "uuid", {
      type: Sequelize.CHAR(36),
      allowNull: true,
      after: "id",
    });
    await queryInterface.sequelize.query("UPDATE invites SET uuid = UUID() WHERE uuid IS NULL");
    await queryInterface.changeColumn("invites", "uuid", {
      type: Sequelize.CHAR(36),
      allowNull: false,
    });
    await queryInterface.addIndex("invites", ["uuid"], { unique: true, name: "uq_invites_uuid" });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("invites", "uq_invites_uuid");
    await queryInterface.removeColumn("invites", "uuid");
  },
};
