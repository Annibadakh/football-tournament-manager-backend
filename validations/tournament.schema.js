const { z } = require("zod");
const { paginationQuerySchema } = require("./common.schema");
const { phoneField } = require("./user.schema");
const { RULE_LIMITS } = require("../constants/rule.constants");
const {
  NEAR_ME,
  TOURNAMENT_FORMAT,
  TOURNAMENT_RULES,
  TOURNAMENT_STATUS,
} = require("../constants/tournament.constants");

// Accepts the public uuid or the readable slug in URLs
const tournamentIdParamSchema = z.object({ tournamentId: z.string().trim().min(3).max(180) });

const nameField = z
  .string()
  .trim()
  .min(TOURNAMENT_RULES.NAME_MIN, "Tournament name is required")
  .max(TOURNAMENT_RULES.NAME_MAX);

const masterIdField = z.number().int().positive();
const dateField = z.iso.date("Enter a valid date");
const countField = (min, max) => z.number().int().min(min).max(max);
const pointsField = z.number().int().min(0).max(TOURNAMENT_RULES.MAX_POINTS);

const createTournamentSchema = z.object({
  name: nameField,
  organizerId: z.uuid("Choose an organizer"),
  cityPlaceId: z.uuid("Select a city from the suggestions"),
  isStreamingEnabled: z.boolean().default(false),
});

const updateTournamentSchema = z
  .object({
    name: nameField,
    description: z.string().trim().max(TOURNAMENT_RULES.DESCRIPTION_MAX).nullable(),
    logoKey: z.string().trim().min(1).max(255).nullable(),
    bannerKey: z.string().trim().min(1).max(255).nullable(),
    tournamentFormat: z.enum(TOURNAMENT_FORMAT).nullable(),
    gameFormatId: masterIdField.nullable(),
    ageGroupId: masterIdField.nullable(),
    genderCategoryId: masterIdField.nullable(),
    startDate: dateField.nullable(),
    endDate: dateField.nullable(),
    registrationDeadline: dateField.nullable(),
    entryFee: z
      .number()
      .min(0, "Fee can't be negative")
      .max(TOURNAMENT_RULES.MAX_ENTRY_FEE)
      .nullable(),
    minTeams: countField(TOURNAMENT_RULES.MIN_TEAMS, TOURNAMENT_RULES.MAX_TEAMS).nullable(),
    maxTeams: countField(TOURNAMENT_RULES.MIN_TEAMS, TOURNAMENT_RULES.MAX_TEAMS).nullable(),
    minSquadSize: countField(TOURNAMENT_RULES.MIN_SQUAD, TOURNAMENT_RULES.MAX_SQUAD).nullable(),
    maxSquadSize: countField(TOURNAMENT_RULES.MIN_SQUAD, TOURNAMENT_RULES.MAX_SQUAD).nullable(),
    pointsWin: pointsField,
    pointsDraw: pointsField,
    pointsLoss: pointsField,
    halfMinutes: z.number().int().min(5).max(60).nullable(),
    extraTimeHalfMinutes: z.number().int().min(1).max(30).nullable(),
    yellowCardNoticeThreshold: z.number().int().min(1).max(10),
    venuePlaceId: z.uuid("Select a venue from the suggestions").nullable(),
    venueDetails: z.string().trim().max(TOURNAMENT_RULES.VENUE_DETAILS_MAX).nullable(),
    contactPhone: phoneField.nullable(),
    // Admin-only fields (checked in the service)
    organizerId: z.uuid("Choose an organizer"),
    cityPlaceId: z.uuid("Select a city from the suggestions"),
    isStreamingEnabled: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nothing to update");

const changeStatusSchema = z.object({
  status: z.enum(TOURNAMENT_STATUS, "Choose a valid status"),
});

const listTournamentsQuerySchema = paginationQuerySchema
  .extend({
    status: z.coerce.number().pipe(z.enum(TOURNAMENT_STATUS)).optional(),
    tournamentFormat: z.coerce.number().pipe(z.enum(TOURNAMENT_FORMAT)).optional(),
    gameFormatId: z.coerce.number().int().positive().optional(),
    ageGroupId: z.coerce.number().int().positive().optional(),
    genderCategoryId: z.coerce.number().int().positive().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(NEAR_ME.MAX_RADIUS_KM).optional(),
  })
  .refine((query) => (query.latitude == null) === (query.longitude == null), {
    message: "Send both latitude and longitude",
    path: ["latitude"],
  });

const replaceGroundsSchema = z.object({
  grounds: z
    .array(
      z.object({
        id: z.uuid().optional(),
        name: z.string().trim().min(1, "Ground name is required").max(100),
        placeId: z.uuid().nullable().optional(),
      }),
    )
    .max(TOURNAMENT_RULES.MAX_GROUNDS, `At most ${TOURNAMENT_RULES.MAX_GROUNDS} grounds`)
    .refine(
      (grounds) =>
        new Set(grounds.map((ground) => ground.name.toLowerCase())).size === grounds.length,
      "Ground names must be unique",
    ),
});

// Each item is either a master rule reference or a custom rule
const replaceTournamentRulesSchema = z.object({
  rules: z
    .array(
      z.union([
        z.object({ masterRuleId: z.uuid() }),
        z.object({
          title: z.string().trim().min(3, "Rule title is required").max(RULE_LIMITS.TITLE_MAX),
          description: z
            .string()
            .trim()
            .min(3, "Rule description is required")
            .max(RULE_LIMITS.DESCRIPTION_MAX),
        }),
      ]),
    )
    .max(TOURNAMENT_RULES.MAX_RULES, `At most ${TOURNAMENT_RULES.MAX_RULES} rules`),
});

module.exports = {
  tournamentIdParamSchema,
  createTournamentSchema,
  updateTournamentSchema,
  changeStatusSchema,
  listTournamentsQuerySchema,
  replaceGroundsSchema,
  replaceTournamentRulesSchema,
};
