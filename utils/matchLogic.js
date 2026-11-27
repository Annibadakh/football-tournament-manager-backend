// Pure match rules (no database): clock, score, result validation, standings
const {
  DECIDED_BY,
  FIXTURE_RULES,
  MATCH_EVENT_TYPE,
  MATCH_PERIOD,
  MATCH_STATUS,
} = require("../constants/match.constants");

// Minute already played when each period starts
const periodBaseMinute = (period, { halfMinutes, extraTimeHalfMinutes }) => {
  switch (period) {
    case MATCH_PERIOD.FIRST_HALF:
      return 0;
    case MATCH_PERIOD.HALF_TIME:
    case MATCH_PERIOD.SECOND_HALF:
      return halfMinutes;
    case MATCH_PERIOD.FULL_TIME:
    case MATCH_PERIOD.EXTRA_FIRST_HALF:
      return halfMinutes * 2;
    case MATCH_PERIOD.EXTRA_HALF_TIME:
    case MATCH_PERIOD.EXTRA_SECOND_HALF:
      return halfMinutes * 2 + extraTimeHalfMinutes;
    default:
      return halfMinutes * 2 + extraTimeHalfMinutes * 2;
  }
};

const PLAYING = [
  MATCH_PERIOD.FIRST_HALF,
  MATCH_PERIOD.SECOND_HALF,
  MATCH_PERIOD.EXTRA_FIRST_HALF,
  MATCH_PERIOD.EXTRA_SECOND_HALF,
];

/**
 * Football minute shown on the clock: the 1st minute starts at kick-off, so 0:30 played = 1'.
 * Stoppage time keeps counting past the half length (e.g. 22' in a 20-minute half).
 * During breaks the clock shows the minute the previous period ended.
 */
const currentMinute = (period, periodStartedAt, settings, now = new Date()) => {
  if (period === MATCH_PERIOD.NOT_STARTED) return 0;
  const base = periodBaseMinute(period, settings);
  if (!PLAYING.includes(period) || !periodStartedAt) return base;
  const elapsed = Math.max(0, now.getTime() - new Date(periodStartedAt).getTime());
  return base + Math.floor(elapsed / 60000) + 1;
};

// Goals count for the player's team; own goals count for the other side
const scoreFromEvents = (events, homeTeamId, awayTeamId) => {
  const score = { home: 0, away: 0 };
  events.forEach((event) => {
    if (event.isReverted) return;
    if (event.type === MATCH_EVENT_TYPE.GOAL) {
      if (event.teamId === homeTeamId) score.home += 1;
      else if (event.teamId === awayTeamId) score.away += 1;
    } else if (event.type === MATCH_EVENT_TYPE.OWN_GOAL) {
      if (event.teamId === homeTeamId) score.away += 1;
      else if (event.teamId === awayTeamId) score.home += 1;
    }
  });
  return score;
};

/**
 * Checks a declared result and fills in how it was decided.
 * - Different scores: the leader wins (extra time if it was played).
 * - Level, round robin: a draw (or a declared tie).
 * - Level, knockout: penalties with a chosen winner, or a tie (shared).
 * Returns { decidedBy, winnerSide } or { error }.
 */
const resolveResult = ({
  homeScore,
  awayScore,
  isKnockout,
  playedExtraTime,
  decidedBy,
  winnerSide,
}) => {
  if (homeScore !== awayScore) {
    if (decidedBy === DECIDED_BY.PENALTIES || decidedBy === DECIDED_BY.TIE)
      return { error: "The scores aren't level, so this can't be decided by penalties or a tie" };
    return {
      decidedBy: playedExtraTime ? DECIDED_BY.EXTRA_TIME : DECIDED_BY.REGULAR,
      winnerSide: homeScore > awayScore ? "home" : "away",
    };
  }
  if (decidedBy === DECIDED_BY.PENALTIES) {
    if (!isKnockout) return { error: "Penalties only decide knockout matches" };
    if (!winnerSide) return { error: "Choose who won the penalty shootout" };
    return { decidedBy, winnerSide };
  }
  if (decidedBy === DECIDED_BY.TIE) return { decidedBy, winnerSide: null };
  if (isKnockout)
    return { error: "A knockout match needs a winner: choose penalties, or declare a tie" };
  return { decidedBy: DECIDED_BY.REGULAR, winnerSide: null };
};

// ---------- standings ----------

const emptyRow = (team) => ({
  team,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
  form: [],
});

const COUNTED_STATUSES = [MATCH_STATUS.COMPLETED, MATCH_STATUS.WALKOVER, MATCH_STATUS.FORFEIT];

// Score used in tables: walkovers/forfeits count as 3–0 for the awarded team
const tableScore = (match) => {
  if (match.status === MATCH_STATUS.COMPLETED)
    return { home: match.homeScore ?? 0, away: match.awayScore ?? 0 };
  const homeWins = match.winnerTeamId === match.homeTeamId;
  return {
    home: homeWins ? FIXTURE_RULES.AWARDED_GOALS : 0,
    away: homeWins ? 0 : FIXTURE_RULES.AWARDED_GOALS,
  };
};

const outcomeFor = (match, teamId) => {
  if (match.winnerTeamId) return match.winnerTeamId === teamId ? "W" : "L";
  return "D";
};

const applyMatch = (rows, match, points) => {
  const home = rows.get(match.homeTeamId);
  const away = rows.get(match.awayTeamId);
  if (!home || !away) return;
  const score = tableScore(match);
  [
    [home, score.home, score.away, match.homeTeamId],
    [away, score.away, score.home, match.awayTeamId],
  ].forEach(([row, scored, conceded, teamId]) => {
    const outcome = outcomeFor(match, teamId);
    row.played += 1;
    row.goalsFor += scored;
    row.goalsAgainst += conceded;
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    if (outcome === "W") {
      row.won += 1;
      row.points += points.win;
    } else if (outcome === "L") {
      row.lost += 1;
      row.points += points.loss;
    } else {
      row.drawn += 1;
      row.points += points.draw;
    }
    row.form.push(outcome);
  });
};

// Points earned only in matches between the tied teams
const headToHeadPoints = (teamIds, matches, points) => {
  const ids = new Set(teamIds);
  const mini = new Map(teamIds.map((id) => [id, emptyRow({ id })]));
  matches
    .filter((match) => ids.has(match.homeTeamId) && ids.has(match.awayTeamId))
    .forEach((match) => applyMatch(mini, match, points));
  return new Map([...mini.entries()].map(([id, row]) => [id, row.points]));
};

/**
 * League table for `teams` ({ id, name, … }) from finished matches.
 * Order: points → goal difference → goals for → head-to-head points → team name.
 */
const computeStandings = (teams, matches, points) => {
  const counted = matches
    .filter((match) => COUNTED_STATUSES.includes(match.status))
    .sort((a, b) => new Date(a.endedAt ?? 0) - new Date(b.endedAt ?? 0));
  const rows = new Map(teams.map((team) => [team.id, emptyRow(team)]));
  counted.forEach((match) => applyMatch(rows, match, points));

  const primary = (a, b) =>
    b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor;
  const sorted = [...rows.values()].sort(primary);

  // Break remaining ties by head-to-head inside each tied block
  const result = [];
  for (let i = 0; i < sorted.length;) {
    let j = i + 1;
    while (j < sorted.length && primary(sorted[i], sorted[j]) === 0) j += 1;
    const block = sorted.slice(i, j);
    if (block.length > 1) {
      const h2h = headToHeadPoints(
        block.map((row) => row.team.id),
        counted,
        points,
      );
      block.sort(
        (a, b) =>
          h2h.get(b.team.id) - h2h.get(a.team.id) ||
          String(a.team.name).localeCompare(String(b.team.name)),
      );
    }
    result.push(...block);
    i = j;
  }
  return result.map((row, index) => ({ ...row, position: index + 1, form: row.form.slice(-5) }));
};

module.exports = {
  periodBaseMinute,
  currentMinute,
  scoreFromEvents,
  resolveResult,
  tableScore,
  computeStandings,
};
