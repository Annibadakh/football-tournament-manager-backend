const { z } = require("zod");
const { RULE_CATEGORY, RULE_LIMITS } = require("../constants/rule.constants");

const ruleIdParamSchema = z.object({ ruleId: z.uuid("Invalid rule id") });

const ruleBody = {
  title: z.string().trim().min(3, "Title is required").max(RULE_LIMITS.TITLE_MAX),
  description: z.string().trim().min(3, "Description is required").max(RULE_LIMITS.DESCRIPTION_MAX),
  category: z.enum(RULE_CATEGORY, "Choose a category"),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
};

const createRuleSchema = z.object(ruleBody);

const updateRuleSchema = z
  .object(ruleBody)
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nothing to update");

const listRulesQuerySchema = z.object({
  includeInactive: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

module.exports = { ruleIdParamSchema, createRuleSchema, updateRuleSchema, listRulesQuerySchema };
