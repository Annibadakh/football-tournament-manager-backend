"use strict";

// Master list of playing positions (business rule 2.4)
const POSITIONS = [
  { code: "GK", name: "Goalkeeper", short_name: "GK", sort_order: 1 },
  { code: "DEF", name: "Defender", short_name: "DEF", sort_order: 2 },
  { code: "MID", name: "Midfielder", short_name: "MID", sort_order: 3 },
  { code: "FWD", name: "Forward / Striker", short_name: "FWD", sort_order: 4 },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      "positions",
      POSITIONS.map((position) => ({ ...position, created_at: now, updated_at: now })),
      { ignoreDuplicates: true },
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("positions", {
      code: POSITIONS.map((position) => position.code),
    });
  },
};
