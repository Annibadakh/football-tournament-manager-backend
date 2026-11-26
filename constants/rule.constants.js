const RULE_CATEGORY = Object.freeze({
  GENERAL: 1,
  MATCH: 2,
  DISCIPLINE: 3,
  ELIGIBILITY: 4,
});

const RULE_LIMITS = Object.freeze({
  TITLE_MAX: 150,
  DESCRIPTION_MAX: 2000,
});

module.exports = { RULE_CATEGORY, RULE_LIMITS };
