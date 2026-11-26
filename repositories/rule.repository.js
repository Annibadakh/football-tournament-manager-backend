const { Rule, TournamentRule } = require("../models");

const RULE_ORDER = [
  ["category", "ASC"],
  ["sortOrder", "ASC"],
];

const findRules = ({ includeInactive = false } = {}) =>
  Rule.findAll({ where: includeInactive ? {} : { isActive: true }, order: RULE_ORDER });

const findRuleByUuid = (uuid) => Rule.findOne({ where: { uuid } });

const findActiveRulesByUuids = (uuids, { transaction } = {}) =>
  Rule.findAll({ where: { uuid: uuids, isActive: true }, transaction });

const createRule = (data) => Rule.create(data);

const updateRule = (rule, changes) => rule.update(changes);

const findTournamentRules = (tournamentId) =>
  TournamentRule.findAll({
    where: { tournamentId },
    include: [
      { model: Rule, as: "rule", attributes: ["uuid", "title", "description", "category"] },
    ],
    order: [["sortOrder", "ASC"]],
  });

const replaceTournamentRules = async (tournamentId, rows, { transaction }) => {
  await TournamentRule.destroy({ where: { tournamentId }, transaction });
  await TournamentRule.bulkCreate(
    rows.map((row, index) => ({ ...row, tournamentId, sortOrder: index + 1 })),
    { transaction },
  );
};

module.exports = {
  findRules,
  findRuleByUuid,
  findActiveRulesByUuids,
  createRule,
  updateRule,
  findTournamentRules,
  replaceTournamentRules,
};
