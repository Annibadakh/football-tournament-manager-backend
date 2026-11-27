const { z } = require("zod");
const { emailField, fullNameField } = require("./user.schema");
const { paginationQuerySchema } = require("./common.schema");
const {
  REVIEW_DECISION,
  STAFF_ROLE,
  TEAM_RULES,
  TEAM_STATUS,
} = require("../constants/team.constants");

const teamIdParamSchema = z.object({ teamId: z.uuid("Invalid team id") });
const memberParamsSchema = teamIdParamSchema.extend({ memberId: z.uuid("Invalid player id") });

const teamNameField = z
  .string()
  .trim()
  .min(TEAM_RULES.NAME_MIN, "Team name is required")
  .max(TEAM_RULES.NAME_MAX);
const shortNameField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(TEAM_RULES.SHORT_NAME_REGEX, "Use 2–4 letters or digits, e.g. KFC");
const jerseyField = z
  .number({ error: "Jersey number is required" })
  .int()
  .min(TEAM_RULES.JERSEY_MIN, `Jersey must be ${TEAM_RULES.JERSEY_MIN}–${TEAM_RULES.JERSEY_MAX}`)
  .max(TEAM_RULES.JERSEY_MAX, `Jersey must be ${TEAM_RULES.JERSEY_MIN}–${TEAM_RULES.JERSEY_MAX}`);
const positionField = z.number({ error: "Choose a position" }).int().positive();

// A verified player picked from search, or a guest added by name + email
const personSchema = z.union([
  z.object({ userId: z.uuid("Choose a player") }),
  z.object({ fullName: fullNameField, email: emailField }),
]);

const addTeamSchema = z.object({
  name: teamNameField,
  shortName: shortNameField,
  captain: personSchema,
  captainJerseyNumber: jerseyField,
  captainPositionId: positionField,
});

const teamRequestSchema = z.object({
  name: teamNameField,
  shortName: shortNameField,
  jerseyNumber: jerseyField,
  positionId: positionField,
});

const updateTeamSchema = z
  .object({ name: teamNameField, shortName: shortNameField })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nothing to update");

const reviewTeamSchema = z.object({
  decision: z.enum(Object.values(REVIEW_DECISION)),
  reason: z.string().trim().max(TEAM_RULES.REJECTION_REASON_MAX).optional(),
});

const lockTeamSchema = z.object({ isLocked: z.boolean() });

const listTeamsQuerySchema = z.object({
  status: z.coerce.number().pipe(z.enum(TEAM_STATUS)).optional(),
});

const invitePlayerSchema = z.object({
  player: personSchema,
  positionId: positionField,
  jerseyNumber: jerseyField,
});

const updatePlayerSchema = z
  .object({ jerseyNumber: jerseyField, positionId: positionField })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nothing to update");

const staffParamsSchema = z.object({
  tournamentId: z.string().trim().min(3).max(180),
  staffId: z.uuid("Invalid staff id"),
});

const inviteStaffSchema = z.object({
  staffRole: z.enum(STAFF_ROLE, "Choose a role"),
  person: personSchema,
});

const playerSearchQuerySchema = paginationQuerySchema
  .pick({ page: true, pageSize: true, search: true })
  .extend({
    cityId: z.uuid().optional(),
    positionId: z.coerce.number().int().positive().optional(),
  });

const invitationParamSchema = z.object({ inviteId: z.uuid("Invalid invitation id") });

const invitationResponseSchema = z.object({ accept: z.boolean() });

module.exports = {
  teamIdParamSchema,
  memberParamsSchema,
  addTeamSchema,
  teamRequestSchema,
  updateTeamSchema,
  reviewTeamSchema,
  lockTeamSchema,
  listTeamsQuerySchema,
  invitePlayerSchema,
  updatePlayerSchema,
  staffParamsSchema,
  inviteStaffSchema,
  playerSearchQuerySchema,
  invitationParamSchema,
  invitationResponseSchema,
};
