import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { ageFromDateOfBirth, individualAwards, teamPlacings } = require("../utils/awards");
const { AWARD_TYPE } = require("../constants/award.constants");
const { MATCH_STATUS } = require("../constants/match.constants");
const { TOURNAMENT_FORMAT } = require("../constants/tournament.constants");

const done = (home, away, winner, extra = {}) => ({
  homeTeamId: home,
  awayTeamId: away,
  winnerTeamId: winner,
  status: MATCH_STATUS.COMPLETED,
  roundNumber: 2,
  isThirdPlace: false,
  ...extra,
});
const summary = (awards) => awards.map((a) => [a.type, a.teamId ?? a.userId, a.title]);

describe("teamPlacings", () => {
  it("knockout: final winner, loser and third-place winner", () => {
    const awards = teamPlacings({
      format: TOURNAMENT_FORMAT.KNOCKOUT,
      knockoutMatches: [
        done(1, 2, 1, { roundNumber: 1 }),
        done(3, 4, 4, { roundNumber: 1 }),
        done(2, 3, 3, { isThirdPlace: true }),
        done(1, 4, 4),
      ],
    });
    expect(summary(awards)).toEqual([
      [AWARD_TYPE.CHAMPION, 4, "Champion"],
      [AWARD_TYPE.RUNNER_UP, 1, "Runner-up"],
      [AWARD_TYPE.THIRD_PLACE, 3, "Third place"],
    ]);
  });

  it("a declared tie in the final shares the title", () => {
    const awards = teamPlacings({
      format: TOURNAMENT_FORMAT.GROUP_KNOCKOUT,
      knockoutMatches: [done(1, 2, null)],
    });
    expect(awards.map((a) => [a.type, a.teamId])).toEqual([
      [AWARD_TYPE.CHAMPION, 1],
      [AWARD_TYPE.CHAMPION, 2],
    ]);
  });

  it("no champion until the final is played", () => {
    expect(
      teamPlacings({
        format: TOURNAMENT_FORMAT.KNOCKOUT,
        knockoutMatches: [{ ...done(1, 2, null), status: MATCH_STATUS.SCHEDULED }],
      }),
    ).toEqual([]);
  });

  it("league: top three of the table", () => {
    const rows = [1, 2, 3, 4].map((id, i) => ({ team: { id }, position: i + 1, played: 3 }));
    expect(
      summary(teamPlacings({ format: TOURNAMENT_FORMAT.LEAGUE, tables: [{ rows }] })).map(
        (x) => x[1],
      ),
    ).toEqual([1, 2, 3]);
  });

  it("groups + round robin: each group winner", () => {
    const tables = [
      { groupName: "A", rows: [{ team: { id: 5 }, played: 2 }] },
      { groupName: "B", rows: [{ team: { id: 7 }, played: 2 }] },
    ];
    expect(summary(teamPlacings({ format: TOURNAMENT_FORMAT.GROUP_LEAGUE, tables }))).toEqual([
      [AWARD_TYPE.GROUP_WINNER, 5, "Group A winner"],
      [AWARD_TYPE.GROUP_WINNER, 7, "Group B winner"],
    ]);
  });
});

describe("individualAwards", () => {
  it("gives the Golden Boot to everyone tied on top, with the count", () => {
    const awards = individualAwards({
      goals: [
        { userId: 1, teamId: 9, count: 4 },
        { userId: 2, teamId: 8, count: 4 },
        { userId: 3, teamId: 8, count: 2 },
      ],
      assists: [{ userId: 3, teamId: 8, count: 2 }],
      potm: [],
    });
    expect(awards.map((a) => [a.type, a.userId, a.value])).toEqual([
      [AWARD_TYPE.GOLDEN_BOOT, 1, 4],
      [AWARD_TYPE.GOLDEN_BOOT, 2, 4],
      [AWARD_TYPE.MOST_ASSISTS, 3, 2],
    ]);
  });
});

describe("ageFromDateOfBirth", () => {
  const today = new Date(2026, 10, 27); // 27 Nov 2026
  it("counts whole years and the birthday itself", () => {
    expect(ageFromDateOfBirth("2000-11-27", today)).toBe(26);
    expect(ageFromDateOfBirth("2000-11-28", today)).toBe(25);
    expect(ageFromDateOfBirth("2000-01-01", today)).toBe(26);
    expect(ageFromDateOfBirth(null, today)).toBeNull();
  });
});
