const express = require("express");
const inviteController = require("../controllers/invite.controller");
const { authLimiter } = require("../middlewares/rateLimit.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/invite.schema");

const router = express.Router();

router.get(
  "/:token",
  validate({ params: schemas.inviteTokenParamSchema }),
  inviteController.getInvite,
);
router.post(
  "/:token/acceptance",
  authLimiter,
  validate({ params: schemas.inviteTokenParamSchema, body: schemas.acceptInviteSchema }),
  inviteController.acceptInvite,
);

module.exports = router;
