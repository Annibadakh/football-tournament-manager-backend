// Pure award rules (no database)
const { AWARD_TITLE, AWARD_TYPE } = require("../constants/award.constants");
const { MATCH_STATUS } = require("../constants/match.constants");
const { TOURNAMENT_FORMAT } = require("../constants/tournament.constants");

const FINISHED = [MATCH_STATUS.COMPLETED, MATCH_STATUS.WALKOVER, MATCH_STATUS.FORFEIT];

const teamAward = (type, teamId, title = AWARD_TITLE[type]) => ({
  type,
  title,
  teamId,
  userId: null,
  value: null,
});

const loserOf = (match) =>
  match.winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

// Finished final → champion + runner-up (a declared tie shares the title)
const fromFinal = (final) => {
  if (!final || !FINISHED.includes(final.status)) return [];
  if (!final.winnerTeamId)
    return [final.homeTeamId, final.awayTeamId]
      .filter(Boolean)
      .map((id) => teamAward(AWARD_TYPE.CHAMPION, id));
  return [
    teamAward(AWARD_TYPE.CHAMPION, final.winnerTeamId),
    teamAward(AWARD_TYPE.RUNNER_UP, loserOf(final)),
  ];
};

/**
 * Team placings by format:
 * - knockout formats: final winner/loser, third-place match winner
 * - league: table positions 1–3
 * - groups + round robin: every group winner
 * `tables` = [{ groupName|null, rows: [{ team: { id }, position }] }]
 */
const teamPlacings = ({ format, knockoutMatches = [], tables = [] }) => {
  if ([TOURNAMENT_FORMAT.KNOCKOUT, TOURNAMENT_FORMAT.GROUP_KNOCKOUT].includes(format)) {
    const third = knockoutMatches.find((match) => match.isThirdPlace);
    const finalRound = Math.max(
      0,
      ...knockoutMatches.filter((m) => !m.isThirdPlace).map((m) => m.roundNumber),
    );
    const final = knockoutMatches.find(
      (match) => !match.isThirdPlace && match.roundNumber === finalRound,
    );
    const awards = fromFinal(final);
    if (third && FINISHED.includes(third.status) && third.winnerTeamId)
      awards.push(teamAward(AWARD_TYPE.THIRD_PLACE, third.winnerTeamId));
    return awards;
  }
  if (format === TOURNAMENT_FORMAT.LEAGUE) {
    const rows = tables[0]?.rows ?? [];
    if (!rows.some((row) => row.played > 0)) return [];
    return [AWARD_TYPE.CHAMPION, AWARD_TYPE.RUNNER_UP, AWARD_TYPE.THIRD_PLACE]
      .map((type, index) => rows[index] && teamAward(type, rows[index].team.id))
      .filter(Boolean);
  }
  if (format === TOURNAMENT_FORMAT.GROUP_LEAGUE) {
    return tables
      .filter((table) => table.rows.some((row) => row.played > 0))
      .map((table) =>
        teamAward(
          AWARD_TYPE.GROUP_WINNER,
          table.rows[0].team.id,
          `Group ${table.groupName} winner`,
        ),
      );
  }
  return [];
};

// Everyone tied on the top count gets the award; nothing when the top count is 0
const topWithTies = (counts, type) => {
  const best = Math.max(0, ...counts.map((entry) => entry.count));
  if (!best) return [];
  return counts
    .filter((entry) => entry.count === best)
    .map((entry) => ({
      type,
      title: AWARD_TITLE[type],
      teamId: entry.teamId,
      userId: entry.userId,
      value: best,
    }));
};

// Individual awards from per-player counts: [{ userId, teamId, count }]
const individualAwards = ({ goals = [], assists = [], potm = [] }) => [
  ...topWithTies(goals, AWARD_TYPE.GOLDEN_BOOT),
  ...topWithTies(assists, AWARD_TYPE.MOST_ASSISTS),
  ...topWithTies(potm, AWARD_TYPE.MOST_POTM),
];

// Whole years from YYYY-MM-DD on `today`
const ageFromDateOfBirth = (dateOfBirth, today = new Date()) => {
  if (!dateOfBirth) return null;
  const [year, month, day] = String(dateOfBirth).slice(0, 10).split("-").map(Number);
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
};

module.exports = { teamPlacings, individualAwards, topWithTies, ageFromDateOfBirth };
