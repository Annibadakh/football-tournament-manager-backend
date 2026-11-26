// Numeric codes are stored in the DB; never compare against raw numbers
const TOURNAMENT_STATUS = Object.freeze({
  DRAFT: 1,
  REGISTRATION_OPEN: 2,
  ONGOING: 3,
  COMPLETED: 4,
  CANCELLED: 5,
});

// Structure drives fixture logic (Phase 5), so it is a constant, not a master table
const TOURNAMENT_FORMAT = Object.freeze({
  LEAGUE: 1,
  KNOCKOUT: 2,
  GROUP_LEAGUE: 3,
  GROUP_KNOCKOUT: 4,
});

// Allowed manual status changes (business rule: manual with guards until schedulers exist)
const STATUS_TRANSITIONS = Object.freeze({
  [TOURNAMENT_STATUS.DRAFT]: [TOURNAMENT_STATUS.REGISTRATION_OPEN, TOURNAMENT_STATUS.CANCELLED],
  [TOURNAMENT_STATUS.REGISTRATION_OPEN]: [
    TOURNAMENT_STATUS.DRAFT,
    TOURNAMENT_STATUS.ONGOING,
    TOURNAMENT_STATUS.CANCELLED,
  ],
  [TOURNAMENT_STATUS.ONGOING]: [TOURNAMENT_STATUS.COMPLETED, TOURNAMENT_STATUS.CANCELLED],
  [TOURNAMENT_STATUS.COMPLETED]: [],
  [TOURNAMENT_STATUS.CANCELLED]: [],
});

// Everything except drafts is visible to the public
const PUBLIC_STATUSES = Object.freeze([
  TOURNAMENT_STATUS.REGISTRATION_OPEN,
  TOURNAMENT_STATUS.ONGOING,
  TOURNAMENT_STATUS.COMPLETED,
  TOURNAMENT_STATUS.CANCELLED,
]);

// Structure can't change once matches are being played
const STRUCTURE_LOCKED_STATUSES = Object.freeze([
  TOURNAMENT_STATUS.ONGOING,
  TOURNAMENT_STATUS.COMPLETED,
  TOURNAMENT_STATUS.CANCELLED,
]);

const STRUCTURE_FIELDS = Object.freeze([
  "tournamentFormat",
  "gameFormatId",
  "ageGroupId",
  "genderCategoryId",
  "startDate",
  "entryFee",
  "minTeams",
  "maxTeams",
  "minSquadSize",
  "maxSquadSize",
  "pointsWin",
  "pointsDraw",
  "pointsLoss",
]);

// Fields only admins may change after creation
const ADMIN_ONLY_FIELDS = Object.freeze(["organizerId", "cityPlaceId", "isStreamingEnabled"]);

// Must be filled before registration can open
const REQUIRED_FOR_REGISTRATION = Object.freeze([
  "venuePlaceId",
  "tournamentFormat",
  "gameFormatId",
  "ageGroupId",
  "genderCategoryId",
  "startDate",
  "endDate",
  "registrationDeadline",
  "entryFee",
  "minTeams",
  "maxTeams",
  "minSquadSize",
  "maxSquadSize",
]);

const TOURNAMENT_RULES = Object.freeze({
  NAME_MIN: 3,
  NAME_MAX: 150,
  DESCRIPTION_MAX: 5000,
  VENUE_DETAILS_MAX: 500,
  MIN_TEAMS: 2,
  MAX_TEAMS: 128,
  MIN_SQUAD: 5,
  MAX_SQUAD: 40,
  MAX_POINTS: 10,
  MAX_ENTRY_FEE: 1000000,
  MAX_GROUNDS: 20,
  MAX_RULES: 100,
  SLUG_SUFFIX_LENGTH: 6,
  DEFAULT_POINTS: Object.freeze({ WIN: 3, DRAW: 1, LOSS: 0 }),
});

const NEAR_ME = Object.freeze({
  DEFAULT_RADIUS_KM: 25,
  MAX_RADIUS_KM: 300,
});

module.exports = {
  TOURNAMENT_STATUS,
  TOURNAMENT_FORMAT,
  STATUS_TRANSITIONS,
  PUBLIC_STATUSES,
  STRUCTURE_LOCKED_STATUSES,
  STRUCTURE_FIELDS,
  ADMIN_ONLY_FIELDS,
  REQUIRED_FOR_REGISTRATION,
  TOURNAMENT_RULES,
  NEAR_ME,
};
