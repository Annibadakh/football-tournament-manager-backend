const { z } = require("zod");
const {
  DECIDED_BY,
  FIXTURE_RULES,
  MATCH_EVENT_TYPE,
  MATCH_PERIOD,
  MATCH_STAGE,
  MATCH_STATUS,
} = require("../constants/match.constants");

const matchIdParamSchema = z.object({ matchId: z.uuid("Invalid match id") });

const dateField = z.iso.date("Use a date like 2027-03-10");
const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 09:30");
const groupNameField = z.string().trim().min(1).max(20);

const scheduleSchema = z.object({
  startDate: dateField,
  firstKickoff: timeField,
  lastKickoff: timeField,
  slotMinutes: z
    .number({ error: "Minutes per slot is required" })
    .int()
    .min(FIXTURE_RULES.MIN_SLOT_MINUTES)
    .max(FIXTURE_RULES.MAX_SLOT_MINUTES),
  groundIds: z.array(z.uuid()).max(50).optional(),
  // Also move matches that already have a time
  reschedule: z.boolean().optional(),
});

const drawGroupsSchema = z.object({
  groupsCount: z.number().int().min(1).max(FIXTURE_RULES.MAX_GROUPS),
  qualifiersPerGroup: z.number().int().min(1).max(8).optional(),
});

const setGroupsSchema = z.object({
  qualifiersPerGroup: z.number().int().min(1).max(8).optional(),
  groups: z
    .array(z.object({ name: groupNameField, teamIds: z.array(z.uuid()).max(64) }))
    .min(1)
    .max(FIXTURE_RULES.MAX_GROUPS)
    .refine(
      (groups) => new Set(groups.map((group) => group.name.toUpperCase())).size === groups.length,
      "Group names must be unique",
    ),
});

const generateFixturesSchema = z.object({
  legs: z.number().int().min(1).max(FIXTURE_RULES.MAX_LEGS).default(1),
  thirdPlace: z.boolean().default(false),
  replace: z.boolean().default(false),
  schedule: scheduleSchema.optional(),
});

// Kick-off as an ISO date-time with offset (stored in UTC); null clears it
const scheduledAtField = z.iso.datetime({ offset: true }).nullable();

const addMatchSchema = z.object({
  homeTeamId: z.uuid("Choose the home team"),
  awayTeamId: z.uuid("Choose the away team"),
  stage: z.enum(MATCH_STAGE).optional(),
  groupId: z.uuid().optional(),
  roundNumber: z.number().int().min(1).max(60).optional(),
  roundName: z.string().trim().max(FIXTURE_RULES.ROUND_NAME_MAX).optional(),
  groundId: z.uuid().nullable().optional(),
  scheduledAt: scheduledAtField.optional(),
});

const updateMatchSchema = z
  .object({
    homeTeamId: z.uuid().optional(),
    awayTeamId: z.uuid().optional(),
    groundId: z.uuid().nullable().optional(),
    scheduledAt: scheduledAtField.optional(),
    roundName: z.string().trim().max(FIXTURE_RULES.ROUND_NAME_MAX).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Nothing to update");

const listMatchesQuerySchema = z.object({
  stage: z.coerce.number().pipe(z.enum(MATCH_STAGE)).optional(),
  status: z.coerce.number().pipe(z.enum(MATCH_STATUS)).optional(),
  roundNumber: z.coerce.number().int().min(1).optional(),
  groupId: z.uuid().optional(),
  teamId: z.uuid().optional(),
  date: dateField.optional(),
});

const periodSchema = z.object({ period: z.enum(MATCH_PERIOD, { error: "Invalid period" }) });

// Period markers are created by the clock, not by hand
const SCORER_EVENT_TYPES = [
  MATCH_EVENT_TYPE.GOAL,
  MATCH_EVENT_TYPE.OWN_GOAL,
  MATCH_EVENT_TYPE.YELLOW_CARD,
  MATCH_EVENT_TYPE.RED_CARD,
];

const addEventSchema = z.object({
  type: z
    .number()
    .int()
    .refine((type) => SCORER_EVENT_TYPES.includes(type), "Choose goal, own goal or a card"),
  teamId: z.uuid("Choose a team"),
  playerId: z.uuid("Choose a player"),
  assistId: z.uuid().optional(),
  minute: z.number().int().min(0).max(200).optional(),
});

const declareResultSchema = z.object({
  decidedBy: z.enum(DECIDED_BY).optional(),
  winnerTeamId: z.uuid().optional(),
  potmPlayerId: z.uuid().optional(),
});

const awardMatchSchema = z.object({
  type: z.enum(["walkover", "forfeit"], { error: "Choose walkover or forfeit" }),
  winnerTeamId: z.uuid("Choose the team awarded the match"),
});

const liveQuerySchema = z.object({ since: z.coerce.number().int().min(0).optional() });

const noticeIdParamSchema = z.object({ noticeId: z.uuid("Invalid notice id") });

const noticesQuerySchema = z.object({
  all: z
    .enum(["0", "1"])
    .optional()
    .transform((value) => value === "1"),
});

module.exports = {
  periodSchema,
  addEventSchema,
  declareResultSchema,
  awardMatchSchema,
  liveQuerySchema,
  noticeIdParamSchema,
  noticesQuerySchema,
  matchIdParamSchema,
  scheduleSchema,
  drawGroupsSchema,
  setGroupsSchema,
  generateFixturesSchema,
  addMatchSchema,
  updateMatchSchema,
  listMatchesQuerySchema,
};
