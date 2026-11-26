const { z } = require("zod");
const { PLACE_RULES, PLACE_SEARCH_TYPE } = require("../constants/place.constants");

// Google session tokens group autocomplete + details calls into one billed session
const sessionTokenField = z.string().trim().max(100).optional();

const placeSearchQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(PLACE_RULES.QUERY_MIN, "Type at least 2 characters")
    .max(PLACE_RULES.QUERY_MAX),
  type: z.enum(Object.values(PLACE_SEARCH_TYPE)).default(PLACE_SEARCH_TYPE.ANY),
  sessionToken: sessionTokenField,
});

const resolvePlaceSchema = z.object({
  googlePlaceId: z.string().trim().min(1).max(255),
  sessionToken: sessionTokenField,
});

module.exports = { placeSearchQuerySchema, resolvePlaceSchema };
