const { z } = require("zod");
const { AWARD_RULES } = require("../constants/award.constants");

const playerIdParamSchema = z.object({ playerId: z.uuid("Invalid player id") });
const awardIdParamSchema = z.object({ awardId: z.uuid("Invalid award id") });

const customAwardSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(AWARD_RULES.TITLE_MIN, `Use at least ${AWARD_RULES.TITLE_MIN} characters`)
      .max(AWARD_RULES.TITLE_MAX),
    playerId: z.uuid().optional(),
    teamId: z.uuid().optional(),
  })
  .refine((data) => Boolean(data.playerId) !== Boolean(data.teamId), {
    message: "Choose a player or a team",
    path: ["playerId"],
  });

const exportParamSchema = z.object({
  tournamentId: z.string().trim().min(3).max(180),
  kind: z.enum(["standings", "fixtures", "summary"]),
});

const exportQuerySchema = z.object({
  download: z
    .enum(["0", "1"])
    .optional()
    .transform((value) => value === "1"),
});

module.exports = {
  playerIdParamSchema,
  awardIdParamSchema,
  customAwardSchema,
  exportParamSchema,
  exportQuerySchema,
};
