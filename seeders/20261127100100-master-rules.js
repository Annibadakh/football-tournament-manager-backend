"use strict";

const crypto = require("crypto");

// Starter rule book (categories: 1 general, 2 match, 3 discipline, 4 eligibility); admins edit it in the app
const RULES = [
  [
    1,
    "Fair play",
    "All teams and players must respect opponents, officials and spectators. Abusive language or behaviour can lead to removal from the tournament.",
  ],
  [
    1,
    "Organizer's decision is final",
    "Any dispute not covered by these rules is decided by the tournament organizer, whose decision is final.",
  ],
  [
    2,
    "Reporting time",
    "Teams must report at the ground at least 15 minutes before their scheduled kick-off. A team not ready within 10 minutes of kick-off may be given a walkover against it.",
  ],
  [
    2,
    "Substitutions",
    "Rolling substitutions are allowed unless the tournament rules say otherwise. Substitutions happen at the halfway line with the referee's permission.",
  ],
  [
    2,
    "Tied knockout matches",
    "If a knockout match is tied at full time, the tournament decides it by extra time and/or penalties as announced by the organizer.",
  ],
  [
    3,
    "Yellow cards",
    "Two yellow cards in the same match result in a red card. Accumulated yellow cards may lead to a suspension as decided by the organizer.",
  ],
  [
    3,
    "Red cards",
    "A player shown a red card must leave the field immediately and may be suspended for the next match. The organizer decides the length of the suspension.",
  ],
  [4, "One team per tournament", "A player can be registered with only one team in a tournament."],
  [
    4,
    "Registered players only",
    "Only players listed in the team's approved squad may play. Fielding an unregistered player can lead to forfeiting the match.",
  ],
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      "rules",
      RULES.map(([category, title, description], index) => ({
        uuid: crypto.randomUUID(),
        title,
        description,
        category,
        sort_order: index + 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      })),
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("rules", { title: RULES.map(([, title]) => title) });
  },
};
