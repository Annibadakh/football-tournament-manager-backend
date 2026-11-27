// Stored as TINYINT; labels live in the frontend
const MATCH_STAGE = Object.freeze({
  LEAGUE: 1,
  GROUP: 2,
  KNOCKOUT: 3,
});

const MATCH_STATUS = Object.freeze({
  SCHEDULED: 1,
  LIVE: 2,
  COMPLETED: 3,
  CANCELLED: 4,
  WALKOVER: 5,
  FORFEIT: 6,
});

// Statuses whose result counts in standings and bracket advancement
const FINISHED_MATCH_STATUSES = Object.freeze([
  MATCH_STATUS.COMPLETED,
  MATCH_STATUS.WALKOVER,
  MATCH_STATUS.FORFEIT,
]);

// Clock periods (5B); a match starts NOT_STARTED and ends FINISHED
const MATCH_PERIOD = Object.freeze({
  NOT_STARTED: 0,
  FIRST_HALF: 1,
  HALF_TIME: 2,
  SECOND_HALF: 3,
  FULL_TIME: 4,
  EXTRA_FIRST_HALF: 5,
  EXTRA_HALF_TIME: 6,
  EXTRA_SECOND_HALF: 7,
  FINISHED: 8,
});

const DECIDED_BY = Object.freeze({
  REGULAR: 1,
  EXTRA_TIME: 2,
  PENALTIES: 3,
  TIE: 4,
});

const MATCH_SLOT = Object.freeze({
  HOME: 1,
  AWAY: 2,
});

const FIXTURE_RULES = Object.freeze({
  MAX_GROUPS: 16,
  MAX_LEGS: 2,
  // Half-time + changeover added to two halves when checking overlaps
  BREAK_MINUTES: 15,
  // Walkover/forfeit score used for goal difference in standings
  AWARDED_GOALS: 3,
  ROUND_NAME_MAX: 40,
  PLACEHOLDER_MAX: 60,
  MIN_SLOT_MINUTES: 10,
  MAX_SLOT_MINUTES: 300,
  MAX_SCHEDULE_DAYS: 60,
});

// Default half lengths by players per side (organizer can change them)
const defaultHalfMinutes = (playersPerSide) => {
  if (!playersPerSide || playersPerSide <= 7) return 20;
  if (playersPerSide <= 9) return 30;
  return 45;
};

const defaultExtraTimeHalfMinutes = (playersPerSide) => {
  if (!playersPerSide || playersPerSide <= 7) return 5;
  if (playersPerSide <= 9) return 10;
  return 15;
};

const DEFAULT_YELLOW_CARD_NOTICE_THRESHOLD = 2;

// Knockout round names by number of teams left in the round
const knockoutRoundName = (teamsInRound) => {
  if (teamsInRound === 2) return "Final";
  if (teamsInRound === 4) return "Semi-final";
  if (teamsInRound === 8) return "Quarter-final";
  return `Round of ${teamsInRound}`;
};

module.exports = {
  MATCH_STAGE,
  MATCH_STATUS,
  FINISHED_MATCH_STATUSES,
  MATCH_PERIOD,
  DECIDED_BY,
  MATCH_SLOT,
  FIXTURE_RULES,
  DEFAULT_YELLOW_CARD_NOTICE_THRESHOLD,
  defaultHalfMinutes,
  defaultExtraTimeHalfMinutes,
  knockoutRoundName,
};
