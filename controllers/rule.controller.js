const ruleService = require("../services/rule.service");
const { isAdmin } = require("../services/tournamentAccess.service");
const { sendSuccess } = require("../utils/apiResponse");
const { HTTP_STATUS } = require("../constants/common.constants");

// Inactive rules are only listed for admins managing the rule book
const listRules = async (req, res) => {
  const includeInactive = req.validated.query.includeInactive && isAdmin(req.user);
  return sendSuccess(res, {
    data: await ruleService.listRules({ includeInactive }),
    message: "Rules fetched",
  });
};

const createRule = async (req, res) =>
  sendSuccess(res, {
    data: await ruleService.createRule(req.user, req.validated.body),
    message: "Rule added",
    status: HTTP_STATUS.CREATED,
  });

const updateRule = async (req, res) =>
  sendSuccess(res, {
    data: await ruleService.updateRule(req.user, req.validated.params.ruleId, req.validated.body),
    message: "Rule updated",
  });

module.exports = { listRules, createRule, updateRule };
