import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ml = require("../utils/matchLogic");
const {
  DECIDED_BY,
  MATCH_EVENT_TYPE,
  MATCH_PERIOD,
  MATCH_STATUS,
} = require("../constants/match.constants");

const settings = { halfMinutes: 20, extraTimeHalfMinutes: 5 };
const POINTS = { win: 3, draw: 1, loss: 0 };

describe("currentMinute", () => {
  const start = new Date("2027-04-10T10:00:00Z");
  const at = (minutes) => new Date(start.getTime() + minutes * 60000);

  it("counts from 1' at kick-off and keeps counting in stoppage time", () => {
    expect(ml.currentMinute(MATCH_PERIOD.FIRST_HALF, start, settings, at(0.5))).toBe(1);
    expect(ml.currentMinute(MATCH_PERIOD.FIRST_HALF, start, settings, at(19.2))).toBe(20);
    expect(ml.currentMinute(MATCH_PERIOD.FIRST_HALF, start, settings, at(21.5))).toBe(22);
  });

  it("adds the earlier periods", () => {
    expect(ml.currentMinute(MATCH_PERIOD.SECOND_HALF, start, settings, at(0.1))).toBe(21);
    expect(ml.currentMinute(MATCH_PERIOD.EXTRA_FIRST_HALF, start, settings, at(2))).toBe(43);
    expect(ml.currentMinute(MATCH_PERIOD.EXTRA_SECOND_HALF, start, settings, at(0))).toBe(46);
  });

  it("freezes during breaks", () => {
    expect(ml.currentMinute(MATCH_PERIOD.HALF_TIME, start, settings, at(9))).toBe(20);
    expect(ml.currentMinute(MATCH_PERIOD.FULL_TIME, start, settings, at(9))).toBe(40);
    expect(ml.currentMinute(MATCH_PERIOD.NOT_STARTED, null, settings)).toBe(0);
  });
});

describe("scoreFromEvents", () => {
  it("credits own goals to the other side and skips reverted events", () => {
    const events = [
      { type: MATCH_EVENT_TYPE.GOAL, teamId: 1 },
      { type: MATCH_EVENT_TYPE.GOAL, teamId: 2 },
      { type: MATCH_EVENT_TYPE.OWN_GOAL, teamId: 2 },
      { type: MATCH_EVENT_TYPE.GOAL, teamId: 1, isReverted: true },
      { type: MATCH_EVENT_TYPE.YELLOW_CARD, teamId: 1 },
    ];
    expect(ml.scoreFromEvents(events, 1, 2)).toEqual({ home: 2, away: 1 });
  });
});

describe("resolveResult", () => {
  it("gives the leader the win, by extra time if it was played", () => {
    expect(ml.resolveResult({ homeScore: 2, awayScore: 1 })).toEqual({
      decidedBy: DECIDED_BY.REGULAR,
      winnerSide: "home",
    });
    expect(
      ml.resolveResult({ homeScore: 1, awayScore: 2, isKnockout: true, playedExtraTime: true }),
    ).toEqual({ decidedBy: DECIDED_BY.EXTRA_TIME, winnerSide: "away" });
  });

  it("treats a level round-robin match as a draw", () => {
    expect(ml.resolveResult({ homeScore: 1, awayScore: 1 })).toEqual({
      decidedBy: DECIDED_BY.REGULAR,
      winnerSide: null,
    });
  });

  it("needs penalties (with a winner) or a tie in a level knockout", () => {
    expect(ml.resolveResult({ homeScore: 0, awayScore: 0, isKnockout: true }).error).toBeTruthy();
    expect(
      ml.resolveResult({
        homeScore: 0,
        awayScore: 0,
        isKnockout: true,
        decidedBy: DECIDED_BY.PENALTIES,
      }).error,
    ).toMatch(/shootout/);
    expect(
      ml.resolveResult({
        homeScore: 0,
        awayScore: 0,
        isKnockout: true,
        decidedBy: DECIDED_BY.PENALTIES,
        winnerSide: "away",
      }),
    ).toEqual({ decidedBy: DECIDED_BY.PENALTIES, winnerSide: "away" });
    expect(
      ml.resolveResult({ homeScore: 1, awayScore: 1, isKnockout: true, decidedBy: DECIDED_BY.TIE }),
    ).toEqual({ decidedBy: DECIDED_BY.TIE, winnerSide: null });
  });

  it("rejects penalties when the score isn't level", () => {
    expect(
      ml.resolveResult({ homeScore: 2, awayScore: 1, decidedBy: DECIDED_BY.PENALTIES }).error,
    ).toBeTruthy();
  });
});

describe("computeStandings", () => {
  const teams = ["A", "B", "C", "D"].map((name, i) => ({ id: i + 1, name }));
  let n = 0;
  const played = (home, away, hs, as, extra = {}) => {
    n += 1;
    return {
      homeTeamId: home,
      awayTeamId: away,
      homeScore: hs,
      awayScore: as,
      status: MATCH_STATUS.COMPLETED,
      winnerTeamId: hs > as ? home : as > hs ? away : null,
      endedAt: new Date(2027, 3, 10, 10, n),
      ...extra,
    };
  };

  it("adds up points, goals and form", () => {
    const table = ml.computeStandings(
      teams,
      [played(1, 2, 2, 0), played(3, 4, 1, 1), played(1, 3, 0, 1)],
      POINTS,
    );
    const row = (id) => table.find((r) => r.team.id === id);
    expect(row(1)).toMatchObject({
      played: 2,
      won: 1,
      lost: 1,
      goalsFor: 2,
      goalsAgainst: 1,
      points: 3,
      form: ["W", "L"],
    });
    expect(row(3)).toMatchObject({ points: 4, position: 1 });
  });

  it("orders by points, goal difference, then goals for", () => {
    const table = ml.computeStandings(
      teams,
      [played(1, 4, 3, 0), played(2, 4, 1, 0), played(3, 4, 4, 1)],
      POINTS,
    );
    expect(table.map((r) => r.team.name)).toEqual(["C", "A", "B", "D"]);
  });

  it("uses head-to-head when points, goal difference and goals are equal", () => {
    // A and B both: W 1-0 v D, and B beat A 1-0, A beat C 1-0 → equal totals, B won head-to-head
    const table = ml.computeStandings(
      teams,
      [
        played(1, 4, 1, 0),
        played(2, 4, 1, 0),
        played(2, 1, 1, 0),
        played(1, 3, 1, 0),
        played(3, 2, 1, 0),
      ],
      POINTS,
    );
    const a = table.find((r) => r.team.name === "A");
    const b = table.find((r) => r.team.name === "B");
    expect([a.points, a.goalDifference, a.goalsFor]).toEqual([
      b.points,
      b.goalDifference,
      b.goalsFor,
    ]);
    expect(b.position).toBeLessThan(a.position);
  });

  it("counts a walkover as a 3-0 win without needing a score", () => {
    const table = ml.computeStandings(
      teams,
      [{ homeTeamId: 1, awayTeamId: 2, status: MATCH_STATUS.WALKOVER, winnerTeamId: 2 }],
      POINTS,
    );
    expect(table[0]).toMatchObject({
      team: { name: "B" },
      points: 3,
      goalsFor: 3,
      goalDifference: 3,
    });
  });

  it("ignores scheduled, live and cancelled matches", () => {
    const table = ml.computeStandings(
      teams,
      [
        played(1, 2, 2, 0, { status: MATCH_STATUS.LIVE }),
        played(1, 2, 2, 0, { status: MATCH_STATUS.CANCELLED }),
      ],
      POINTS,
    );
    expect(table.every((r) => r.played === 0)).toBe(true);
    expect(table.map((r) => r.team.name)).toEqual(["A", "B", "C", "D"]);
  });
});
