const express = require("express");
const ruleController = require("../controllers/rule.controller");
const {
  authenticate,
  authorize,
  optionalAuthenticate,
  requireVerified,
} = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/rule.schema");
const { ACCOUNT_ROLE } = require("../constants/user.constants");

const router = express.Router();
const adminOnly = [
  authenticate,
  requireVerified,
  authorize(ACCOUNT_ROLE.SUPERADMIN, ACCOUNT_ROLE.ADMIN),
];

router.get(
  "/",
  optionalAuthenticate,
  validate({ query: schemas.listRulesQuerySchema }),
  ruleController.listRules,
);
router.post(
  "/",
  ...adminOnly,
  validate({ body: schemas.createRuleSchema }),
  ruleController.createRule,
);
router.patch(
  "/:ruleId",
  ...adminOnly,
  validate({ params: schemas.ruleIdParamSchema, body: schemas.updateRuleSchema }),
  ruleController.updateRule,
);

module.exports = router;
