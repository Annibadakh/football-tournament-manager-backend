const ruleRepository = require("../repositories/rule.repository");
const ApiError = require("../utils/ApiError");

const presentRule = (rule) => ({
  id: rule.uuid,
  title: rule.title,
  description: rule.description,
  category: rule.category,
  sortOrder: rule.sortOrder,
  isActive: rule.isActive,
});

const listRules = async ({ includeInactive }) =>
  (await ruleRepository.findRules({ includeInactive })).map(presentRule);

const createRule = async (actor, data) =>
  presentRule(await ruleRepository.createRule({ ...data, createdBy: actor.id }));

const updateRule = async (actor, ruleUuid, changes) => {
  const rule = await ruleRepository.findRuleByUuid(ruleUuid);
  if (!rule) throw ApiError.notFound("Rule not found");
  return presentRule(await ruleRepository.updateRule(rule, { ...changes, updatedBy: actor.id }));
};

module.exports = { presentRule, listRules, createRule, updateRule };
