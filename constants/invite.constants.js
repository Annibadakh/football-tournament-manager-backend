// TEAM_JOIN and STAFF_ASSIGN are added in Phase 3
const INVITE_TYPE = Object.freeze({
  ACCOUNT_SETUP: 1,
});

const INVITE_STATUS = Object.freeze({
  PENDING: 1,
  ACCEPTED: 2,
  EXPIRED: 3,
  REVOKED: 4,
});

const INVITE_TTL_DAYS = 7;

module.exports = { INVITE_TYPE, INVITE_STATUS, INVITE_TTL_DAYS };
