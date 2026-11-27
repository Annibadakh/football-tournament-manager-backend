const { z } = require("zod");
const { STREAM_RULES, STREAM_STATUS } = require("../constants/stream.constants");

const streamIdParamSchema = z.object({ streamId: z.uuid("Invalid stream id") });

const urlField = z.string().trim().min(1, "Paste the YouTube link").max(STREAM_RULES.URL_MAX);
const titleField = z
  .string()
  .trim()
  .min(STREAM_RULES.TITLE_MIN, `Use at least ${STREAM_RULES.TITLE_MIN} characters`)
  .max(STREAM_RULES.TITLE_MAX);
const scheduledAtField = z.iso.datetime({ offset: true }).nullable();

// Title is optional: the match name or the YouTube title is used when empty
const createStreamSchema = z.object({
  url: urlField,
  title: titleField.optional(),
  scheduledAt: scheduledAtField.optional(),
  matchId: z.uuid().optional(),
});

const updateStreamSchema = z
  .object({
    url: urlField,
    title: titleField,
    scheduledAt: scheduledAtField,
    matchId: z.uuid().nullable(),
    status: z.enum(STREAM_STATUS, { error: "Invalid status" }),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nothing to update");

module.exports = { streamIdParamSchema, createStreamSchema, updateStreamSchema };
