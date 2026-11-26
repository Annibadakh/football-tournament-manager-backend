// Numeric codes are stored in the DB; never compare against raw numbers
const TEAM_STATUS = Object.freeze({
  PENDING_APPROVAL: 1,
  REJECTED: 2,
  AWAITING_PAYMENT: 3,
  CONFIRMED: 4,
  WITHDRAWN: 5,
  REMOVED: 6,
});

const TEAM_SOURCE = Object.freeze({
  ORGANIZER: 1,
  REQUEST: 2,
});

// Teams that occupy a slot in the tournament (count toward maxTeams)
const SLOT_TEAM_STATUSES = Object.freeze([TEAM_STATUS.AWAITING_PAYMENT, TEAM_STATUS.CONFIRMED]);

// Teams still "alive": their members hold the one-team-per-tournament lock
const LIVE_TEAM_STATUSES = Object.freeze([
  TEAM_STATUS.PENDING_APPROVAL,
  TEAM_STATUS.AWAITING_PAYMENT,
  TEAM_STATUS.CONFIRMED,
]);

const MEMBER_STATUS = Object.freeze({
  INVITED: 1,
  ACTIVE: 2,
  DECLINED: 3,
  REMOVED: 4,
  CANCELLED: 5,
});

// Members in these statuses hold the unique (tournament, user) and (team, jersey) slots
const LOCKING_MEMBER_STATUSES = Object.freeze([MEMBER_STATUS.INVITED, MEMBER_STATUS.ACTIVE]);

const STAFF_ROLE = Object.freeze({
  SCORER: 1,
  MEDIA_OPERATOR: 2,
});

const STAFF_STATUS = Object.freeze({
  INVITED: 1,
  ACTIVE: 2,
  DECLINED: 3,
  REMOVED: 4,
});

const LOCKING_STAFF_STATUSES = Object.freeze([STAFF_STATUS.INVITED, STAFF_STATUS.ACTIVE]);

const REVIEW_DECISION = Object.freeze({
  APPROVE: "approve",
  REJECT: "reject",
});

const TEAM_RULES = Object.freeze({
  NAME_MIN: 2,
  NAME_MAX: 60,
  SHORT_NAME_REGEX: /^[A-Z0-9]{2,4}$/,
  JERSEY_MIN: 1,
  JERSEY_MAX: 99,
  MAX_REQUESTS_PER_CAPTAIN: 2,
  MAX_STAFF_PER_ROLE: 2,
  REJECTION_REASON_MAX: 300,
});

// Unique indexes ignore NULL, so only "locking" rows (value 1) compete for a slot
const activeLockFor = (status, lockingStatuses) => (lockingStatuses.includes(status) ? 1 : null);

module.exports = {
  TEAM_STATUS,
  TEAM_SOURCE,
  SLOT_TEAM_STATUSES,
  LIVE_TEAM_STATUSES,
  MEMBER_STATUS,
  LOCKING_MEMBER_STATUSES,
  STAFF_ROLE,
  STAFF_STATUS,
  LOCKING_STAFF_STATUSES,
  REVIEW_DECISION,
  TEAM_RULES,
  activeLockFor,
};
