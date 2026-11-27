import { createRequire } from "module";

const require = createRequire(import.meta.url);
const fx = require("../utils/fixtures");

// Deterministic "random" for draws
const seeded =
  (seed = 1) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

const pairKey = ([a, b]) => [a, b].sort().join("-");

describe("roundRobin", () => {
  it.each([2, 3, 4, 5, 6, 7, 8])("plays every pair exactly once for %i teams", (n) => {
    const teams = Array.from({ length: n }, (_, i) => `T${i + 1}`);
    const rounds = fx.roundRobin(teams);
    const pairs = rounds.flat();
    expect(pairs).toHaveLength((n * (n - 1)) / 2);
    expect(new Set(pairs.map(pairKey)).size).toBe(pairs.length);
    expect(rounds).toHaveLength(n % 2 === 0 ? n - 1 : n);
    // Nobody plays twice in a round
    rounds.forEach((round) => {
      const inRound = round.flat();
      expect(new Set(inRound).size).toBe(inRound.length);
    });
  });

  it("keeps home and away balanced within one game", () => {
    const teams = ["A", "B", "C", "D", "E", "F"];
    const homeCounts = Object.fromEntries(teams.map((t) => [t, 0]));
    fx.roundRobin(teams)
      .flat()
      .forEach(([home]) => (homeCounts[home] += 1));
    Object.values(homeCounts).forEach((count) => expect(count).toBeGreaterThanOrEqual(2));
    Object.values(homeCounts).forEach((count) => expect(count).toBeLessThanOrEqual(3));
  });

  it("mirrors home and away in the second leg", () => {
    const rounds = fx.roundRobin(["A", "B", "C", "D"], { legs: 2 });
    expect(rounds).toHaveLength(6);
    const first = rounds.slice(0, 3).flat();
    const second = rounds.slice(3).flat();
    expect(second).toEqual(first.map(([h, a]) => [a, h]));
  });
});

describe("drawGroups", () => {
  it("makes balanced groups containing every team once", () => {
    const teams = Array.from({ length: 10 }, (_, i) => i + 1);
    const groups = fx.drawGroups(teams, 3, seeded(7));
    expect(groups.map((g) => g.length).sort()).toEqual([3, 3, 4]);
    expect(groups.flat().sort((a, b) => a - b)).toEqual(teams);
  });
});

describe("buildBracket", () => {
  it("uses standard seeding order", () => {
    expect(fx.bracketOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("gives byes to top seeds when not a power of two", () => {
    const rounds = fx.buildBracket(["S1", "S2", "S3", "S4", "S5", "S6"]);
    expect(rounds.map((round) => round.length)).toEqual([4, 2, 1]);
    const byes = rounds[0].filter((m) => m.home === null || m.away === null);
    expect(byes).toHaveLength(2);
    expect(byes.map((m) => m.home ?? m.away).sort()).toEqual(["S1", "S2"]);
    // Seeds 1 and 2 are in opposite halves
    const half = (seed) => rounds[0].findIndex((m) => m.home === seed || m.away === seed) < 2;
    expect(half("S1")).not.toBe(half("S2"));
  });

  it("builds a full 16 team bracket", () => {
    const rounds = fx.buildBracket(Array.from({ length: 16 }, (_, i) => i));
    expect(rounds.map((round) => round.length)).toEqual([8, 4, 2, 1]);
    expect(rounds[0].every((m) => m.home !== null && m.away !== null)).toBe(true);
  });
});

describe("crossoverEntries", () => {
  it("pairs A1 v B2 and B1 v A2 in opposite halves", () => {
    expect(fx.crossoverEntries(4, 2).pairs).toEqual([
      ["A1", "B2"],
      ["C1", "D2"],
      ["B1", "A2"],
      ["D1", "C2"],
    ]);
  });

  it("seeds winners then runners-up otherwise", () => {
    expect(fx.crossoverEntries(3, 2).entries).toEqual(["A1", "B1", "C1", "A2", "B2", "C2"]);
    expect(fx.crossoverEntries(4, 1).entries).toEqual(["A1", "B1", "C1", "D1"]);
  });

  it("names seeds for placeholders", () => {
    expect(fx.seedPlaceholder("A1")).toBe("Group A winner");
    expect(fx.seedPlaceholder("C2")).toBe("Group C runner-up");
  });
});

describe("findClashes", () => {
  const at = (time) => fx.zonedDateTime("2027-03-10", time);
  const duration = 55;

  it("blocks the same ground or team in overlapping time", () => {
    const others = [
      { id: 2, groundId: 1, homeTeamId: 30, awayTeamId: 40, scheduledAt: at("10:30") },
      { id: 3, groundId: 2, homeTeamId: 10, awayTeamId: 50, scheduledAt: at("10:15") },
    ];
    const result = fx.findClashes(
      { id: 1, groundId: 1, homeTeamId: 10, awayTeamId: 20, scheduledAt: at("10:00") },
      others,
      { durationMinutes: duration },
    );
    expect(result.errors.map((e) => e.type).sort()).toEqual(["ground", "team"]);
  });

  it("warns when a team plays twice on the same day", () => {
    const result = fx.findClashes(
      { id: 1, groundId: 1, homeTeamId: 10, awayTeamId: 20, scheduledAt: at("09:00") },
      [{ id: 2, groundId: 1, homeTeamId: 10, awayTeamId: 30, scheduledAt: at("16:00") }],
      { durationMinutes: duration },
    );
    expect(result.errors).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it("ignores unscheduled matches", () => {
    expect(
      fx.findClashes({ id: 1, homeTeamId: 1, awayTeamId: 2, scheduledAt: null }, [], {
        durationMinutes: duration,
      }).errors,
    ).toEqual([]);
  });
});

describe("autoSchedule", () => {
  const rounds = fx.roundRobin(["A", "B", "C", "D"]);
  const matches = rounds.flatMap((pairs, r) =>
    pairs.map(([home, away], i) => ({
      id: `${r}-${i}`,
      roundKey: r,
      homeTeamId: home,
      awayTeamId: away,
    })),
  );
  const options = {
    startDate: "2027-03-10",
    firstKickoff: "09:00",
    lastKickoff: "11:00",
    slotMinutes: 60,
    groundIds: [1, 2],
    durationMinutes: 55,
  };

  it("schedules every match without team or ground clashes and keeps rounds in order", () => {
    const { assignments, unscheduledIds } = fx.autoSchedule(matches, options);
    expect(unscheduledIds).toEqual([]);
    expect(assignments).toHaveLength(6);
    const byId = Object.fromEntries(assignments.map((a) => [a.id, a]));
    matches.forEach((match) => {
      const mine = byId[match.id];
      const clashes = fx.findClashes(
        { ...match, ...mine },
        matches.map((m) => ({ ...m, ...byId[m.id] })),
        { durationMinutes: 55 },
      );
      expect(clashes.errors).toEqual([]);
    });
    const lastOfRound = (r) =>
      Math.max(...matches.filter((m) => m.roundKey === r).map((m) => byId[m.id].scheduledAt));
    const firstOfRound = (r) =>
      Math.min(...matches.filter((m) => m.roundKey === r).map((m) => byId[m.id].scheduledAt));
    expect(firstOfRound(1)).toBeGreaterThan(lastOfRound(0));
    expect(firstOfRound(2)).toBeGreaterThan(lastOfRound(1));
  });

  it("rolls over to the next day and respects busy grounds", () => {
    const busy = [{ id: "x", groundId: 2, scheduledAt: fx.zonedDateTime("2027-03-10", "09:00") }];
    const { assignments } = fx.autoSchedule(matches, { ...options, groundIds: [1, 2], busy });
    expect(
      assignments.some(
        (a) => a.groundId === 2 && a.scheduledAt.getTime() === busy[0].scheduledAt.getTime(),
      ),
    ).toBe(false);
    expect(assignments).toHaveLength(6);
  });
});
