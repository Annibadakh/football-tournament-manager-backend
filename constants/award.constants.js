// Stored as TINYINT; labels live in the frontend
const AWARD_TYPE = Object.freeze({
  CHAMPION: 1,
  RUNNER_UP: 2,
  THIRD_PLACE: 3,
  GROUP_WINNER: 4,
  GOLDEN_BOOT: 5,
  MOST_ASSISTS: 6,
  MOST_POTM: 7,
  CUSTOM: 10,
});

const AWARD_TITLE = Object.freeze({
  [AWARD_TYPE.CHAMPION]: "Champion",
  [AWARD_TYPE.RUNNER_UP]: "Runner-up",
  [AWARD_TYPE.THIRD_PLACE]: "Third place",
  [AWARD_TYPE.GOLDEN_BOOT]: "Golden Boot",
  [AWARD_TYPE.MOST_ASSISTS]: "Most assists",
  [AWARD_TYPE.MOST_POTM]: "Most Player of the Match",
});

// Team awards also appear on their players' profiles
const TEAM_AWARD_TYPES = Object.freeze([
  AWARD_TYPE.CHAMPION,
  AWARD_TYPE.RUNNER_UP,
  AWARD_TYPE.THIRD_PLACE,
  AWARD_TYPE.GROUP_WINNER,
]);

const AWARD_RULES = Object.freeze({ TITLE_MIN: 3, TITLE_MAX: 80 });

module.exports = { AWARD_TYPE, AWARD_TITLE, TEAM_AWARD_TYPES, AWARD_RULES };
