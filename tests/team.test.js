import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  addTeamSchema,
  invitePlayerSchema,
  teamRequestSchema,
} = require("../validations/team.schema");
const {
  LOCKING_MEMBER_STATUSES,
  MEMBER_STATUS,
  activeLockFor,
} = require("../constants/team.constants");

describe("team schemas", () => {
  it("uppercases and validates short names", () => {
    const parsed = teamRequestSchema.safeParse({
      name: "Kopargaon FC",
      shortName: " kfc ",
      jerseyNumber: 9,
      positionId: 4,
    });
    expect(parsed.data.shortName).toBe("KFC");
    expect(
      teamRequestSchema.safeParse({
        name: "Kopargaon FC",
        shortName: "K",
        jerseyNumber: 9,
        positionId: 4,
      }).success,
    ).toBe(false);
    expect(
      teamRequestSchema.safeParse({
        name: "Kopargaon FC",
        shortName: "KOPAR",
        jerseyNumber: 9,
        positionId: 4,
      }).success,
    ).toBe(false);
  });

  it("requires a jersey number between 1 and 99", () => {
    const base = { name: "Kopargaon FC", shortName: "KFC", positionId: 4 };
    expect(teamRequestSchema.safeParse({ ...base, jerseyNumber: 0 }).success).toBe(false);
    expect(teamRequestSchema.safeParse({ ...base, jerseyNumber: 100 }).success).toBe(false);
    expect(teamRequestSchema.safeParse(base).success).toBe(false);
  });

  it("accepts a verified player id or a guest name + email", () => {
    const base = { positionId: 3, jerseyNumber: 7 };
    expect(
      invitePlayerSchema.safeParse({
        ...base,
        player: { userId: "0b4c3a52-8f53-4b4e-9e1a-1f5d2f6f9a10" },
      }).success,
    ).toBe(true);
    expect(
      invitePlayerSchema.safeParse({
        ...base,
        player: { fullName: "Guest Player", email: "Guest@Example.com" },
      }).data.player.email,
    ).toBe("guest@example.com");
    expect(
      invitePlayerSchema.safeParse({ ...base, player: { fullName: "No Email" } }).success,
    ).toBe(false);
  });

  it("needs captain details when the organizer adds a team", () => {
    expect(
      addTeamSchema.safeParse({ name: "Nashik City", shortName: "NC", captain: { userId: "x" } })
        .success,
    ).toBe(false);
  });
});

describe("one-team-per-tournament lock", () => {
  it("only invited and active members hold the unique slot", () => {
    expect(activeLockFor(MEMBER_STATUS.INVITED, LOCKING_MEMBER_STATUSES)).toBe(1);
    expect(activeLockFor(MEMBER_STATUS.ACTIVE, LOCKING_MEMBER_STATUSES)).toBe(1);
    expect(activeLockFor(MEMBER_STATUS.REMOVED, LOCKING_MEMBER_STATUSES)).toBeNull();
    expect(activeLockFor(MEMBER_STATUS.DECLINED, LOCKING_MEMBER_STATUSES)).toBeNull();
  });
});
