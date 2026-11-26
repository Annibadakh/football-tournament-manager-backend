"use strict";

// Starting master data; admins get management screens for these later
const GAME_FORMATS = [
  {
    code: "5_A_SIDE",
    name: "5-a-side",
    players_per_side: 5,
    default_min_squad: 5,
    default_max_squad: 10,
    sort_order: 1,
  },
  {
    code: "6_A_SIDE",
    name: "6-a-side",
    players_per_side: 6,
    default_min_squad: 6,
    default_max_squad: 11,
    sort_order: 2,
  },
  {
    code: "7_A_SIDE",
    name: "7-a-side",
    players_per_side: 7,
    default_min_squad: 7,
    default_max_squad: 12,
    sort_order: 3,
  },
  {
    code: "8_A_SIDE",
    name: "8-a-side",
    players_per_side: 8,
    default_min_squad: 8,
    default_max_squad: 14,
    sort_order: 4,
  },
  {
    code: "9_A_SIDE",
    name: "9-a-side",
    players_per_side: 9,
    default_min_squad: 9,
    default_max_squad: 15,
    sort_order: 5,
  },
  {
    code: "11_A_SIDE",
    name: "11-a-side",
    players_per_side: 11,
    default_min_squad: 11,
    default_max_squad: 18,
    sort_order: 6,
  },
];

const AGE_GROUPS = [
  { code: "OPEN", name: "Open (all ages)", min_age: null, max_age: null, sort_order: 1 },
  { code: "U12", name: "Under 12", min_age: null, max_age: 11, sort_order: 2 },
  { code: "U14", name: "Under 14", min_age: null, max_age: 13, sort_order: 3 },
  { code: "U16", name: "Under 16", min_age: null, max_age: 15, sort_order: 4 },
  { code: "U17", name: "Under 17", min_age: null, max_age: 16, sort_order: 5 },
  { code: "U19", name: "Under 19", min_age: null, max_age: 18, sort_order: 6 },
  { code: "U21", name: "Under 21", min_age: null, max_age: 20, sort_order: 7 },
  { code: "VETERANS", name: "Veterans (35+)", min_age: 35, max_age: null, sort_order: 8 },
];

const GENDER_CATEGORIES = [
  { code: "MEN", name: "Men", sort_order: 1 },
  { code: "WOMEN", name: "Women", sort_order: 2 },
  { code: "MIXED", name: "Mixed", sort_order: 3 },
];

const withTimestamps = (rows) => {
  const now = new Date();
  return rows.map((row) => ({ ...row, is_active: true, created_at: now, updated_at: now }));
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("game_formats", withTimestamps(GAME_FORMATS), {
      ignoreDuplicates: true,
    });
    await queryInterface.bulkInsert("age_groups", withTimestamps(AGE_GROUPS), {
      ignoreDuplicates: true,
    });
    await queryInterface.bulkInsert("gender_categories", withTimestamps(GENDER_CATEGORIES), {
      ignoreDuplicates: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("gender_categories", {
      code: GENDER_CATEGORIES.map((row) => row.code),
    });
    await queryInterface.bulkDelete("age_groups", { code: AGE_GROUPS.map((row) => row.code) });
    await queryInterface.bulkDelete("game_formats", { code: GAME_FORMATS.map((row) => row.code) });
  },
};
